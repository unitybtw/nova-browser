import { BrowserWindow } from './BrowserWindow';
import { Sparkles, Send, Bot, User, Cpu, FileCode2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const AiMockup = () => {
  return (
    <BrowserWindow 
      url="https://github.com/unitybtw/nova-browser"
      tabs={[
        { title: 'Nova Browser - GitHub', active: true },
        { title: 'Local AI Architecture', active: false }
      ]}
      isAiActive={true}
    >
      <div className="w-full h-full flex overflow-hidden">
        {/* Left: Code/Page View */}
        <div className="flex-1 p-5 overflow-hidden flex flex-col gap-3 font-mono text-[11px] text-white/70 border-r border-white/5 bg-[#090d16]/70">
          <div className="flex items-center gap-2 pb-3 border-b border-white/5 text-white/90">
            <FileCode2 className="w-4 h-4 text-blue-400" />
            <span className="font-semibold">electron/mcpServer.ts</span>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-sans">TypeScript</span>
          </div>

          <div className="space-y-1 opacity-80 select-text">
            <p><span className="text-purple-400">export class</span> <span className="text-yellow-300">BrowserMCPServer</span> &#123;</p>
            <p className="pl-4"><span className="text-purple-400">private</span> app: express.Express;</p>
            <p className="pl-4"><span className="text-purple-400">private</span> port = <span className="text-emerald-400">3020</span>;</p>
            <p className="pl-4 pt-1"><span className="text-purple-400">async</span> <span className="text-blue-400">executeTool</span>(name: <span className="text-yellow-300">string</span>, args: <span className="text-yellow-300">any</span>) &#123;</p>
            <p className="pl-8 text-emerald-400">// Direct AI browser control bridge</p>
            <p className="pl-8"><span className="text-purple-400">return await</span> this.mainWindow.webContents.executeJavaScript(...);</p>
            <p className="pl-4">&#125;</p>
            <p>&#125;</p>
          </div>
        </div>

        {/* Right: Nova AI Assistant Sidepanel */}
        <div className="w-[310px] bg-[#0c101c] flex flex-col h-full flex-shrink-0 shadow-2xl relative">
          {/* AI Header */}
          <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-purple-500/20 text-purple-400">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-white">Nova AI Agent</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
              <Cpu className="w-2.5 h-2.5" />
              <span>WebGPU Local</span>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-3 space-y-3 overflow-hidden text-xs flex flex-col justify-end">
            {/* User Message */}
            <div className="flex items-start gap-2 justify-end">
              <div className="bg-blue-600 text-white rounded-2xl rounded-tr-xs px-3 py-2 max-w-[210px] leading-relaxed shadow-sm">
                How does Nova Browser run local AI without sending data to servers?
              </div>
              <div className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center text-blue-300 text-[10px] shrink-0">
                <User className="w-3 h-3" />
              </div>
            </div>

            {/* AI Response */}
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-300 text-[10px] shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 text-white/90 border border-white/10 rounded-2xl rounded-tl-xs p-3 leading-relaxed text-[11px] shadow-sm space-y-1.5"
              >
                <p>
                  Nova executes models like <strong>Llama-3.2</strong> directly on your GPU via <strong>WebGPU</strong> inside sandboxed workers.
                </p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>0 Cloud telemetry • 100% On-Device</span>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Quick Suggestions & Input */}
          <div className="p-2.5 border-t border-white/10 bg-white/[0.01] space-y-2">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide text-[10px]">
              <span className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 cursor-pointer whitespace-nowrap">✨ Summarize</span>
              <span className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 cursor-pointer whitespace-nowrap">🔍 Scan Security</span>
            </div>

            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5">
              <input 
                type="text" 
                placeholder="Ask Nova AI anything..." 
                className="bg-transparent text-xs text-white placeholder-white/40 focus:outline-none flex-1 font-sans"
                disabled
              />
              <button className="p-1 rounded-lg bg-purple-600 text-white hover:bg-purple-500">
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </BrowserWindow>
  );
};
