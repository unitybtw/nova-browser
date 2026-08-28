import { Download, Terminal, ShieldAlert, Cpu } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen pb-24">
      {/* Functional Header */}
      <header className="px-6 py-8 border-b border-[#e0e0e0] flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-black flex items-center justify-center">
            <span className="text-white font-mono text-[10px] font-bold">N</span>
          </div>
          <span className="font-display font-bold tracking-tight text-lg">Nova Browser</span>
        </div>
        <div className="font-mono text-xs text-[#555] hidden sm:block">
          Sovereign Desktop Engine // v1.1.0
        </div>
      </header>

      <main>
        {/* Step 1: WebGPU Engine */}
        <section className="workbench-frame">
          <div className="workbench-caption">
            <div className="flex items-center gap-2">
              <span className="bg-black text-white px-2 py-0.5 text-xs font-bold">01</span>
              <span className="font-bold">Local Model Execution</span>
            </div>
            <span className="text-[#555] hidden sm:inline">WebGPU 64.2 tok/s</span>
          </div>
          <div className="workbench-content">
            <div className="fake-window">
              <div className="fake-window-header">
                <div className="dot" /><div className="dot" /><div className="dot" />
                <div className="ml-4 font-mono text-[10px] text-[#888] bg-white border border-[#e0e0e0] px-3 py-1 rounded w-64 text-center">
                  nova://engine/webgpu-runtime
                </div>
              </div>
              <div className="p-8 bg-white min-h-[300px] flex flex-col gap-6 font-mono text-sm">
                <div className="flex gap-4">
                  <span className="text-[#888]">&gt;</span>
                  <span className="font-bold">@nova summarize the technical differences in DOM hibernation</span>
                </div>
                <div className="p-4 bg-[#f9f9f9] border border-[#e0e0e0] text-[#333] leading-relaxed">
                  <div className="flex items-center gap-2 text-blue-600 mb-3 text-xs font-bold uppercase">
                    <Cpu className="w-4 h-4" />
                    Executing on-device (Llama 3.2 3B)
                  </div>
                  Nova Browser isolates background webview pipelines at the native compositor level. While standard browsers throttle background CPU timers, Nova unmounts the inactive DOM tree to compressed RAM while retaining the instant forward/backward cache in 0.04ms. This achieves a 64% RAM reduction across 20+ active tabs without cloud telemetry.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Step 2: Telemetry Intercept */}
        <section className="workbench-frame border-t-0">
          <div className="workbench-caption">
            <div className="flex items-center gap-2">
              <span className="bg-black text-white px-2 py-0.5 text-xs font-bold">02</span>
              <span className="font-bold">Kernel Socket Intercept</span>
            </div>
            <span className="text-[#555] hidden sm:inline">Zero Cloud Pings</span>
          </div>
          <div className="workbench-content bg-[#f0f0f0]">
            <div className="fake-window">
              <div className="fake-window-header">
                <div className="dot" /><div className="dot" /><div className="dot" />
                <div className="ml-4 font-mono text-[10px] text-[#888] bg-white border border-[#e0e0e0] px-3 py-1 rounded w-64 text-center">
                  nova://privacy/network-filter
                </div>
              </div>
              <div className="p-8 bg-white min-h-[300px] flex flex-col gap-4 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[#eee] pb-2 text-[#888]">
                  <span>Request Payload</span>
                  <span>Action</span>
                </div>
                <div className="flex items-center justify-between py-2 text-red-600">
                  <span className="truncate pr-4">POST https://www.google-analytics.com/g/collect?v=2...</span>
                  <div className="flex items-center gap-1 border border-red-200 bg-red-50 px-2 py-1 rounded">
                    <ShieldAlert className="w-3 h-3" /> BLOCKED (0.12ms)
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 text-red-600">
                  <span className="truncate pr-4">GET https://connect.facebook.net/en_US/fbevents.js</span>
                  <div className="flex items-center gap-1 border border-red-200 bg-red-50 px-2 py-1 rounded">
                    <ShieldAlert className="w-3 h-3" /> BLOCKED (0.08ms)
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 text-[#333]">
                  <span className="truncate pr-4">GET https://api.github.com/repos/unitybtw/nova-browser</span>
                  <div className="px-2 py-1 text-[#888]">ALLOWED</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Step 3: MCP Bridge */}
        <section className="workbench-frame border-t-0">
          <div className="workbench-caption">
            <div className="flex items-center gap-2">
              <span className="bg-black text-white px-2 py-0.5 text-xs font-bold">03</span>
              <span className="font-bold">Model Context Protocol</span>
            </div>
            <span className="text-[#555] hidden sm:inline">Port 3020 Localhost</span>
          </div>
          <div className="workbench-content bg-[#e8e8e8]">
            <div className="fake-window">
              <div className="fake-window-header bg-[#111] border-[#333]">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                <div className="ml-4 font-mono text-[10px] text-[#888]">~ zsh</div>
              </div>
              <div className="p-8 bg-[#111] text-[#0f0] min-h-[300px] font-mono text-sm leading-relaxed overflow-x-auto">
                <div><span className="text-white">$</span> cat ~/Library/Application\ Support/Claude/claude_desktop_config.json</div>
                <div className="mt-4 text-[#ccc]">
                  {'{'}<br />
                  &nbsp;&nbsp;"mcpServers": {'{'}<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;"nova-browser": {'{'}<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"command": "npx",<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"args": ["-y", "@nova/mcp-server", "--port", "3020"],<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"env": {'{'}<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"NOVA_ENDPOINT": "http://127.0.0.1:3020"<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{'}'}<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;{'}'}<br />
                  &nbsp;&nbsp;{'}'}<br />
                  {'}'}
                </div>
                <div className="mt-4 text-cyan-400">
                  <Terminal className="inline w-4 h-4 mr-2" />
                  Agents can now inspect active tab accessibility nodes securely.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Step 4: Installation */}
        <section className="px-6 py-16 flex flex-col items-center text-center">
          <h2 className="font-display font-bold text-3xl mb-4">Install Nova Browser</h2>
          <p className="font-mono text-sm text-[#555] mb-8 max-w-lg">
            Free, open-source under MIT. 100% reproducible builds. Cryptographically signed releases.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl text-left">
            <div className="border border-[#e0e0e0] p-6 bg-white">
              <h3 className="font-bold text-lg mb-2">macOS</h3>
              <code className="block bg-[#f4f4f4] p-3 text-xs mb-4">brew install --cask nova-browser</code>
              <a href="https://github.com/unitybtw/nova-browser/releases" className="text-blue-600 font-bold hover:underline text-sm">Download DMG →</a>
            </div>
            <div className="border border-[#e0e0e0] p-6 bg-white">
              <h3 className="font-bold text-lg mb-2">Windows</h3>
              <code className="block bg-[#f4f4f4] p-3 text-xs mb-4">winget install NovaBrowser.Nova</code>
              <a href="https://github.com/unitybtw/nova-browser/releases" className="text-blue-600 font-bold hover:underline text-sm">Download EXE →</a>
            </div>
            <div className="border border-[#e0e0e0] p-6 bg-white">
              <h3 className="font-bold text-lg mb-2">Linux</h3>
              <code className="block bg-[#f4f4f4] p-3 text-xs mb-4">curl -fsSL bit.ly/nova-install | bash</code>
              <a href="https://github.com/unitybtw/nova-browser/releases" className="text-blue-600 font-bold hover:underline text-sm">Download AppImage →</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e0e0e0] bg-white px-6 py-8 font-mono text-xs text-[#555] flex flex-col sm:flex-row justify-between gap-4">
        <div>© {new Date().getFullYear()} Nova Browser Team. MIT Licensed.</div>
        <div className="flex gap-4">
          <a href="https://github.com/unitybtw/nova-browser" className="hover:text-black">GitHub</a>
          <a href="https://github.com/unitybtw/nova-browser/releases" className="hover:text-black">Releases</a>
        </div>
      </footer>

      {/* Sticky Bottom CTA */}
      <aside className="sticky-cta">
        <a href="https://github.com/unitybtw/nova-browser/releases" className="btn-primary">
          <Download className="w-4 h-4" />
          Download Nova (v1.1.0)
        </a>
      </aside>
    </div>
  );
}
