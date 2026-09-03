/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    checkOllama: () => Promise<{ available: boolean; models: string[] }>;
    setPrivacyShield?: (enabled: boolean) => Promise<boolean>;
    onShortcut: (callback: (event: any, command: string) => void) => (() => void) | void;
    onNewTab?: (callback: (event: any, url: string) => void) => (() => void) | void;
    onDownloadUpdate: (callback: (event: any, data: any) => void) => (() => void) | void;
    secureStoreSet?: (key: string, value: string) => Promise<boolean>;
    secureStoreGet?: (key: string) => Promise<string | null>;
    storeSet?: (key: string, value: string) => Promise<boolean>;
    storeGet?: (key: string) => Promise<string | null>;
    onAdBlocked?: (callback: (event: any, tabId: number) => void) => () => void;
    // MCP action bridge (main process <-> renderer round-trip)
    onMcpActionRequest?: (callback: (id: string, toolName: string, args: any) => void) => () => void;
    respondMcpAction?: (id: string, result: unknown) => void;
    getAppVersion?: () => Promise<string>;
  };
}

declare const __APP_VERSION__: string;

