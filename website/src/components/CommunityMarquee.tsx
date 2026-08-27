import React from "react";
import { Marquee } from "./ui/Marquee";

const REVIEWS = [
  {
    name: "Alex Rivera",
    username: "@arivera_dev",
    body: "Finally, an AI browser that does not send my open editor tabs to OpenAI servers. WebGPU local inference is lightning fast on M3 Max.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
    tag: "Staff Engineer"
  },
  {
    name: "David Chen",
    username: "@dchen_ai",
    body: "The Model Context Protocol (MCP) server running on port 3020 connected directly with my Claude Desktop agent. Absolute game changer.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
    tag: "AI Researcher"
  },
  {
    name: "Elena Rostova",
    username: "@elena_sec",
    body: "Checked the network inspector with Wireshark. Zero background telemetry pings. Nova is genuinely private.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
    tag: "Security Lead"
  },
  {
    name: "Marcus Vance",
    username: "@marcus_v",
    body: "Replaced Arc Browser on day one. 400MB RAM usage for 25 open tabs with automatic sleep is something Chrome could never do.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
    tag: "Open Source Contributor"
  },
  {
    name: "Sarah Jenkins",
    username: "@sjenkins_ux",
    body: "The 1-click page translation with zero latency and side-by-side split tiling feels like a browser from 2030.",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=faces",
    tag: "Product Designer"
  }
];

const TECH_BADGES = [
  "WebGPU Compute Pipeline",
  "Model Context Protocol (MCP)",
  "Apple Metal Hardware Acceleration",
  "Rust Network Engine",
  "Zero-Knowledge AES-256-GCM",
  "Llama 3.2 3B Quantized",
  "Phi-3.5 Vision Multimodal",
  "Chromium 126+ Engine",
  "Homebrew Cask Formula",
  "React 19 & Tailwind v4"
];

export const CommunityMarquee: React.FC = () => {
  return (
    <section id="community" className="py-24 max-w-7xl mx-auto overflow-hidden border-t border-[#e5e5e5]">
      {/* Section Header */}
      <div className="text-center px-6 max-w-3xl mx-auto mb-14">
        <span className="font-mono text-xs uppercase tracking-widest text-[#4338ca] font-semibold">
          COMMUNITY & ECOSYSTEM
        </span>
        <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-[#171717] tracking-tight mt-3">
          Loved by Engineers & Privacy Advocates
        </h2>
        <p className="font-sans text-neutral-600 mt-3 text-sm leading-relaxed">
          Open-source community feedback from developers running sovereign AI workloads on local hardware.
        </p>
      </div>

      {/* Tech Stack Marquee (Row 1) */}
      <div className="relative mb-6">
        <Marquee pauseOnHover className="[--duration:25s]">
          {TECH_BADGES.map((badge, idx) => (
            <div
              key={idx}
              className="px-4 py-2 rounded-full bg-white border border-neutral-200/80 shadow-2xs font-mono text-xs font-semibold text-neutral-700 flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#4338ca]" />
              <span>{badge}</span>
            </div>
          ))}
        </Marquee>
      </div>

      {/* Developer Reviews Marquee (Row 2 - Reverse) */}
      <div className="relative">
        <Marquee reverse pauseOnHover className="[--duration:45s]">
          {REVIEWS.map((review, idx) => (
            <div
              key={idx}
              className="w-[320px] sm:w-[380px] p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={review.avatar}
                    alt={review.name}
                    className="w-10 h-10 rounded-full object-cover border border-neutral-200"
                  />
                  <div>
                    <h4 className="font-display font-bold text-sm text-[#171717]">{review.name}</h4>
                    <span className="font-mono text-[11px] text-neutral-400">{review.username}</span>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-semibold text-[#4338ca] bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  {review.tag}
                </span>
              </div>
              <p className="font-sans text-xs text-neutral-600 leading-relaxed">
                "{review.body}"
              </p>
            </div>
          ))}
        </Marquee>
      </div>
    </section>
  );
};

export default CommunityMarquee;
