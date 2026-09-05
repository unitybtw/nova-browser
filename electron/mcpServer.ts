import type { Express, Request } from 'express';
import { BrowserWindow, safeStorage, dialog, powerMonitor } from 'electron';
import { randomUUID, createHash, timingSafeEqual } from 'crypto';
import fs from 'fs';
import path from 'path';
import { app as electronApp } from 'electron';
// Security: browser_* tools are forwarded to the renderer over a
// sender-gated IPC round-trip instead of executing JS in the main window.
// Imported from main/mcpBridge (not main.ts) to avoid a circular import.
import { requestRendererMcpAction } from './main/mcpBridge.js';

// Security: Screen-lock tracking prevents MCP execution while user is away
let isScreenLocked = false;
try {
  powerMonitor.on('lock-screen', () => { isScreenLocked = true; });
  powerMonitor.on('unlock-screen', () => { isScreenLocked = false; });
} catch (_) {}

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
    name: 'nova_browser_info',
    description: 'Provides context about Nova Browser and the MCP integration. You can interact with the browser using browser_* tools according to user instructions and safety approvals. Sensitive actions require explicit user confirmation. Call this tool if you need a reminder of what Nova Browser is.',
    inputSchema: { type: 'object', properties: {} }
  },
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
  // Safe — harmless metadata
  nova_browser_info: 'safe',
  browser_list_tabs: 'safe',
  browser_get_url: 'safe',
  browser_scroll: 'safe',
  browser_go_back: 'safe',
  browser_go_forward: 'safe',
  browser_reload: 'safe',
  browser_wait: 'safe',
  browser_scroll_to_element: 'safe',
  // Sensitive read-only & inspection tools — medium (disabled by default, requires approval)
  browser_read_page: 'medium',
  browser_screenshot: 'medium',
  browser_full_page_screenshot: 'medium',
  browser_get_element_text: 'medium',
  // Medium — navigation & window actions
  browser_navigate: 'medium',
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
  // Sensitive — disabled by default, can be enabled in settings
  browser_type: 'sensitive',

  browser_press_key: 'sensitive',
  browser_select_option: 'sensitive',
};

// Default disabled tools (all medium & sensitive levels; users can re-enable them in settings)
const DEFAULT_DISABLED_TOOLS = new Set<string>(
  Object.entries(TOOL_PERMISSIONS)
    .filter(([, permission]) => permission !== 'safe')
    .map(([name]) => name)
);

interface SseClient {
  id: string;
  connectedAt: number;
  userAgent: string;
  res: any;
}

export class BrowserMCPServer {
  private warnedQueryToken = false;
  private server: any;
  private mainWindow: BrowserWindow | null = null;
  private clients: Map<string, SseClient> = new Map();
  private token: string;
  private disabledTools: Set<string> = new Set(DEFAULT_DISABLED_TOOLS);
  private tokenFilePath: string = '';
  private actualPort: number = 0;
  private portFilePath: string = '';
  private firstUseApproved: boolean = process.env.NODE_ENV === 'test' && Boolean(process.env.VITEST || process.env.JEST_WORKER_ID);

  constructor(private requestedPort: number = 3020) {
    // Performance: express/express-rate-limit are NOT required here — they are
    // dynamically imported in start() so the main bundle doesn't pay their
    // parse/require cost on every launch when the MCP server never starts.
    // Set token file path in app userData
    try {
      this.tokenFilePath = path.join(electronApp.getPath('userData'), 'nova-mcp-token');
      this.portFilePath = path.join(electronApp.getPath('userData'), 'nova-mcp-port');
      if (process.env.MCP_TOKEN) {
        this.token = process.env.MCP_TOKEN;
      } else {
        this.token = this.loadOrGenerateToken();
      }
      if (process.env.MCP_PORT) {
        const parsed = parseInt(process.env.MCP_PORT, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed < 65536) {
          this.requestedPort = parsed;
        }
      }
    } catch {
      this.token = process.env.MCP_TOKEN || randomUUID();
    }
    // Restore persisted per-tool enable/disable settings (safe: internal try/catch)
    this.loadToolSettings();
  }

  private loadPersistedPort(): void {
    try {
      if (fs.existsSync(this.portFilePath)) {
        const savedPort = parseInt(fs.readFileSync(this.portFilePath, 'utf-8'), 10);
        if (!isNaN(savedPort) && savedPort > 0 && savedPort < 65536) {
          this.requestedPort = savedPort;
        }
      }
    } catch (e) {
      console.warn('[MCP Server] Error reading persisted port:', e);
    }
  }

  private savePersistedPort(port: number): void {
    try {
      fs.writeFileSync(this.portFilePath, String(port), 'utf-8');
    } catch (e) {
      console.warn('[MCP Server] Error saving persisted port:', e);
    }
  }

  private loadOrGenerateToken(): string {
    try {
      if (this.tokenFilePath && fs.existsSync(this.tokenFilePath)) {
        const raw = fs.readFileSync(this.tokenFilePath);
        if (raw.length > 0) {
          try {
            if (safeStorage.isEncryptionAvailable()) {
              const decrypted = safeStorage.decryptString(raw);
              if (decrypted && decrypted.length >= 16) return decrypted;
            }
          } catch (_) {}
          // Fallback to UTF-8 plaintext if safeStorage is unavailable
          const plaintext = raw.toString('utf-8').trim();
          if (plaintext && plaintext.length >= 16) return plaintext;
        }
      }
    } catch (err) {
      console.warn('[MCP Server] Error loading persisted token:', err);
    }
    return this.saveNewToken();
  }

  private saveNewToken(): string {
    const newToken = randomUUID();
    this.token = newToken;
    try {
      if (this.tokenFilePath) {
        const dir = path.dirname(this.tokenFilePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (safeStorage.isEncryptionAvailable()) {
          const encrypted = safeStorage.encryptString(newToken);
          fs.writeFileSync(this.tokenFilePath, encrypted, { mode: 0o600 });
        } else {
          fs.writeFileSync(this.tokenFilePath, newToken, { encoding: 'utf-8', mode: 0o600 });
        }
      }
    } catch (err) {
      console.warn('[MCP Server] Error saving persisted token:', err);
    }
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

  // Security: constant-time token comparison. Both sides are hashed with SHA-256
  // first so the buffers always have equal length (a timingSafeEqual requirement) and
  // comparison cost is independent of where the first differing byte occurs.
  private tokenMatches(provided: string): boolean {
    try {
      const expected = createHash('sha256').update(this.token).digest();
      const actual = createHash('sha256').update(provided).digest();
      return timingSafeEqual(expected, actual);
    } catch {
      return false;
    }
  }

  private isAuthenticated(req: Request): boolean {
    // Security: Only accept Authorization header: Bearer <token>
    // Tokens in URL query strings (?token=...) are strictly rejected as they leak into logs, proxies, and referrers.
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ') && this.tokenMatches(authHeader.slice(7))) {
      return true;
    }
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

  private sendToClient(clientId: string, event: string, data: any) {
    const client = this.clients.get(clientId);
    if (client) {
      try { client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch (_) {}
    }
  }

  private async ensureFirstUseApproved(): Promise<boolean> {
    if (this.firstUseApproved) return true;
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return false;

    try {
      const result = await dialog.showMessageBox(this.mainWindow, {
        type: 'question',
        buttons: ['Allow', 'Deny'],
        defaultId: 0,
        cancelId: 1,
        title: 'Nova Browser - MCP Authorization',
        message: 'An external client is attempting to connect to Nova Browser via Model Context Protocol (MCP).',
        detail: 'Do you want to allow this external client to interact with Nova Browser? Tool permissions can be managed in Settings.',
        noLink: true
      });
      if (result.response === 0) {
        this.firstUseApproved = true;
        return true;
      }
    } catch (err) {
      console.warn('[MCP Server] Error prompting for first-use approval:', err);
    }
    return false;
  }

  private async executeTool(toolName: string, args: Record<string, any>): Promise<string> {
    if (isScreenLocked) {
      throw new Error('MCP tool execution blocked: Nova Browser is currently locked.');
    }

    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      throw new Error('Nova Browser window is not available');
    }

    const approved = await this.ensureFirstUseApproved();
    if (!approved) {
      throw new Error('Permission denied: MCP connection rejected by the user.');
    }

    if (!this.isToolAllowed(toolName)) {
      throw new Error(`Permission denied: Tool '${toolName}' is disabled in MCP security settings.`);
    }

    // Special: nova_browser_info
    if (toolName === 'nova_browser_info') {
      return 'You are connected to Nova Browser. Use the browser_* tools to navigate and interact with web pages according to user instructions and safety approvals.';
    }

    // Special: browser_wait is handled directly
    if (toolName === 'browser_wait') {
      const ms = Math.min(Number(args.ms) || 1000, 10000);
      await new Promise(r => setTimeout(r, ms));
      return `Waited ${ms}ms`;
    }

    // Forward the tool call to the renderer via IPC and wait for its response.
    const result = await requestRendererMcpAction(this.mainWindow, toolName, args);

    return typeof result === 'string' ? result : JSON.stringify(result);
  }

  private setupRoutes(app: Express) {
    // Security: Prevent DNS rebinding attacks by strictly validating the Host header
    app.use((req, res, next) => {
      const host = (req.headers.host || '').toLowerCase();
      const port = this.actualPort || this.requestedPort;
      const allowedHosts = [
        `localhost:${port}`,
        `127.0.0.1:${port}`,
        `[::1]:${port}`,
        'localhost',
        '127.0.0.1',
        '[::1]'
      ];
      if (!allowedHosts.includes(host)) {
        return res.status(403).json({ error: 'Forbidden: Invalid Host header' });
      }
      next();
    });

    // CORS for all routes - restricted to local origins (http://localhost:*, http://127.0.0.1:*, http://[::1]:*)
    app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (origin) {
        try {
          const url = new URL(origin);
          if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]' || url.protocol === 'nova:') {
            res.header('Access-Control-Allow-Origin', origin);
          }
        } catch (_) {
          if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
          }
        }
      }
      res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      next();
    });

    app.use((req, res, next) => {
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Health check endpoint — only return minimal info without auth
    app.get('/health', (req, res) => {
      const appVersion = electronApp?.getVersion?.() || '1.4.1';
      if (this.isAuthenticated(req)) {
        // Authenticated: return detailed info
        res.json({
          status: 'ok',
          server: 'nova-browser-mcp',
          version: appVersion,
          port: this.actualPort || this.requestedPort,
          connected_clients: this.clients.size,
          clients: this.getConnectedClientsInfo(),
          tools_count: TOOLS.length,
          timestamp: Date.now()
        });
      } else {
        // Unauthenticated: minimal response only
        res.json({
          status: 'ok',
          version: appVersion
        });
      }
    });

    // MCP over SSE — client connects here
    app.get('/sse', (req, res) => {
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
      // Using relative URL because some MCP clients fail to parse absolute URLs to extract the session ID
      res.write(`event: endpoint\ndata: /message?sessionId=${clientId}\n\n`);

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
    app.post('/message', async (req, res) => {
      if (!this.isAuthenticated(req)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
      }

      const body = req.body;
      const sessionId = req.query.sessionId as string;

      // Security: only route responses to KNOWN sessions. A missing or unknown
      // sessionId must never fall back to broadcasting tool results to ALL clients.
      if (!sessionId || !this.clients.has(sessionId)) {
        return res.status(sessionId ? 404 : 400).json({
          jsonrpc: '2.0',
          id: body?.id ?? null,
          error: {
            code: sessionId ? -32000 : -32600,
            message: sessionId ? 'Unknown sessionId' : 'Missing sessionId'
          }
        });
      }

      const respondToClient = (payload: any) => {
        this.sendToClient(sessionId, 'message', payload);
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
            result: { tools: TOOLS.filter((tool) => this.isToolAllowed(tool.name)) }
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
    app.post('/call', async (req, res) => {
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
    app.get('/tools', (req, res) => {
      if (!this.isAuthenticated(req)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
      }
      res.json({ tools: TOOLS.filter((tool) => this.isToolAllowed(tool.name)) });
    });
  }

  public async start(): Promise<void> {
    // Performance: load express + express-rate-limit lazily — they are only parsed/
    // required when the MCP server actually starts, not on every app launch.
    const [{ default: express }, { default: rateLimit }] = await Promise.all([
      import('express'),
      import('express-rate-limit')
    ]);

    const app = express();
    // VULN-28: Add rate limiting
    app.use(rateLimit({ windowMs: 60 * 1000, max: 120, message: 'Too many requests' }));
    app.use(express.json({ limit: '10mb' }));
    this.setupRoutes(app);

    return new Promise((resolve, reject) => {
      try {
        // Use requestedPort (0 = random ephemeral port assigned by OS)
        this.server = app.listen(this.requestedPort, '127.0.0.1', () => {
          // Capture the actual port assigned by the OS
          const address = this.server.address();
          if (address && typeof address === 'object') {
            this.actualPort = address.port;
            // Persist the actual port for client reconnection
            this.savePersistedPort(this.actualPort);
          }
          console.log(`[MCP Server] Running at http://localhost:${this.actualPort}`);
          console.log(`[MCP Server] SSE endpoint: http://localhost:${this.actualPort}/sse`);
          console.log(`[MCP Server] Health: http://localhost:${this.actualPort}/health`);
          console.log(`[MCP Server] Token: ${this.token.substring(0, 4)}***`);
          resolve();
        });

        this.server.on('error', (err: any) => {
          if (err.code === 'EADDRINUSE' && this.requestedPort !== 0) {
            console.warn(`[MCP Server] Port ${this.requestedPort} is in use, falling back to random available port...`);
            try {
              this.server = app.listen(0, '127.0.0.1', () => {
                const address = this.server.address();
                if (address && typeof address === 'object') {
                  this.actualPort = address.port;
                  this.savePersistedPort(this.actualPort);
                }
                console.log(`[MCP Server] Running on fallback port http://localhost:${this.actualPort}`);
                console.log(`[MCP Server] SSE endpoint: http://localhost:${this.actualPort}/sse`);
                console.log(`[MCP Server] Health: http://localhost:${this.actualPort}/health`);
                console.log(`[MCP Server] Token: ${this.token.substring(0, 4)}***`);
                resolve();
              });
              return;
            } catch (fallbackErr) {
              console.error('[MCP Server] Fallback bind failed:', fallbackErr);
            }
          }
          console.error('[MCP Server] Failed to start:', err);
          // Clear the handle so isRunning() returns false and the server can be restarted
          this.server = null;
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

  public getPort(): number {
    return this.actualPort || this.requestedPort;
  }

  public getRequestedPort(): number {
    return this.requestedPort;
  }
}
