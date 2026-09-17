import React, { useState, useEffect, useCallback } from 'react';
import { 
  Cpu, 
  Square, 
  Play, 
  Users, 
  Key, 
  Lock, 
  Unlock, 
  Check, 
  Copy, 
  RefreshCw, 
  ShieldAlert 
} from 'lucide-react';
import { UserSettings } from '../../types/browser';
import { copyTextToClipboard, isMaskedToken } from './settingsUtils';

interface McpSettingsProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
}

const MCP_TOOLS = [
  { name: 'browser_navigate', desc: 'Navigate to a URL', level: 'safe' },
  { name: 'browser_read_page', desc: 'Extract full page text + links', level: 'safe' },
  { name: 'browser_screenshot', desc: 'Take a screenshot', level: 'safe' },
  { name: 'browser_list_tabs', desc: 'List all open tabs', level: 'safe' },
  { name: 'browser_get_url', desc: 'Get the current tab URL', level: 'safe' },
  { name: 'browser_scroll', desc: 'Scroll the page up/down/top/bottom', level: 'safe' },
  { name: 'browser_go_back', desc: 'Navigate back in history', level: 'safe' },
  { name: 'browser_go_forward', desc: 'Navigate forward in history', level: 'safe' },
  { name: 'browser_reload', desc: 'Reload the current page', level: 'safe' },
  { name: 'browser_wait', desc: 'Wait for N milliseconds', level: 'safe' },
  { name: 'browser_get_element_text', desc: 'Get an element\'s text content', level: 'safe' },
  { name: 'browser_scroll_to_element', desc: 'Scroll until element is visible', level: 'safe' },

  { name: 'browser_click', desc: 'Click an element by CSS selector', level: 'medium' },
  { name: 'browser_hover', desc: 'Hover over an element', level: 'medium' },
  { name: 'browser_focus', desc: 'Focus an element', level: 'medium' },
  { name: 'browser_switch_tab', desc: 'Switch to a tab by ID', level: 'medium' },
  { name: 'browser_close_tab', desc: 'Close a tab by ID', level: 'medium' },
  { name: 'browser_new_tab', desc: 'Open a new tab', level: 'medium' },
  { name: 'browser_mute_tab', desc: 'Mute or unmute the active tab', level: 'medium' },
  { name: 'browser_pin_tab', desc: 'Pin or unpin the active tab', level: 'medium' },
  { name: 'browser_duplicate_tab', desc: 'Duplicate the active tab', level: 'medium' },
  { name: 'browser_zoom', desc: 'Set page zoom level', level: 'medium' },

  { name: 'browser_type', desc: 'Type text into an input', level: 'sensitive' },
  { name: 'browser_press_key', desc: 'Simulate a keyboard key press', level: 'sensitive' },
  { name: 'browser_select_option', desc: 'Select a dropdown option', level: 'sensitive' },
];

export const McpSettings: React.FC<McpSettingsProps> = ({
  settings: _settings,
  onUpdateSettings
}) => {
  const [mcpStatus, setMcpStatus] = useState<{ running: boolean; port: number; clientCount: number; clients: any[] } | null>(null);
  const [mcpToken, setMcpToken] = useState<string>('');
  const [mcpTokenVisible, setMcpTokenVisible] = useState(false);
  const [disabledTools, setDisabledTools] = useState<string[]>([]);
  const [mcpCopied, setMcpCopied] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  const fetchMcpStatus = useCallback(async () => {
    if ((window as any).electronAPI?.getMcpStatus) {
      const status = await (window as any).electronAPI.getMcpStatus();
      setMcpStatus(status);
    }
    if ((window as any).electronAPI?.getMcpTokenStatus) {
      const tokenStatus = await (window as any).electronAPI.getMcpTokenStatus();
      if (tokenStatus?.configured) {
        setMcpToken(tokenStatus.prefix || 'nova_mcp_••••••••');
      } else {
        setMcpToken('');
      }
    }
    if ((window as any).electronAPI?.getMcpToolSettings) {
      setDisabledTools(await (window as any).electronAPI.getMcpToolSettings());
    }
  }, []);

  useEffect(() => {
    fetchMcpStatus();

    let cleanup: (() => void) | void;
    let cleanupStatus: (() => void) | void;
    if ((window as any).electronAPI?.onMcpClientChanged) {
      cleanup = (window as any).electronAPI.onMcpClientChanged((_: any, data: any) => {
        setMcpStatus(prev => prev ? { ...prev, clientCount: data.count, clients: data.clients } : null);
      });
    }
    if ((window as any).electronAPI?.onMcpStatusChanged) {
      cleanupStatus = (window as any).electronAPI.onMcpStatusChanged((_: any, isRunning: boolean) => {
        setMcpStatus(prev => prev ? { ...prev, running: isRunning } : { running: isRunning, port: 3020, clientCount: 0, clients: [] });
      });
    }
    return () => {
      if (typeof cleanup === 'function') cleanup();
      if (typeof cleanupStatus === 'function') cleanupStatus();
    };
  }, [fetchMcpStatus]);

  const handleToggleMcp = async () => {
    const isRunning = mcpStatus?.running || false;
    if (isRunning) {
      await (window as any).electronAPI?.stopMcpServer?.();
      onUpdateSettings({ mcpServerEnabled: false });
    } else {
      await (window as any).electronAPI?.startMcpServer?.();
      onUpdateSettings({ mcpServerEnabled: true });
    }
    setTimeout(fetchMcpStatus, 300);
  };

  const handleRotateToken = async () => {
    if ((window as any).electronAPI?.rotateMcpToken) {
      await (window as any).electronAPI.rotateMcpToken();
      await fetchMcpStatus();
    }
  };

  const handleCopyToken = async () => {
    try {
      if ((window as any).electronAPI?.copyMcpToken) {
        const ok = await (window as any).electronAPI.copyMcpToken();
        if (ok) {
          setTokenCopied(true);
          setTimeout(() => setTokenCopied(false), 2000);
          return;
        }
      }
    } catch (_) {}
    if (mcpToken && !isMaskedToken(mcpToken)) {
      const ok = await copyTextToClipboard(mcpToken);
      if (ok) {
        setTokenCopied(true);
        setTimeout(() => setTokenCopied(false), 2000);
      }
    }
  };

  const handleToggleTool = async (toolName: string, currentlyDisabled: boolean) => {
    if ((window as any).electronAPI?.setMcpToolEnabled) {
      await (window as any).electronAPI.setMcpToolEnabled(toolName, currentlyDisabled);
      fetchMcpStatus();
    }
  };

  const mcpConfigSnippet = `{
  "mcpServers": {
    "nova-browser": {
      "url": "http://localhost:${mcpStatus?.port || 3020}/sse",
      "headers": {
        "Authorization": "Bearer ${mcpToken}"
      }
    }
  }
}`;

  const handleCopyConfig = async () => {
    try {
      if ((window as any).electronAPI?.copyMcpConfig) {
        const ok = await (window as any).electronAPI.copyMcpConfig();
        if (ok) {
          setMcpCopied(true);
          setTimeout(() => setMcpCopied(false), 2000);
          return;
        }
      }
    } catch (_) {}
    const ok = await copyTextToClipboard(mcpConfigSnippet);
    if (ok) {
      setMcpCopied(true);
      setTimeout(() => setMcpCopied(false), 2000);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <Cpu className="w-6 h-6 text-blue-500" />
            MCP Server
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Model Context Protocol — Let AI tools control Nova Browser</p>
        </div>
        <button
          onClick={handleToggleMcp}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all cursor-pointer ${
            mcpStatus?.running
              ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400'
              : 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-400'
          }`}
        >
          {mcpStatus?.running ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {mcpStatus?.running ? 'Stop Server' : 'Start Server'}
        </button>
      </div>

      {/* Status Card */}
      <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${mcpStatus?.running ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {mcpStatus?.running ? 'Running' : 'Stopped'}
            </span>
            {mcpStatus?.running && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                http://localhost:{mcpStatus.port}/sse
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users className="w-4 h-4" />
            <span>{mcpStatus?.clientCount || 0} connected</span>
          </div>
        </div>

        {/* Connected clients list */}
        {(mcpStatus?.clients?.length || 0) > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Connected Clients</p>
            {mcpStatus!.clients.map((c: any) => (
              <div key={c.id} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-slate-700 dark:text-slate-300 truncate">{c.userAgent}</span>
                <span className="text-slate-400 text-xs ml-auto">
                  {Math.round((Date.now() - c.connectedAt) / 1000)}s ago
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Token Card */}
      <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-purple-500" />
          <p className="font-semibold text-slate-800 dark:text-slate-100">API Token Authentication</p>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type={mcpTokenVisible ? "text" : "password"}
            value={mcpToken}
            readOnly
            className="flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:border-purple-500 font-mono"
          />
          <button
            onClick={() => setMcpTokenVisible(!mcpTokenVisible)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            title={mcpTokenVisible ? "Hide Token" : "Show Token"}
          >
            {mcpTokenVisible ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
          <button
            onClick={handleCopyToken}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
          >
            {tokenCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleRotateToken}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-sm hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors cursor-pointer"
            title="Revoke old token and generate a new one"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Rotate
          </button>
        </div>
        <p className="text-xs text-slate-500">This token is required for all MCP clients to connect securely.</p>
      </div>

      {/* Config snippet */}
      <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">Setup Guide</p>
            <p className="text-xs text-slate-500 mt-0.5">Add this to your AI tool's MCP config (e.g., claude_desktop_config.json)</p>
          </div>
          <button
            onClick={handleCopyConfig}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
          >
            {mcpCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {mcpCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="bg-slate-950 text-green-400 text-sm rounded-xl p-4 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
          {mcpConfigSnippet}
        </pre>
      </div>

      {/* Tools list & Permissions */}
      <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-orange-500" />
          <p className="font-semibold text-slate-800 dark:text-slate-100">Tool Permissions ({MCP_TOOLS.length})</p>
        </div>
        <p className="text-xs text-slate-500 mb-2">Enable or disable specific browser capabilities. Sensitive actions are disabled by default.</p>
        <div className="grid grid-cols-1 gap-1.5 max-h-[400px] overflow-y-auto pr-1">
          {MCP_TOOLS.map(tool => {
            const isDisabled = disabledTools.includes(tool.name);
            let badgeClass = "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
            let badgeText = "Safe";
            if (tool.level === 'medium') {
              badgeClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400";
              badgeText = "Medium";
            } else if (tool.level === 'sensitive') {
              badgeClass = "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
              badgeText = "Sensitive";
            }

            return (
              <div key={tool.name} className={`flex items-center justify-between py-2 px-3 rounded-lg border transition-colors ${isDisabled ? 'bg-slate-50 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700/50 opacity-60' : 'bg-white border-slate-200 dark:bg-slate-800/50 dark:border-slate-700/50'}`}>
                <div className="flex flex-col gap-1 pr-4 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-blue-600 dark:text-blue-400 font-mono font-medium truncate">{tool.name}</code>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badgeClass}`}>{badgeText}</span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{tool.desc}</span>
                </div>
                <button
                  onClick={() => handleToggleTool(tool.name, isDisabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${!isDisabled ? (tool.level === 'sensitive' ? 'bg-orange-500' : 'bg-blue-500') : 'bg-slate-200 dark:bg-slate-600'}`}
                  role="switch"
                  aria-checked={!isDisabled}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${!isDisabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
