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

export const bullets = (g) => g.children.filter((c) => c).map((c) => `• ${c}`).join('\n');
export const fullText = (g) => [g.text, bullets(g)].filter((t) => t).join('\n');

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

// ---------------------------------------------------------------- lines, circles, trees

/** Straight line from (x1, y1) to (x2, y2): prst "line" box + flipH for the "/" direction. */
export const lineNode = (x1, y1, x2, y2, idx = 0, extra = {}) => ({
  shape: 'line',
  role: 'line',
  idx,
  x: Math.min(x1, x2),
  y: Math.min(y1, y2),
  w: Math.abs(x2 - x1),
  h: Math.abs(y2 - y1),
  flipH: (x2 < x1) !== (y2 < y1),
  ...extra,
});

/**
 * n points on a circle, item 0 at the top, then COUNTER-clockwise on screen (the RTL mirror of
 * PowerPoint's clockwise cycles). Angles in degrees, screen coordinates (y down).
 */
export const ringPoints = (n, cx, cy, R, startDeg = -90) =>
  Array.from({ length: n }, (_, i) => {
    const deg = startDeg - (i * 360) / n;
    const rad = (deg * Math.PI) / 180;
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad), deg };
  });

/** Rotation (deg) of a right-pointing shape travelling counter-clockwise at angle `deg` */
export const tangentRotation = (deg) => {
  const rad = (deg * Math.PI) / 180;
  return (Math.atan2(-Math.cos(rad), Math.sin(rad)) * 180) / Math.PI;
};

/** Circle size for n items on a ring inside W x H */
export const ringSizes = (n, W, H, k = null) => {
  const m = Math.min(W, H);
  const ratio = k || (n <= 2 ? 0.36 : n <= 3 ? 0.32 : n <= 5 ? 0.28 : n <= 7 ? 0.23 : 0.19);
  const d = m * ratio;
  const R = Math.max(d * 0.5, m / 2 - d / 2 - 1);
  return { d, R, cx: W / 2, cy: H / 2 };
};

export const leafCount = (node) =>
  node.children.length ? node.children.reduce((s, c) => s + leafCount(c), 0) : 1;
export const treeDepth = (node) =>
  1 + (node.children.length ? Math.max(...node.children.map(treeDepth)) : 0);

/**
 * Tree placement. dir 'down': levels are rows (root on top), siblings RIGHT-to-LEFT.
 * dir 'left': levels are columns from the RIGHT edge, siblings top-to-bottom.
 * Returns [{ node, depth, cx, cy, w, h, parent }] with boxes sized by `boxRatio`.
 */
export const placeTree = (roots, W, H, dir = 'down', boxRatio = 0.62, crossRatio = 0.86) => {
  const D = Math.max(...roots.map(treeDepth));
  const leaves = roots.reduce((s, r) => s + leafCount(r), 0);
  const out = [];
  if (dir === 'down') {
    const rowH = H / D;
    const unit = W / leaves;
    const bw = Math.min(unit * crossRatio, W * 0.34);
    const bh = rowH * boxRatio;
    const place = (node, right, depth, parent) => {
      const span = leafCount(node) * unit;
      const p = { node, depth, cx: right - span / 2, cy: depth * rowH + bh / 2, w: bw, h: bh, parent };
      out.push(p);
      let cursor = right;
      node.children.forEach((c) => {
        place(c, cursor, depth + 1, p);
        cursor -= leafCount(c) * unit;
      });
    };
    let cursor = W;
    roots.forEach((r) => {
      place(r, cursor, 0, null);
      cursor -= leafCount(r) * unit;
    });
  } else {
    const colW = W / D;
    const unit = H / leaves;
    const bw = colW * boxRatio;
    const bh = Math.min(unit * crossRatio, H * 0.34);
    const place = (node, top, depth, parent) => {
      const span = leafCount(node) * unit;
      const p = { node, depth, cx: W - depth * colW - bw / 2, cy: top + span / 2, w: bw, h: bh, parent };
      out.push(p);
      let cursor = top;
      node.children.forEach((c) => {
        place(c, cursor, depth + 1, p);
        cursor += leafCount(c) * unit;
      });
    };
    let cursor = 0;
    roots.forEach((r) => {
      place(r, cursor, 0, null);
      cursor += leafCount(r) * unit;
    });
  }
  return out;
};

/** Org-chart elbow lines (parent -> bar -> children) for placements from placeTree */
export const elbowLines = (placed, dir = 'down') => {
  const lines = [];
  placed.forEach((p) => {
    const kids = placed.filter((q) => q.parent === p);
    if (!kids.length) return;
    if (dir === 'down') {
      const yTop = p.cy + p.h / 2;
      const yBottom = Math.min(...kids.map((k) => k.cy - k.h / 2));
      const midY = (yTop + yBottom) / 2;
      lines.push(lineNode(p.cx, yTop, p.cx, midY));
      const xs = kids.map((k) => k.cx);
      if (kids.length > 1) lines.push(lineNode(Math.max(...xs), midY, Math.min(...xs), midY));
      else if (Math.abs(kids[0].cx - p.cx) > 0.5) lines.push(lineNode(p.cx, midY, kids[0].cx, midY));
      kids.forEach((k) => lines.push(lineNode(k.cx, midY, k.cx, k.cy - k.h / 2)));
    } else {
      const xFrom = p.cx - p.w / 2;
      const xTo = Math.max(...kids.map((k) => k.cx + k.w / 2));
      const midX = (xFrom + xTo) / 2;
      lines.push(lineNode(xFrom, p.cy, midX, p.cy));
      const ys = kids.map((k) => k.cy);
      if (kids.length > 1) lines.push(lineNode(midX, Math.min(...ys), midX, Math.max(...ys)));
      else if (Math.abs(kids[0].cy - p.cy) > 0.5) lines.push(lineNode(midX, p.cy, midX, kids[0].cy));
      kids.forEach((k) => lines.push(lineNode(midX, k.cy, k.cx + k.w / 2, k.cy)));
    }
  });
  return lines;
};

/** Direct parent -> child lines (box edge to box edge) */
export const directLines = (placed, dir = 'down') =>
  placed
    .filter((p) => p.parent)
    .map((p) =>
      dir === 'down'
        ? lineNode(p.parent.cx, p.parent.cy + p.parent.h / 2, p.cx, p.cy - p.h / 2)
        : lineNode(p.parent.cx - p.parent.w / 2, p.parent.cy, p.cx + p.w / 2, p.cy)
    );
