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
            name: 'type_text',
            description: 'Types text into an input or textarea element',
            inputSchema: {
              type: 'object',
              properties: {
                selector: { type: 'string', description: 'CSS selector of the input element' },
                text: { type: 'string', description: 'Text to type into the element' }
              },
              required: ['selector', 'text']
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
        const result = await this.mainWindow.webContents.executeJavaScript(`
          (async () => {
            if (typeof window.executeMcpAction === 'function') {
              return await window.executeMcpAction("${toolName}", ${JSON.stringify(args)});
            }
            return "Error: executeMcpAction is not defined in the renderer";
          })();
        `);
        
        return { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }] };
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
