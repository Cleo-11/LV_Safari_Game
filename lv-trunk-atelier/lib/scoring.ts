import { CANVAS_OPTIONS, type TrunkState } from './trunk-data';

export interface Scores {
  heritage: number;
  creativity: number;
  rarity: number;
}

export function calcScores(S: TrunkState): Scores {
  let h = 0, c = 0, r = 0;

  const tb = ({ monogram: { h: 40, c: 5, r: 10 }, damier: { h: 30, c: 10, r: 18 }, archival: { h: 18, c: 15, r: 40 } } as Record<string, { h: number; c: number; r: number }>)[S.trunk];
  h += tb.h; c += tb.c; r += tb.r;

  const ci = CANVAS_OPTIONS[S.trunk].findIndex(o => o.id === S.canvasColor);
  const cs = [{ h: 22, c: 0, r: 5 }, { h: 8, c: 20, r: 16 }, { h: 0, c: 12, r: 30 }][ci] || { h: 22, c: 0, r: 5 };
  h += cs.h; c += cs.c; r += cs.r;

  const hws = ({ brass: { h: 20, c: 0, r: 5 }, silver: { h: 6, c: 14, r: 14 }, gold: { h: 2, c: 10, r: 28 }, rosegold: { h: 0, c: 22, r: 24 } } as Record<string, { h: number; c: number; r: number }>)[S.hardware];
  h += hws.h; c += hws.c; r += hws.r;

  const hs = ({ natural: { h: 16, c: 0, r: 5 }, dark: { h: 8, c: 10, r: 10 }, chain: { h: 0, c: 28, r: 20 } } as Record<string, { h: number; c: number; r: number }>)[S.handle];
  h += hs.h; c += hs.c; r += hs.r;

  if (S.initials.length > 0) { h += 4; c += 8; r += 6; } else { h += 8; }

  if (S.stickers.length === 0) { h += 8; }
  else if (S.stickers.length === 1) { c += 12; r += 5; }
  else if (S.stickers.length === 2) { c += 20; r += 10; h -= 5; }
  else { c += 28; r += 14; h -= 12; }

  return {
    heritage: Math.min(100, Math.max(0, Math.round(h))),
    creativity: Math.min(100, Math.max(0, Math.round(c))),
    rarity: Math.min(100, Math.max(0, Math.round(r))),
  };
}
