import React from "react";

interface RetroGridProps {
  className?: string;
  angle?: number;
}

export const RetroGrid: React.FC<RetroGridProps> = ({
  className = "",
  angle = 65
}) => {
  return (
    <div
      className={`pointer-events-none absolute size-full overflow-hidden opacity-30 [perspective:200px] ${className}`}
      style={{ "--grid-angle": `${angle}deg` } as React.CSSProperties}
    >
      {/* Grid */}
      <div className="absolute inset-0 [transform:rotateX(var(--grid-angle))]">
        <div
          className="animate-grid [background-repeat:repeat] [background-size:60px_60px] [height:300vh] [inset:0%_0px] [margin-left:-50%] [transform-origin:100%_0_0] [width:600vw]"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(99, 102, 241, 0.25) 1px, transparent 0), linear-gradient(to bottom, rgba(99, 102, 241, 0.25) 1px, transparent 0)`
          }}
        />
      </div>

      {/* Background Gradient fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#fcfbf9] to-transparent to-90%" />
    </div>
  );
};

export default RetroGrid;
