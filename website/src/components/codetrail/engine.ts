import { FRAGMENTS, drawMatching, makeBag, type Fragment } from "./fragments";
import { PAIRS, UNDERLINE_EVERY, makeStepper } from "./palette";

export interface Vec {
  x: number;
  y: number;
}

export interface Badge {
  text: string;
  bg: string;
  fg: string;
  underline: boolean;
  comment: boolean;
  hot: boolean;
}

export interface Row {
  id: number;
  badges: Badge[];
  anchorIndex: number;
  pos: Vec;
  slot: number;
}

export const ROWS = 22;
export const FONT_RATIO = 1 / 42;
export const LINE_RATIO = 1.24;
export const PAD_RATIO = 0.12;
export const STEP_RATIO = 1.4;
export const MAX_BADGES = 3;

const CHASE = 0.24;

export function chaseRate(): number {
  return CHASE;
}

export function badgeCount(index: number, total: number): number {
  void total;
  if (index === 0) return 1;
  if (index === 1) return 2;
  return MAX_BADGES;
}

export function presence(index: number, total: number): number {
  const t = total <= 1 ? 0 : index / (total - 1);
  const START = 0.62;
  const fade = 1 - Math.max(0, (t - START) / (1 - START)) ** 1.6;
  return Math.max(0, Math.min(1, fade));
}

const HOT_EVERY = 19;
const HOT_COLORS = [
  { bg: "#0B0B0B", fg: "#F5F5F5" },
  { bg: "#FFFFFF", fg: "#111111" },
];

export function makeRowFactory() {
  const nextFragment = makeBag(FRAGMENTS);
  const nextPair = makeStepper(PAIRS.length);
  let id = 0;
  let sinceUnderline = 0;
  let sinceHot = 0;

  const paint = (text: string, comment: boolean): Badge => {
    const pair = PAIRS[nextPair()];
    sinceUnderline++;
    sinceHot++;
    const underline =
      pair.underline === true || sinceUnderline >= UNDERLINE_EVERY;
    if (underline) sinceUnderline = 0;
    const hot = sinceHot >= HOT_EVERY;
    if (hot) sinceHot = 0;
    const shock = HOT_COLORS[id % HOT_COLORS.length];
    return {
      text,
      bg: hot ? shock.bg : pair.bg,
      fg: hot ? shock.fg : pair.fg,
      underline,
      comment,
      hot,
    };
  };

  return function buildRow(): Row {
    const badges: Badge[] = [];
    let need: Fragment["in"] = "free";
    for (let i = 0; i < MAX_BADGES; i++) {
      const f: Fragment =
        i === 0 ? nextFragment() : drawMatching(nextFragment, need);
      badges.push(paint(f.text, f.comment === true));
      need = f.out === "end" ? "free" : f.out;
      if (f.comment) break;
    }

    return {
      id: id++,
      badges,
      anchorIndex: badges.length,
      pos: { x: 0, y: 0 },
      slot: 0,
    };
  };
}

export class Drift {
  private at: Vec = { x: 0, y: 0 };
  private dir: Vec = { x: 1, y: 0 };
  private target: Vec = { x: 0, y: 0 };
  private started = false;
  private speed = 0.34;
  private turn = 0.0042;

  constructor(
    private w: number,
    private h: number,
  ) {}

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
  }

  reseed(at: Vec) {
    this.at = { ...at };
    this.started = true;
    this.retarget();
  }

  private retarget() {
    const m = 0.2;
    this.target = {
      x: (m + Math.random() * (1 - m * 2)) * this.w,
      y: (m + Math.random() * (1 - m * 2)) * this.h,
    };
  }

  step(dt: number): Vec {
    if (!this.started) {
      this.at = { x: this.w * 0.5, y: this.h * 0.5 };
      this.started = true;
      this.retarget();
    }

    const bx = this.target.x - this.at.x;
    const by = this.target.y - this.at.y;
    const bl = Math.hypot(bx, by) || 1;
    const k = Math.min(1, this.turn * dt);
    this.dir.x += (bx / bl - this.dir.x) * k;
    this.dir.y += (by / bl - this.dir.y) * k;
    const dl = Math.hypot(this.dir.x, this.dir.y) || 1;
    this.dir.x /= dl;
    this.dir.y /= dl;

    this.at.x += this.dir.x * this.speed * dt;
    this.at.y += this.dir.y * this.speed * dt;

    if (bl < Math.min(this.w, this.h) * 0.22) this.retarget();

    const pad = 0.2;
    const near =
      this.at.x < this.w * pad ||
      this.at.x > this.w * (1 - pad) ||
      this.at.y < this.h * pad ||
      this.at.y > this.h * (1 - pad);
    if (near) this.target = { x: this.w * 0.5, y: this.h * 0.5 };

    this.at.x = Math.max(0, Math.min(this.w, this.at.x));
    this.at.y = Math.max(0, Math.min(this.h, this.at.y));

    return { ...this.at };
  }
}
