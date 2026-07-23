import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { BrowserWindow } from 'electron';

export class BrowserMCPServer {
  private app: express.Express;
  private server: any;
  private mcpServer: Server;
  private transport: SSEServerTransport | null = null;
  private mainWindow: BrowserWindow | null = null;

  constructor(private port: number = 3020) {
    this.app = express();
    this.mcpServer = new Server({
      name: 'open-source-browser-mcp',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });

    this.setupTools();
    this.setupRoutes();
  }

  public setMainWindow(window: BrowserWindow | null) {
    this.mainWindow = window;
  }

  private setupTools() {
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'navigate',
            description: 'Navigates the browser to a specific URL',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'The URL to navigate to (must include http/https)' }
              },
              required: ['url']
            }
          },
          {
            name: 'read_page_content',
            description: 'Extracts the visible text and interactive elements (links, buttons, inputs) from the current page',
            inputSchema: { type: 'object', properties: {} }
          },
          {
            name: 'click_element',
            description: 'Clicks an element on the page using a CSS selector',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string', description: 'CSS selector of the element to click' }
              },
              required: ['selector']
            }
          },
          {
            name: 'run_script',
            description: 'Executes arbitrary JavaScript in the context of the active page',
            inputSchema: {
              type: 'object',
              properties: {
                script: { type: 'string', description: 'JavaScript code to execute' }
              },
              required: ['script']
            }
          }
        ]
      };
    });

    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.mainWindow) {
        throw new Error('Main window is not available');
      }

      const toolName = request.params.name;
      const args = request.params.arguments || {};

      try {
        if (toolName === 'navigate') {
          await this.mainWindow.webContents.executeJavaScript(`
            window.location.href = "${args.url}";
          `);
          // Wait for load
          await new Promise(r => setTimeout(r, 2000));
          return { content: [{ type: 'text', text: `Navigated to ${args.url}` }] };
        } 
        
        else if (toolName === 'read_page_content') {
          const result = await this.mainWindow.webContents.executeJavaScript(`
            (() => {
              const text = document.body.innerText.substring(0, 5000);
              const inputs = Array.from(document.querySelectorAll('input, textarea')).map(el => ({
                tag: el.tagName, type: el.type, name: el.name, placeholder: el.placeholder, id: el.id
              }));
              const linksAndButtons = Array.from(document.querySelectorAll('a, button, [role="button"]')).slice(0, 50).map(el => ({
                text: el.innerText.trim().substring(0, 50), id: el.id, href: el.href
              })).filter(e => e.text);
              return JSON.stringify({ url: window.location.href, text, inputs, linksAndButtons });
            })();
          `);
          return { content: [{ type: 'text', text: result }] };
        }

        else if (toolName === 'click_element') {
          const result = await this.mainWindow.webContents.executeJavaScript(`
            (() => {
              const el = document.querySelector(\`${args.selector}\`);
              if (el) {
                el.click();
                return 'Clicked element: ' + \`${args.selector}\`;
              }
              return 'Element not found: ' + \`${args.selector}\`;
            })();
          `);
          return { content: [{ type: 'text', text: result }] };
        }

        else if (toolName === 'run_script') {
          const result = await this.mainWindow.webContents.executeJavaScript(`
            (async () => {
              ${args.script}
            })();
          `);
          return { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }] };
        }

        throw new Error(`Unknown tool: ${toolName}`);
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Error executing ${toolName}: ${err.message}` }], isError: true };
      }
    });
  }

  private setupRoutes() {
    this.app.get('/mcp', async (req, res) => {
      this.transport = new SSEServerTransport('/message', res);
      await this.mcpServer.connect(this.transport);
    });

    this.app.post('/message', async (req, res) => {
      if (this.transport) {
        await this.transport.handlePostMessage(req, res);
      } else {
        res.status(400).send('No active SSE connection');
      }
    });
  }

  public start() {
    return new Promise<void>((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`[MCP Server] Listening on http://localhost:${this.port}/mcp`);
        resolve();
      });
    });
  }

  public stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}
