#!/usr/bin/env node

// mcp-bridge.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import os from 'os';
import path from 'path';
import fs from 'fs';
import * as EventSourceLib from "eventsource";
global.EventSource = EventSourceLib.default || EventSourceLib;

function getUserDataPath() {
  const home = os.homedir();
  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'nova-browser');
  }
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'nova-browser');
  }
  return path.join(home, '.config', 'nova-browser');
}

function resolveMcpConfig() {
  let port = 3020;
  let token = process.env.MCP_TOKEN;

  if (process.env.MCP_PORT) {
    const parsed = parseInt(process.env.MCP_PORT, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 65536) port = parsed;
  } else {
    try {
      const portFile = path.join(getUserDataPath(), 'nova-mcp-port');
      if (fs.existsSync(portFile)) {
        const saved = parseInt(fs.readFileSync(portFile, 'utf8').trim(), 10);
        if (!isNaN(saved) && saved > 0 && saved < 65536) port = saved;
      }
    } catch (_) {}
  }

  if (!token) {
    try {
      const tokenFile = path.join(getUserDataPath(), 'nova-mcp-token');
      if (fs.existsSync(tokenFile)) {
        const savedToken = fs.readFileSync(tokenFile, 'utf8').trim();
        if (savedToken) token = savedToken;
      }
    } catch (_) {}
  }

  return { port, token };
}

async function main() {
  const config = resolveMcpConfig();
  const defaultUrl = `http://localhost:${config.port}/sse`;
  const sseUrl = new URL(process.env.MCP_SSE_URL || defaultUrl);
  const activeToken = process.env.MCP_TOKEN || config.token;

  // Security: send the token via the Authorization header instead of the URL query string
  const sseTransport = new SSEClientTransport(sseUrl, activeToken ? {
    requestInit: {
      headers: { Authorization: `Bearer ${activeToken}` }
    }
  } : undefined);
  const client = new Client({ name: "mcp-bridge", version: "1.0.0" }, { capabilities: {} });
  try {
    await client.connect(sseTransport);
    console.error("[MCP Bridge] Connected to Nova Browser SSE server");
  } catch (error) {
    console.error("[MCP Bridge] Error connecting to Nova Browser:", error.message);
    console.error("Make sure Nova Browser is running.");
    process.exit(1);
  }
  const server = new Server({
    name: "nova-browser-mcp",
    version: "1.0.0"
  }, {
    capabilities: {
      tools: {}
    }
  });
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    try {
      const response = await client.listTools();
      return response;
    } catch (e) {
      console.error("[MCP Bridge] Error listing tools:", e);
      return { tools: [] };
    }
  });
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const response = await client.callTool(request.params);
      return response;
    } catch (e) {
      console.error(`[MCP Bridge] Error calling tool ${request.params.name}:`, e);
      return { content: [{ type: "text", text: `Bridge Error: ${e.message}` }], isError: true };
    }
  });
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
  console.error("[MCP Bridge] Stdio server running and proxying requests.");
}
main().catch((error) => {
  console.error("[MCP Bridge] Fatal error:", error);
  process.exit(1);
});
