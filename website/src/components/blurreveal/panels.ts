export interface Panel {
  line: string;
  bg: string;
  fg: string;
}

export const PANELS: Panel[] = [
  { line: "the browser is the engine", bg: "#0c0d12", fg: "#38bdf8" },
  { line: "sovereign local intelligence", bg: "#1e1b4b", fg: "#a78bfa" },
  { line: "zero telemetry. zero cloud.", bg: "#064e3b", fg: "#6ee7b7" },
  { line: "thought at the speed of thought", bg: "#4338ca", fg: "#fde047" },
  { line: "native hardware webgpu", bg: "#171717", fg: "#f472b6" },
  { line: "your machine. your rules.", bg: "#7c2d12", fg: "#fed7aa" },
];
