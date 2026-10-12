// SmartArt "Cycle" layouts (Kurdish names in the UI, PowerPoint names in the comments).
// Direction (one rule for all): item 0 at the top, then COUNTER-clockwise on screen, the mirror of
// PowerPoint's clockwise cycles, matching the right-to-left flow of the other categories.
// Arrows are small block arrows rotated along the circle (clean prstGeom + rot in PPTX).
import { N, fullText, ringPoints, tangentRotation, ringSizes, lineNode, rtlSlots, gapOf } from './layoutKit';

const C = (id, name, desc, build, approx = false) => ({ id, category: 'cycle', name, desc, build, approx });

// Items on a ring + arrows between them (shape = item shape, arrow = arrow shape or null)
const ringCycle = (groups, W, H, { shape = 'ellipse', role = 'main', arrow = 'rightArrow', sizeK, boxAspect = 1, textOf = fullText }) => {
  const n = groups.length;
  const { d, R, cx, cy } = ringSizes(n, W, H, sizeK);
  const bw = d * boxAspect;
  const pts = ringPoints(n, cx, cy, n === 1 ? 0 : R);
  const out = [];
  pts.forEach((p, i) => {
    out.push(N(shape, p.x - bw / 2, p.y - d / 2, bw, d, role, i, { text: textOf(groups[i]) }));
  });
  if (arrow && n > 1) {
    const mids = ringPoints(n, cx, cy, R, -90 - 180 / n);
    mids.forEach((m, i) => {
      if (n === 2 && i === 1) return;
      const aw = Math.min(d * 0.42, (2 * Math.PI * R) / n - d * 0.9);
      if (aw < 4) return;
      const ah = aw * 0.6;
      out.push(N(arrow, m.x - aw / 2, m.y - ah / 2, aw, ah, 'connector', i, { rotation: tangentRotation(m.deg) }));
    });
  }
  return out;
};

// A circle split into n sectors by white lines, labels inside (approximation of pie geometry)
const sectorCircle = (groups, W, H, withArrows) => {
  const n = groups.length;
  const m = Math.min(W, H);
  const r = m * 0.42;
  const cx = W / 2;
  const cy = H / 2;
  const out = [N('ellipse', cx - r, cy - r, 2 * r, 2 * r, 'main', 0)];
  if (n > 1) {
    ringPoints(n, cx, cy, r, -90 + 180 / n).forEach((p) => {
      out.push(lineNode(cx, cy, p.x, p.y, 0, { lineColor: '#ffffff', lineWidth: 2.5 }));
    });
  }
  ringPoints(n, cx, cy, n === 1 ? 0 : r * 0.58).forEach((p, i) => {
    const bw = n === 1 ? r * 1.4 : Math.min(r * 0.8, (2 * Math.PI * r * 0.58) / n);
    out.push(N('rect', p.x - bw / 2, p.y - r * 0.2, bw, r * 0.4, 'label', 0, { text: fullText(groups[i]), textGroup: 'sector' }));
  });
  if (withArrows && n > 1) {
    ringPoints(n, cx, cy, r * 1.12, -90 - 180 / n + 180 / n).forEach((p, i) => {
      const aw = Math.min(r * 0.3, (2 * Math.PI * r) / n * 0.4);
      out.push(N('rightArrow', p.x - aw / 2, p.y - aw * 0.3, aw, aw * 0.6, 'connector', i, { rotation: tangentRotation(p.deg) }));
    });
  }
  return out;
};

// Center item + satellites on a ring (center = item 0)
const radial = (groups, W, H, { connect = 'none', satShape = 'ellipse' } = {}) => {
  const center = groups[0];
  const sats = groups.slice(1);
  const n = Math.max(1, sats.length);
  const m = Math.min(W, H);
  const dc = m * 0.32;
  const ds = Math.min(m * (n <= 4 ? 0.26 : n <= 6 ? 0.22 : 0.18), m * 0.3);
  const R = m / 2 - ds / 2 - 1;
  const cx = W / 2;
  const cy = H / 2;
  const out = [];
  const pts = ringPoints(n, cx, cy, R);
  if (sats.length === 0) {
    const d = Math.min(W, H) * 0.5;
    return [N('ellipse', cx - d / 2, cy - d / 2, d, d, 'main', 0, { text: fullText(center), textGroup: 'center' })];
  }
  if (connect === 'ring') out.push(N('ellipse', cx - R, cy - R, 2 * R, 2 * R, 'ring', 0, { lineWidth: 2 }));
  if (connect === 'lines') pts.forEach((p) => out.push(lineNode(cx, cy, p.x, p.y)));
  out.push(N('ellipse', cx - dc / 2, cy - dc / 2, dc, dc, 'main', 0, { text: fullText(center), textGroup: 'center' }));
  sats.forEach((g, i) => {
    const p = pts[i];
    out.push(N(satShape, p.x - ds / 2, p.y - ds / 2, ds, ds, 'main', i + 1, { text: fullText(g) }));
    if (connect === 'arrows') {
      const deg = p.deg;
      const rad = (deg * Math.PI) / 180;
      const midR = (dc / 2 + (R - ds / 2)) / 2;
      const len = Math.max(4, R - ds / 2 - dc / 2 - 4);
      const ax = cx + midR * Math.cos(rad);
      const ay = cy + midR * Math.sin(rad);
      out.push(N('rightArrow', ax - len / 2, ay - len * 0.2, len, len * 0.4, 'connector', i + 1, { rotation: deg }));
    }
  });
  return out;
};

export const CYCLE_LAYOUTS = [
  // Basic Cycle
  C('basicCycle', 'خولگەی سادە', 'بازنەکان لەسەر خولگەیەک بە تیری نێوانیان.', (groups, W, H) =>
    ringCycle(groups, W, H, {})),

  // Text Cycle
  C('textCycle', 'خولگەی دەق', 'تەنها دەق لەسەر خولگەیەک بە تیر.', (groups, W, H) =>
    ringCycle(groups, W, H, { shape: 'rect', role: 'text', boxAspect: 1.4 })),

  // Block Cycle
  C('blockCycle', 'خولگەی بلۆکی', 'چوارگۆشەی خڕ لەسەر خولگەیەک بە تیر.', (groups, W, H) =>
    ringCycle(groups, W, H, { shape: 'roundRect', boxAspect: 1.35, sizeK: null })),

  // Nondirectional Cycle
  C('nondirectionalCycle', 'خولگەی بێ ئاراستە', 'بازنەکان لەسەر ئەڵقەیەک بێ تیر.', (groups, W, H) => {
    const { R, cx, cy } = ringSizes(groups.length, W, H);
    return [
      N('ellipse', cx - R, cy - R, 2 * R, 2 * R, 'ring', 0, { lineWidth: 2 }),
      ...ringCycle(groups, W, H, { arrow: null }),
    ];
  }),

  // Continuous Cycle
  C('continuousCycle', 'خولگەی بەردەوام', 'سندوقەکان لەسەر تیرێکی بازنەیی گەورە.', (groups, W, H) => {
    const { R, cx, cy } = ringSizes(groups.length, W, H);
    const big = R * 2.1;
    return [
      N('circularArrow', cx - big / 2, cy - big / 2, big, big, 'connector', 0, { flipH: true }),
      ...ringCycle(groups, W, H, { shape: 'roundRect', boxAspect: 1.4, arrow: null }),
    ];
  }, true),

  // Multidirectional Cycle
  C('multidirectionalCycle', 'خولگەی دوو ئاراستە', 'تیری دوو سەر لە نێوان خاڵەکان.', (groups, W, H) =>
    ringCycle(groups, W, H, { arrow: 'leftRightArrow' })),

  // Segmented Cycle
  C('segmentedCycle', 'خولگەی بەشکراو', 'بازنەیەک بەش بەش، تیر بە دەوریدا.', (groups, W, H) => sectorCircle(groups, W, H, true), true),

  // Basic Pie
  C('basicPie', 'کێکی سادە', 'بازنەیەک دابەشکراو بۆ بەشەکان.', (groups, W, H) => sectorCircle(groups, W, H, false), true),

  // Radial Cycle
  C('radialCycle', 'خولگەی تیشکی', 'خاڵی سەرەکی لە ناوەڕاست و ئەوانی تر بە دەوریدا لەسەر ئەڵقەیەک.', (groups, W, H) =>
    radial(groups, W, H, { connect: 'ring' })),

  // Basic Radial
  C('basicRadial', 'تیشکی سادە', 'ناوەند بە هێڵ بە بەشەکانەوە بەستراوە.', (groups, W, H) =>
    radial(groups, W, H, { connect: 'lines' })),

  // Diverging Radial
  C('divergingRadial', 'تیشکی بڵاوبووەوە', 'تیرەکان لە ناوەندەوە بۆ دەرەوە.', (groups, W, H) =>
    radial(groups, W, H, { connect: 'arrows', satShape: 'roundRect' })),

  // Gear (simple)
  C('gearCycle', 'چەرخەکان', 'چەرخی تێکچوو، هەر چەرخێک خاڵێک.', (groups, W, H) => {
    const n = groups.length;
    const g = gapOf(W, H);
    const slots = rtlSlots(n, W, -g * 1.2);
    const d = Math.min(H * 0.62, slots[0].w * 1.25);
    const out = [];
    slots.forEach((s, i) => {
      const big = i % 2 === 0;
      const size = big ? d : d * 0.78;
      const cx = s.x + s.w / 2;
      const cy = big ? H * 0.38 : H * 0.62;
      out.push(N(big ? 'gear9' : 'gear6', cx - size / 2, cy - size / 2, size, size, 'main', i));
      out.push(N('rect', cx - size * 0.3, cy - size * 0.22, size * 0.6, size * 0.44, 'label', i, { text: groups[i].text, textGroup: 'gear' }));
    });
    return out;
  }, true),

  // Cycle Matrix (four quadrants with a center circle)
  C('cycleMatrix', 'ماتریکسی خولگەیی', 'چوار بەش بە دەوری بازنەیەکی ناوەندیدا.', (groups, W, H) => {
    const center = groups[0];
    const rest = groups.slice(1);
    const quads = [0, 1, 2, 3].map((q) => {
      const own = rest.filter((_, i) => i % 4 === q);
      return own.length ? own.map((gr) => fullText(gr)).join('\n') : '';
    });
    const g = gapOf(W, H);
    const qw = (W - g) / 2;
    const qh = (H - g) / 2;
    // RTL order: top-right, top-left, bottom-left, bottom-right (counter-clockwise)
    // Text sits in the outer corner of each quadrant, away from the center circle
    const pos = [
      [W - qw, 0, 'right', 'top'],
      [0, 0, 'left', 'top'],
      [0, H - qh, 'left', 'bottom'],
      [W - qw, H - qh, 'right', 'bottom'],
    ];
    const out = pos.map(([x, y, align, valign], q) =>
      N('roundRect', x, y, qw, qh, 'main', q + 1, { text: quads[q], cornerRadius: 18, inset: Math.min(qw, qh) * 0.1, align, valign })
    );
    const d = Math.min(W, H) * 0.34;
    out.push(N('ellipse', W / 2 - d / 2, H / 2 - d / 2, d, d, 'sub', 0, { text: fullText(center), align: 'center', textGroup: 'center' }));
    return out;
  }, true),
];
