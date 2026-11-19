import React, { useState, useEffect, useCallback } from 'react';
import { Play, Square, Copy, Check, Users, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { UserSettings } from '../../types/browser';
import { copyTextToClipboard } from '../../utils/clipboard';
import { useSafeTimeout } from '../../hooks/useSafeTimeout';
import { ToggleSwitch } from './ToggleSwitch';
import {
  SETTINGS_INPUT_CLS,
  SettingsBadge,
  SettingsButton,
  SettingsGroup,
  SettingsPageHeader,
  SettingsRow,
} from './SettingsPrimitives';

// mcpToken from getMcpTokenStatus is only a display prefix (e.g. "nova_mcp_••••").
// Never treat a masked value as the real secret.
const isMaskedToken = (v: string) => !v || v.includes('•') || v.includes('****');

export interface McpSectionProps {
  settings: Pick<UserSettings, 'mcpServerEnabled'>;
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
  { name: 'browser_get_element_text', desc: "Get an element's text content", level: 'safe' },
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
] as const;

export const McpSection: React.FC<McpSectionProps> = ({
  onUpdateSettings,
}) => {
  const [mcpStatus, setMcpStatus] = useState<{ running: boolean; port: number; clientCount: number; clients: any[] } | null>(null);
  const [mcpToken, setMcpToken] = useState<string>('');
  const [mcpTokenVisible, setMcpTokenVisible] = useState(false);
  const [disabledTools, setDisabledTools] = useState<string[]>([]);
  const [mcpCopied, setMcpCopied] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const { setSafeTimeout } = useSafeTimeout();

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
        setMcpStatus((prev) => (prev ? { ...prev, clientCount: data.count, clients: data.clients } : null));
      });
    }
    if ((window as any).electronAPI?.onMcpStatusChanged) {
      cleanupStatus = (window as any).electronAPI.onMcpStatusChanged((_: any, status: any) => {
        const isRunning = typeof status === 'object' && status !== null ? Boolean(status.running) : Boolean(status);
        const port = typeof status === 'object' && status?.port ? Number(status.port) : 3020;
        setMcpStatus((prev) =>
          prev ? { ...prev, running: isRunning, port: port || prev.port } : { running: isRunning, port, clientCount: 0, clients: [] }
        );
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
    setSafeTimeout(fetchMcpStatus, 300);
  };

  const handleRotateToken = async () => {
    if ((window as any).electronAPI?.rotateMcpToken) {
      await (window as any).electronAPI.rotateMcpToken();
      await fetchMcpStatus();
    }
  };

  const handleCopyToken = async () => {
    // Real token lives in main process — copy via IPC, never the masked prefix.
    try {
      if ((window as any).electronAPI?.copyMcpToken) {
        const ok = await (window as any).electronAPI.copyMcpToken();
        if (ok) {
          setTokenCopied(true);
          setSafeTimeout(() => setTokenCopied(false), 2000);
          return;
        }
      }
    } catch (_) {}
    // Fallback only when we hold an unmasked value; placeholder prefix must not be copied.
    if (mcpToken && !isMaskedToken(mcpToken)) {
      const ok = await copyTextToClipboard(mcpToken);
      if (ok) {
        setTokenCopied(true);
        setSafeTimeout(() => setTokenCopied(false), 2000);
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
    // Main builds the config with the real token — prefer IPC over the
    // status prefix shown in the UI.
    try {
      if ((window as any).electronAPI?.copyMcpConfig) {
        const ok = await (window as any).electronAPI.copyMcpConfig();
        if (ok) {
          setMcpCopied(true);
          setSafeTimeout(() => setMcpCopied(false), 2000);
          return;
        }
      }
    } catch (_) {}
    const ok = await copyTextToClipboard(mcpConfigSnippet);
    if (ok) {
      setMcpCopied(true);
      setSafeTimeout(() => setMcpCopied(false), 2000);
    }
  };

  const isRunning = Boolean(mcpStatus?.running);
  const enabledCount = MCP_TOOLS.length - disabledTools.length;

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        title="MCP Server"
        description="Model Context Protocol — let local AI assistants inspect and control Nova Browser over SSE."
        action={
          <SettingsButton
            variant={isRunning ? 'danger' : 'primary'}
            onClick={handleToggleMcp}
          >
            {isRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? 'Stop Server' : 'Start Server'}
          </SettingsButton>
        }
      />

      {/* Server Status */}
      <SettingsGroup title="Server Status">
        <SettingsRow
          title={
            <span className="inline-flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-500' : 'bg-neutral-400 dark:bg-neutral-600'}`} />
              <span>{isRunning ? 'Running' : 'Stopped'}</span>
            </span>
          }
          description={
            isRunning ? (
              <span className="font-mono text-[11px] text-neutral-600 dark:text-neutral-300">
                http://localhost:{mcpStatus?.port || 3020}/sse
              </span>
            ) : (
              'Local SSE listener on port 3020 is inactive.'
            )
          }
        >
          <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
            <Users className="w-3.5 h-3.5" />
            {mcpStatus?.clientCount || 0} connected
          </span>
        </SettingsRow>

        {(mcpStatus?.clients?.length || 0) > 0 && (
          <div className="px-4 sm:px-5 py-3 space-y-2 bg-neutral-50/70 dark:bg-white/[0.02]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Connected Clients
            </div>
            {mcpStatus?.clients?.map((c: any) => (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-neutral-700 dark:text-neutral-300 truncate font-mono">{c.userAgent}</span>
                <span className="text-neutral-400 dark:text-neutral-500 text-[11px] ml-auto tabular-nums shrink-0">
                  {Math.round((Date.now() - c.connectedAt) / 1000)}s ago
                </span>
              </div>
            ))}
          </div>
        )}
      </SettingsGroup>

      {/* API Token Authentication */}
      <SettingsGroup
        title="API Token Authentication"
        description="Bearer token required for all MCP clients to connect securely."
      >
        <div className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <input
              type={mcpTokenVisible ? 'text' : 'password'}
              value={mcpToken}
              readOnly
              className={`${SETTINGS_INPUT_CLS} font-mono pr-9`}
            />
            <button
              type="button"
              onClick={() => setMcpTokenVisible(!mcpTokenVisible)}
              title={mcpTokenVisible ? 'Hide Token' : 'Show Token'}
              aria-label={mcpTokenVisible ? 'Hide Token' : 'Show Token'}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
            >
              {mcpTokenVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SettingsButton variant="secondary" onClick={handleCopyToken}>
              {tokenCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {tokenCopied ? 'Copied' : 'Copy'}
            </SettingsButton>
            <SettingsButton
              variant="danger"
              onClick={handleRotateToken}
              title="Revoke old token and generate a new one"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Rotate
            </SettingsButton>
          </div>
        </div>
      </SettingsGroup>

      {/* Setup Guide / Config Snippet */}
      <SettingsGroup
        title="Client Configuration"
        description="Add this block to your AI client config (e.g., claude_desktop_config.json or Cursor MCP settings)."
        right={
          <SettingsButton variant="secondary" onClick={handleCopyConfig}>
            {mcpCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {mcpCopied ? 'Copied!' : 'Copy'}
          </SettingsButton>
        }
        noDivide
      >
        <pre className="p-4 bg-neutral-950 text-neutral-200 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
          {mcpConfigSnippet}
        </pre>
      </SettingsGroup>

      {/* Tool Permissions */}
      <SettingsGroup
        title={`Tool Permissions (${MCP_TOOLS.length})`}
        description="Enable or disable individual browser capabilities. Sensitive actions are disabled by default."
        right={
          <SettingsBadge>
            {enabledCount} / {MCP_TOOLS.length} enabled
          </SettingsBadge>
        }
        noDivide
      >
        <div className="max-h-[420px] overflow-y-auto divide-y divide-neutral-200/80 dark:divide-white/[0.07]">
          {MCP_TOOLS.map((tool) => {
            const isDisabled = disabledTools.includes(tool.name);
            const tone =
              tool.level === 'sensitive'
                ? 'danger'
                : tool.level === 'medium'
                ? 'warning'
                : 'success';
            const badgeText =
              tool.level === 'sensitive'
                ? 'Sensitive'
                : tool.level === 'medium'
                ? 'Medium'
                : 'Safe';

            return (
              <div
                key={tool.name}
                className={`px-4 sm:px-5 py-3 flex items-center justify-between gap-4 transition-opacity ${
                  isDisabled ? 'opacity-55' : ''
                }`}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs font-mono font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {tool.name}
                    </code>
                    <SettingsBadge tone={tone}>{badgeText}</SettingsBadge>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {tool.desc}
                  </p>
                </div>
                <ToggleSwitch
                  checked={!isDisabled}
                  onToggle={() => handleToggleTool(tool.name, isDisabled)}
                  ariaLabel={`Toggle ${tool.name}`}
                />
              </div>
            );
          })}
        </div>
      </SettingsGroup>
    </div>
  );
};
