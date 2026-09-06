import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

console.log('\n--- Temporal Dead Zone (TDZ) & Initialization Safety Test Suite ---');

interface TDZViolation {
  file: string;
  variable: string;
  useLine: number;
  declLine: number;
}

const violations: TDZViolation[] = [];

function isValueIdentifier(node: ts.Node): boolean {
  const p = node.parent;
  if (!p) return true;
  if (ts.isPropertyAccessExpression(p) && p.name === node) return false;
  if (ts.isPropertyAssignment(p) && p.name === node) return false;
  if (ts.isMethodDeclaration(p) && p.name === node) return false;
  if (ts.isImportSpecifier(p)) return false;
  if (ts.isTypeReferenceNode(p)) return false;
  return true;
}

function checkFile(filePath: string) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, fileContent, ts.ScriptTarget.Latest, true);

  function checkFunction(fnNode: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction) {
    if (!fnNode.body || !ts.isBlock(fnNode.body)) return;
    const scopeDecls = new Map<string, number>();
    fnNode.body.statements.forEach(stmt => {
      if (ts.isVariableStatement(stmt)) {
        stmt.declarationList.declarations.forEach(decl => {
          if (ts.isIdentifier(decl.name)) {
            scopeDecls.set(decl.name.text, decl.getStart(sourceFile));
          }
        });
      }
    });

    fnNode.body.statements.forEach(stmt => {
      function checkNode(node: ts.Node) {
        if (ts.isCallExpression(node)) {
          const callText = node.expression.getText(sourceFile);
          if (
            callText === 'useState' &&
            node.arguments.length > 0 &&
            (ts.isArrowFunction(node.arguments[0]) || ts.isFunctionExpression(node.arguments[0]))
          ) {
            const initFn = node.arguments[0];
            function checkUsed(n: ts.Node) {
              if (ts.isIdentifier(n) && isValueIdentifier(n)) {
                if (scopeDecls.has(n.text)) {
                  const declPos = scopeDecls.get(n.text)!;
                  if (n.getStart(sourceFile) < declPos) {
                    const lc = sourceFile.getLineAndCharacterOfPosition(n.getStart(sourceFile));
                    const dlc = sourceFile.getLineAndCharacterOfPosition(declPos);
                    violations.push({
                      file: path.relative(process.cwd(), filePath),
                      variable: n.text,
                      useLine: lc.line + 1,
                      declLine: dlc.line + 1
                    });
                  }
                }
              }
              ts.forEachChild(n, checkUsed);
            }
            checkUsed(initFn);
          }
        }
        ts.forEachChild(node, checkNode);
      }
      checkNode(stmt);
    });
  }

  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
      checkFunction(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

function walkDir(dir: string) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      walkDir(full);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      checkFile(full);
    }
  }
}

const srcDir = path.resolve(__dirname, '../src');
walkDir(srcDir);

if (violations.length > 0) {
  console.error('[FAIL] Detected Temporal Dead Zone (TDZ) violations:');
  violations.forEach(v => {
    console.error(`  - ${v.file}:${v.useLine} - variable "${v.variable}" used before declaration at line ${v.declLine}`);
  });
} else {
  console.log('[PASS] Zero Temporal Dead Zone (TDZ) violations detected across all src files.');
}

assert.strictEqual(violations.length, 0, 'No TDZ violations must exist in any src files.');
