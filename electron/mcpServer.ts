import express from 'express';
import { BrowserWindow, safeStorage } from 'electron';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { app as electronApp } from 'electron';

interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

const TOOLS: McpTool[] = [
  {
    name: 'browser_navigate',
    description: 'Navigates the current browser tab to a specific URL.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The absolute URL to navigate to (e.g., https://github.com)' }
      },
      required: ['url']
    }
  },
  {
    name: 'browser_read_page',
    description: 'Extracts the full visible text and all interactive elements (links, buttons, inputs) from the active page. Also returns the current URL and title.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'browser_screenshot',
    description: 'Takes a screenshot of the current active page and returns it as a base64-encoded data URL (image/png).',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'browser_click',
    description: 'Clicks an element on the active page using a CSS selector.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector of the element to click (e.g., #submit-btn, .nav-link, a[href*="github"])' }
      },
      required: ['selector']
    }
  },
  {
    name: 'browser_type',
    description: 'Types text into an input or textarea element on the active page.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector of the input element' },
        text: { type: 'string', description: 'Text to type into the element' },
        pressEnter: { type: 'boolean', description: 'Whether to press Enter after typing (default: false)' }
      },
      required: ['selector', 'text']
    }
  },
  {
    name: 'browser_run_js',
    description: 'Executes arbitrary JavaScript in the context of the active page and returns the result.',
    inputSchema: {
      type: 'object',
      properties: {
        script: { type: 'string', description: 'JavaScript code to execute' }
      },
      required: ['script']
    }
  },
  {
    name: 'browser_scroll',
    description: 'Scrolls the active page in a given direction.',
    inputSchema: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['up', 'down', 'top', 'bottom'], description: 'Direction to scroll' },
        amount: { type: 'number', description: 'Pixels to scroll (default: 500)' }
      },
      required: ['direction']
    }
  },
  {
    name: 'browser_new_tab',
    description: 'Opens a new browser tab, optionally at a specific URL.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to open in the new tab (optional, defaults to new tab page)' }
      }
    }
  },
  {
    name: 'browser_close_tab',
    description: 'Closes the tab with the specified ID.',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: { type: 'string', description: 'The ID of the tab to close (use browser_list_tabs to get IDs)' }
      },
      required: ['tabId']
    }
  },
  {
    name: 'browser_list_tabs',
    description: 'Lists all currently open tabs with their IDs, titles, URLs, and which one is active.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'browser_switch_tab',
    description: 'Switches the active tab to the one with the specified ID.',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: { type: 'string', description: 'The ID of the tab to switch to' }
      },
      required: ['tabId']
    }
  },
  {
    name: 'browser_go_back',
    description: 'Navigates the active tab back in its history (equivalent to pressing the Back button).',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'browser_go_forward',
    description: 'Navigates the active tab forward in its history (equivalent to pressing the Forward button).',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'browser_reload',
    description: 'Reloads the current active page.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'browser_get_url',
    description: 'Returns the current URL of the active tab.',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'browser_hover',
    description: 'Simulates hovering the mouse cursor over an element identified by a CSS selector.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector of the element to hover over' }
      },
      required: ['selector']
    }
  },
  {
    name: 'browser_focus',
    description: 'Focuses a specific element on the active page.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector of the element to focus' }
      },
      required: ['selector']
    }
  },
  {
    name: 'browser_select_option',
    description: 'Selects an option in a <select> dropdown element.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector of the <select> element' },
        value: { type: 'string', description: 'The value attribute of the option to select' }
      },
      required: ['selector', 'value']
    }
  },
  {
    name: 'browser_press_key',
    description: 'Simulates pressing a keyboard key on the active page (e.g., Enter, Tab, Escape, ArrowDown).',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Key name (e.g., Enter, Tab, Escape, Space, ArrowDown, ArrowUp)' },
        selector: { type: 'string', description: 'Optional CSS selector to focus before pressing key' }
      },
      required: ['key']
    }
  },
  {
    name: 'browser_wait',
    description: 'Pauses execution for a specified number of milliseconds.',
    inputSchema: {
      type: 'object',
      properties: {
        ms: { type: 'number', description: 'Milliseconds to wait (max 10000)' }
      },
      required: ['ms']
    }
  },
  {
    name: 'browser_get_element_text',
    description: 'Returns the inner text content of an element matched by a CSS selector.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector of the element' }
      },
      required: ['selector']
    }
  },
  {
    name: 'browser_scroll_to_element',
    description: 'Scrolls the page until a specific element is visible in the viewport.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector of the element to scroll to' }
      },
      required: ['selector']
    }
  },
  {
    name: 'browser_zoom',
    description: 'Sets the zoom level of the current page.',
    inputSchema: {
      type: 'object',
      properties: {
        level: { type: 'number', description: 'Zoom level: 0 = 100% (normal), 1 = ~120%, -1 = ~80%, 2 = ~150%' }
      },
      required: ['level']
    }
  },
  {
    name: 'browser_mute_tab',
    description: 'Mutes or unmutes the active tab.',
    inputSchema: {
      type: 'object',
      properties: {
        mute: { type: 'boolean', description: 'true to mute, false to unmute' }
      },
      required: ['mute']
    }
  },
  {
    name: 'browser_pin_tab',
    description: 'Pins or unpins the active tab.',
    inputSchema: {
      type: 'object',
      properties: {
        pin: { type: 'boolean', description: 'true to pin, false to unpin' }
      },
      required: ['pin']
    }
  },
  {
    name: 'browser_duplicate_tab',
    description: 'Duplicates the active tab, opening a copy of it in a new tab.',
    inputSchema: { type: 'object', properties: {} }
  }
];

// Tool permission levels
export type ToolPermissionLevel = 'safe' | 'medium' | 'sensitive';

export const TOOL_PERMISSIONS: Record<string, ToolPermissionLevel> = {
  // 🟢 Safe — always allowed
  browser_navigate: 'safe',
  browser_read_page: 'safe',
  browser_screenshot: 'safe',
  browser_list_tabs: 'safe',
  browser_get_url: 'safe',
  browser_scroll: 'safe',
  browser_go_back: 'safe',
  browser_go_forward: 'safe',
  browser_reload: 'safe',
  browser_wait: 'safe',
  browser_get_element_text: 'safe',
  browser_scroll_to_element: 'safe',
  // 🟡 Medium — allowed by default, can be disabled
  browser_click: 'medium',
  browser_hover: 'medium',
  browser_focus: 'medium',
  browser_switch_tab: 'medium',
  browser_close_tab: 'medium',
  browser_new_tab: 'medium',
  browser_mute_tab: 'medium',
  browser_pin_tab: 'medium',
  browser_duplicate_tab: 'medium',
  browser_zoom: 'medium',
  // 🔴 Sensitive — disabled by default, user must enable
  browser_type: 'sensitive',
  browser_run_js: 'sensitive',
  browser_press_key: 'sensitive',
  browser_select_option: 'sensitive',
  browser_full_page_screenshot: 'safe',
};

// Default disabled tools (sensitive level)
const DEFAULT_DISABLED_TOOLS = new Set(['browser_run_js']);

interface SseClient {
  id: string;
  connectedAt: number;
  userAgent: string;
  res: any;
}

export class BrowserMCPServer {
  private app: express.Express;
  private server: any;
  private mainWindow: BrowserWindow | null = null;
  private clients: Map<string, SseClient> = new Map();
  private requestCounter = 0;
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
  private token: string = '';
  private disabledTools: Set<string> = new Set(DEFAULT_DISABLED_TOOLS);
  private tokenFilePath: string = '';

  constructor(private port: number = 3020) {
    this.app = express();
    this.app.use(express.json({ limit: '10mb' }));
    // Set token file path in app userData
    try {
      this.tokenFilePath = path.join(electronApp.getPath('userData'), 'nova-mcp-token');
      this.token = this.loadOrGenerateToken();
    } catch {
      this.token = randomUUID();
    }
    this.setupRoutes();
  }

  private loadOrGenerateToken(): string {
    try {
      if (fs.existsSync(this.tokenFilePath)) {
        const raw = fs.readFileSync(this.tokenFilePath);
        if (safeStorage.isEncryptionAvailable()) {
          return safeStorage.decryptString(raw);
        }
        return raw.toString('utf-8');
      }
    } catch {}
    return this.saveNewToken();
  }

  private saveNewToken(): string {
    const newToken = randomUUID();
    try {
      const data = safeStorage.isEncryptionAvailable()
        ? safeStorage.encryptString(newToken)
        : Buffer.from(newToken, 'utf-8');
      fs.writeFileSync(this.tokenFilePath, data);
    } catch {}
    return newToken;
  }

  public getToken(): string { return this.token; }

  public rotateToken(): string {
    this.token = this.saveNewToken();
    return this.token;
  }

  public getDisabledTools(): string[] { return Array.from(this.disabledTools); }

  public setToolEnabled(toolName: string, enabled: boolean) {
    if (enabled) this.disabledTools.delete(toolName);
    else this.disabledTools.add(toolName);
    // Persist to userData
    try {
      const settingsPath = path.join(electronApp.getPath('userData'), 'mcp-tool-settings.json');
      const current: Record<string, boolean> = fs.existsSync(settingsPath)
        ? JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
        : {};
      current[toolName] = enabled;
      fs.writeFileSync(settingsPath, JSON.stringify(current));
    } catch {}
  }

  public loadToolSettings() {
    try {
      const settingsPath = path.join(electronApp.getPath('userData'), 'mcp-tool-settings.json');
      if (!fs.existsSync(settingsPath)) return;
      const settings: Record<string, boolean> = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      for (const [tool, enabled] of Object.entries(settings)) {
        this.setToolEnabled(tool, enabled);
      }
    } catch {}
  }

  private isAuthenticated(req: express.Request): boolean {
    // Check Authorization header: Bearer <token>
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ') && authHeader.slice(7) === this.token) return true;
    // Check query param: ?token=<token>
    if (req.query.token === this.token) return true;
    return false;
  }

  private isToolAllowed(toolName: string): boolean {
    return !this.disabledTools.has(toolName);
  }

  public setMainWindow(window: BrowserWindow | null) {
    this.mainWindow = window;
  }

  public getConnectedClientsInfo() {
    return Array.from(this.clients.values()).map(c => ({
      id: c.id,
      connectedAt: c.connectedAt,
      userAgent: c.userAgent
    }));
  }

  public getClientCount() {
    return this.clients.size;
  }

  private broadcastToClients(event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients.values()) {
      try { client.res.write(payload); } catch (_) {}
    }
  }

  private sendToClient(clientId: string, event: string, data: any) {
    const client = this.clients.get(clientId);
    if (client) {
      try { client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch (_) {}
    }
  }

  private async executeTool(toolName: string, args: Record<string, any>): Promise<string> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      throw new Error('Nova Browser window is not available');
    }

    if (!this.isToolAllowed(toolName)) {
      throw new Error(`Permission denied: Tool '${toolName}' is disabled in MCP security settings.`);
    }

    // Special: browser_wait is handled directly
    if (toolName === 'browser_wait') {
      const ms = Math.min(Number(args.ms) || 1000, 10000);
      await new Promise(r => setTimeout(r, ms));
      return `Waited ${ms}ms`;
    }

    const result = await this.mainWindow.webContents.executeJavaScript(`
      (async () => {
        if (typeof window.executeMcpAction === 'function') {
          return await window.executeMcpAction(${JSON.stringify(toolName)}, ${JSON.stringify(args)});
        }
        return "Error: executeMcpAction not available";
      })()
    `);

    return typeof result === 'string' ? result : JSON.stringify(result);
  }

  private setupRoutes() {
    // CORS for all routes
    this.app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      next();
    });

    this.app.use((req, res, next) => {
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'ok',
        server: 'nova-browser-mcp',
        version: '2.0.0',
        port: this.port,
        connected_clients: this.clients.size,
        clients: this.getConnectedClientsInfo(),
        tools_count: TOOLS.length,
        timestamp: Date.now()
      });
    });

    // MCP over SSE — client connects here
    this.app.get('/sse', (req, res) => {
      if (!this.isAuthenticated(req)) {
        return res.status(401).send('Unauthorized: Invalid or missing token');
      }

      const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      const client: SseClient = {
        id: clientId,
        connectedAt: Date.now(),
        userAgent: req.headers['user-agent'] || 'Unknown',
        res
      };
      this.clients.set(clientId, client);

      console.log(`[MCP] Client connected: ${clientId} (${client.userAgent})`);

      // Notify renderer of new connection
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('mcp-client-changed', {
          count: this.clients.size,
          clients: this.getConnectedClientsInfo()
        });
      }

      // Send initial "endpoint" event so client knows where to POST
      // Official MCP SDKs require the URI to include the session identifier
      res.write(`event: endpoint\ndata: ${JSON.stringify({ uri: `http://localhost:${this.port}/message?sessionId=${clientId}` })}\n\n`);

      // Keep-alive ping every 15s
      const keepAlive = setInterval(() => {
        try { res.write(': ping\n\n'); } catch (_) { clearInterval(keepAlive); }
      }, 15000);

      req.on('close', () => {
        clearInterval(keepAlive);
        this.clients.delete(clientId);
        console.log(`[MCP] Client disconnected: ${clientId}`);
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('mcp-client-changed', {
            count: this.clients.size,
            clients: this.getConnectedClientsInfo()
          });
        }
      });
    });

    // MCP message endpoint — client POSTs JSON-RPC here
    this.app.post('/message', async (req, res) => {
      if (!this.isAuthenticated(req)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
      }

      const body = req.body;
      const sessionId = req.query.sessionId as string;
      
      const respondToClient = (payload: any) => {
        if (sessionId) {
          this.sendToClient(sessionId, 'message', payload);
        } else {
          this.broadcastToClients('message', payload);
        }
      };
      
      try {
        // Handle MCP protocol messages
        if (body.method === 'initialize') {
          const responsePayload = {
            jsonrpc: '2.0',
            id: body.id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: { tools: {} },
              serverInfo: { name: 'nova-browser', version: '2.0.0' }
            }
          };
          respondToClient(responsePayload);
          return res.status(202).json({ status: 'accepted' });
        }

        if (body.method === 'tools/list') {
          const responsePayload = {
            jsonrpc: '2.0',
            id: body.id,
            result: { tools: TOOLS }
          };
          respondToClient(responsePayload);
          return res.status(202).json({ status: 'accepted' });
        }

        if (body.method === 'tools/call') {
          const toolName = body.params?.name;
          const args = body.params?.arguments || {};

          try {
            const result = await this.executeTool(toolName, args);
            const responsePayload = {
              jsonrpc: '2.0',
              id: body.id,
              result: {
                content: [{ type: 'text', text: result }]
              }
            };
            respondToClient(responsePayload);
          } catch (err: any) {
            const errorPayload = {
              jsonrpc: '2.0',
              id: body.id,
              result: {
                content: [{ type: 'text', text: `Error: ${err.message}` }],
                isError: true
              }
            };
            respondToClient(errorPayload);
          }
          return res.status(202).json({ status: 'accepted' });
        }

        // Fallback for unknown methods
        respondToClient({
          jsonrpc: '2.0',
          id: body.id,
          error: { code: -32601, message: `Method not found: ${body.method}` }
        });
        res.status(202).json({ status: 'accepted' });

      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    // Direct tool call endpoint (for testing without full MCP protocol)
    this.app.post('/call', async (req, res) => {
      if (!this.isAuthenticated(req)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
      }

      const { tool, args = {} } = req.body;
      if (!tool) return res.status(400).json({ error: 'Missing tool name' });

      try {
        const result = await this.executeTool(tool, args);
        res.json({ success: true, result });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // List available tools
    this.app.get('/tools', (req, res) => {
      if (!this.isAuthenticated(req)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
      }
      res.json({ tools: TOOLS });
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, '127.0.0.1', () => {
          console.log(`[MCP Server] ✓ Running at http://localhost:${this.port}`);
          console.log(`[MCP Server] SSE endpoint: http://localhost:${this.port}/sse`);
          console.log(`[MCP Server] Health: http://localhost:${this.port}/health`);
          resolve();
        });

        this.server.on('error', (err: any) => {
          console.error('[MCP Server] Failed to start:', err);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public stop() {
    if (this.server) {
      // Close all SSE connections gracefully
      for (const client of this.clients.values()) {
        try { client.res.end(); } catch (_) {}
      }
      this.clients.clear();
      this.server.close();
      this.server = null;
      console.log('[MCP Server] Stopped');
    }
  }

  public isRunning() {
    return !!this.server;
  }
}
