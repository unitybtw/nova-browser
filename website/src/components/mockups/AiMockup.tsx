import { BrowserWindow } from './BrowserWindow';
import { Bot, Sparkles, Send, Cpu } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

export const AiMockup = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <BrowserWindow
      url="https://github.com/unitybtw/nova-browser"
      tabs={[
        { title: 'unitybtw/nova-browser', active: true },
        { title: 'New Tab' }
      ]}
      isShieldActive={true}
      isAiActive={true}
    >
      <div className="flex h-full w-full">
        {/* Main Content: GitHub Code Viewer */}
        <div className={`flex-1 p-5 overflow-hidden flex flex-col font-mono text-xs ${
          isDark ? 'bg-[#0d1117] text-white/80' : 'bg-white text-slate-700'
        }`}>
          <div className={`flex items-center gap-2 pb-3 mb-3 border-b text-[11px] font-sans ${
            isDark ? 'border-white/10 text-white/90' : 'border-slate-200 text-slate-800'
          }`}>
            <span className="font-semibold text-sm">unitybtw / nova-browser</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-sans ml-2 ${
              isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
            }`}>Public</span>
            <span className={`ml-auto text-[11px] ${isDark ? 'text-white/40' : 'text-slate-400'}`}>TypeScript • 98.4%</span>
          </div>

          <div className={`p-4 rounded-xl border space-y-2 leading-relaxed flex-1 overflow-hidden ${
            isDark ? 'bg-[#161b22] border-white/10 text-white/80' : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <div className={`text-[11px] pb-2 border-b flex items-center justify-between ${
              isDark ? 'border-white/5 text-white/40' : 'border-slate-200 text-slate-400'
            }`}>
              <span>electron / mcpServer.ts</span>
              <span>64 lines • 2.1 KB</span>
            </div>
            <p><span className="text-purple-500 font-semibold">import</span> &#123; <span className="text-amber-500">Server</span> &#125; <span className="text-purple-500 font-semibold">from</span> <span className="text-emerald-500">'@modelcontextprotocol/sdk'</span>;</p>
            <p><span className="text-purple-500 font-semibold">export class</span> <span className="text-amber-500 font-semibold">BrowserMCPServer</span> &#123;</p>
            <p className="pl-4"><span className="text-purple-500 font-semibold">private</span> port = <span className="text-emerald-500">3020</span>;</p>
            <p className="pl-4 pt-1"><span className="text-purple-500 font-semibold">async</span> <span className="text-blue-500">executeAutonomousAction</span>(command: <span className="text-amber-500">string</span>) &#123;</p>
            <p className="pl-8 text-emerald-600 dark:text-emerald-400">// Direct AI browser control bridge with sandboxed WebGPU execution</p>
            <p className="pl-8"><span className="text-purple-500 font-semibold">return await</span> this.mainWindow.webContents.executeJavaScript(command);</p>
            <p className="pl-4">&#125;</p>
            <p>&#125;</p>
          </div>
        </div>

        {/* AI Sidepanel */}
        <div className={`w-72 border-l flex flex-col justify-between p-4 flex-shrink-0 transition-colors ${
          isDark ? 'bg-[#0f1422] border-white/10 text-white' : 'bg-slate-100/70 border-slate-200 text-slate-900'
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold">Nova AI Assistant</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Cpu className="w-2.5 h-2.5" />
              <span>WebGPU</span>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="space-y-3 py-3 flex-1 overflow-hidden">
            <div className={`p-2.5 rounded-xl text-xs ${
              isDark ? 'bg-white/5 border border-white/5 text-white/70' : 'bg-white border border-slate-200 text-slate-700 shadow-xs'
            }`}>
              <p className="font-semibold text-purple-500 mb-1 text-[10px]">User Query</p>
              "Explain how the MCP server coordinates AI actions with the browser."
            </div>

            <div className={`p-2.5 rounded-xl text-xs space-y-1.5 ${
              isDark ? 'bg-purple-950/30 border border-purple-500/20 text-purple-200' : 'bg-purple-50 border border-purple-200 text-purple-900'
            }`}>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-500">
                <Sparkles className="w-3 h-3" />
                <span>Nova Engine (Local 100%)</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                The MCP Server exposes a native IPC bridge allowing local LLM models to perform safe DOM queries and automate actions with zero cloud latency.
              </p>
            </div>
          </div>

          {/* Chat Input */}
          <div className={`relative flex items-center rounded-xl border p-1.5 ${
            isDark ? 'bg-black/40 border-white/10' : 'bg-white border-slate-300'
          }`}>
            <input 
              type="text" 
              readOnly 
              placeholder="Ask Nova AI anything about this page..." 
              className={`w-full bg-transparent text-[11px] px-2 outline-none ${
                isDark ? 'text-white placeholder:text-white/30' : 'text-slate-900 placeholder:text-slate-400'
              }`} 
            />
            <button className="p-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors">
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </BrowserWindow>
  );
};
