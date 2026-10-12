// Geometry helpers shared by the SmartArt layouts. All numbers are points inside the W x H box.
// Roles: main (accent fill), sub (light fill), accent (small colored mark), connector (arrows / bars),
// bg (very light background), text (text only, dark), label (text only drawn over a main shape).

export const gapOf = (W, H) => Math.max(3, Math.min(W, H) * 0.035);

/** n equal slots RIGHT-to-LEFT across `total`: [{ x, w }] (slot 0 is the rightmost) */
export const rtlSlots = (n, total, gap, start = 0) => {
  const w = (total - (n - 1) * gap) / n;
  return Array.from({ length: n }, (_, i) => ({ x: start + total - (i + 1) * w - i * gap, w }));
};

/** n equal slots top-to-bottom: [{ y, h }] */
export const colSlots = (n, total, gap, start = 0) => {
  const h = (total - (n - 1) * gap) / n;
  return Array.from({ length: n }, (_, i) => ({ y: start + i * (h + gap), h }));
};

/** Columns / rows for a grid of n cells with a pleasant (~1.6) cell shape */
export const gridDims = (n, W, H) => {
  let best = { cols: 1, rows: n, score: Infinity };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const score = Math.abs(Math.log((W / cols) / (H / rows) / 1.6));
    if (score < best.score) best = { cols, rows, score };
  }
  return best;
};

export const N = (shape, x, y, w, h, role, idx, extra = {}) => ({ shape, x, y, w, h, role, idx, ...extra });

export const bullets = (g) => g.children.map((c) => `• ${c}`).join('\n');
export const fullText = (g) => (g.children.length ? `${g.text}\n${bullets(g)}` : g.text);

/** Box + arrow sizes for a row of n boxes with n-1 arrows between them */
export const boxArrowRow = (n, W, gap, arrowRatio = 0.32) => {
  const bw = (W - (n - 1) * 2 * gap) / (n + arrowRatio * (n - 1));
  return { bw, aw: bw * arrowRatio };
};

/** x of box i in a right-to-left row of boxes with arrows between (returns box x and arrow x) */
export const rtlBoxArrowX = (i, W, bw, aw, gap) => {
  const step = bw + aw + 2 * gap;
  const x = W - bw - i * step;
  return { x, arrowX: x - gap - aw };
};
