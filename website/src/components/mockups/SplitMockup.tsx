import { BrowserWindow } from './BrowserWindow';
import { Code2, BookOpen, GripVertical, CheckCircle2 } from 'lucide-react';

export const SplitMockup = () => {
  return (
    <BrowserWindow 
      url="split:nova://docs | nova://playground"
      tabs={[
        { title: 'API Documentation', active: true },
        { title: 'Test Playground', active: true }
      ]}
      isShieldActive={true}
    >
      <div className="w-full h-full flex overflow-hidden bg-[#070a12]">
        {/* Left Pane (50%): Documentation */}
        <div className="flex-1 p-5 flex flex-col gap-3 overflow-hidden border-r border-white/10 bg-[#090d18]/60 select-none">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10 text-xs">
            <div className="flex items-center gap-2 text-white font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>Nova REST & MCP API</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">v2.0</span>
          </div>

          <div className="space-y-2">
            <div className="p-2 rounded-lg bg-white/5 border border-white/5 space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">GET</span>
                <span className="text-white/80">/api/v2/browser/tabs</span>
              </div>
              <p className="text-[10px] text-white/50">Retrieves all open tabs and active states across workspaces.</p>
            </div>

            <div className="p-2 rounded-lg bg-white/5 border border-white/5 space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">POST</span>
                <span className="text-white/80">/api/v2/mcp/action</span>
              </div>
              <p className="text-[10px] text-white/50">Executes an autonomous action with sandboxed execution.</p>
            </div>
          </div>
        </div>

        {/* Center Draggable Resizer Bar */}
        <div className="w-2 hover:w-2.5 bg-[#060911] hover:bg-blue-500 transition-all cursor-col-resize flex items-center justify-center border-x border-white/5 group">
          <GripVertical className="w-3 h-3 text-white/20 group-hover:text-white" />
        </div>

        {/* Right Pane (50%): Playground & JSON Response */}
        <div className="flex-1 p-5 flex flex-col gap-3 overflow-hidden bg-[#0a0f1e]/80 select-none">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10 text-xs">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Code2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Live Test Client</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>200 OK (12ms)</span>
            </div>
          </div>

          <div className="flex-1 p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-[10.5px] text-emerald-300/90 overflow-hidden space-y-1">
            <p className="text-white/40">// Response Body</p>
            <p>&#123;</p>
            <p className="pl-3">"status": <span className="text-yellow-300">"success"</span>,</p>
            <p className="pl-3">"tabs_count": <span className="text-blue-400">8</span>,</p>
            <p className="pl-3">"split_view": <span className="text-purple-400">true</span>,</p>
            <p className="pl-3">"mcp_active": <span className="text-emerald-400">true</span></p>
            <p>&#125;</p>
          </div>
        </div>
      </div>
    </BrowserWindow>
  );
};
