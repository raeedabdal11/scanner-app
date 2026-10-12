// SmartArt "Relationship" layouts (Kurdish names in the UI, PowerPoint names in the comments).
// Venn circles use the 'venn' role: semi-transparent fills (alpha in <a:srgbClr> / rgba on screen).
// Two-sided layouts put item 0 on the RIGHT.
import { N, gapOf, colSlots, fullText, ringPoints, lineNode } from './layoutKit';

const Rl = (id, name, desc, build, approx = false) => ({ id, category: 'relationship', name, desc, build, approx });

// First two groups; extra groups are folded into the second as bullet lines
const twoSides = (groups) => {
  const a = groups[0] || { text: '', children: [] };
  const b = groups[1] || { text: '', children: [] };
  const extra = groups.slice(2).map((g) => g.text);
  return [a, { text: b.text, children: [...b.children, ...extra] }];
};

// n overlapping circles around the center + labels pushed outwards
const vennRing = (groups, W, H, centerItem = false) => {
  const out = [];
  const m = Math.min(W, H);
  const cx = W / 2;
  const cy = H / 2;
  let ring = groups;
  if (centerItem) {
    const dc = m * 0.42;
    ring = groups.slice(1);
    const n = Math.max(1, ring.length);
    const r = m * (n <= 4 ? 0.2 : n <= 6 ? 0.17 : 0.14);
    const R = dc / 2 + r * 0.55;
    out.push(N('ellipse', cx - dc / 2, cy - dc / 2, dc, dc, 'venn', 0, { alpha: 70 }));
    out.push(N('rect', cx - dc * 0.35, cy - dc * 0.2, dc * 0.7, dc * 0.4, 'text', 0, { text: fullText(groups[0]), align: 'center', textGroup: 'center' }));
    if (ring.length === 0) return out; // only the center item
    ringPoints(n, cx, cy, R).forEach((p, i) => {
      out.push(N('ellipse', p.x - r, p.y - r, 2 * r, 2 * r, 'venn', i + 1));
      const rad = (p.deg * Math.PI) / 180;
      const lx = p.x + Math.cos(rad) * r * 0.35;
      const ly = p.y + Math.sin(rad) * r * 0.35;
      out.push(N('rect', lx - r * 0.7, ly - r * 0.4, r * 1.4, r * 0.8, 'text', i + 1, { text: ring[i].text, align: 'center' }));
    });
    return out;
  }
  const n = ring.length;
  const r = n === 1 ? m * 0.4 : m * (n <= 3 ? 0.3 : n <= 5 ? 0.26 : 0.21);
  const R = n === 1 ? 0 : r * (n <= 3 ? 0.62 : 0.8);
  ringPoints(n, cx, cy, R).forEach((p, i) => {
    out.push(N('ellipse', p.x - r, p.y - r, 2 * r, 2 * r, 'venn', i));
  });
  ringPoints(n, cx, cy, n === 1 ? 0 : R + r * 0.42).forEach((p, i) => {
    out.push(N('rect', p.x - r * 0.62, p.y - r * 0.36, r * 1.24, r * 0.72, 'text', i, { text: fullText(ring[i]), align: 'center' }));
  });
  return out;
};

// Concentric rings (item 0 = outermost) on the left; labels on the right with leader lines
const target = (groups, W, H, listBoxes) => {
  const n = groups.length;
  const out = [];
  const m = Math.min(H, W * 0.5);
  const cx = m / 2 + 2;
  const cy = H / 2;
  const rings = groups.map((_, i) => (m / 2) * (1 - i / (n + 0.4)));
  rings.forEach((r, i) => out.push(N('ellipse', cx - r, cy - r, 2 * r, 2 * r, 'main', i)));
  const g = gapOf(W, H);
  const lx = m + g * 3;
  colSlots(n, H, g).forEach((s, i) => {
    const ringY = cy - rings[i] + (rings[i] - (rings[i + 1] || 0)) / 2;
    out.push(lineNode(lx, s.y + s.h / 2, cx, ringY, i, { lineWidth: 1 }));
    out.push(N('rect', lx, s.y, W - lx, s.h, listBoxes ? 'sub' : 'text', i, { text: fullText(groups[i]) }));
  });
  return out;
};

const gearCluster = (groups, W, H) => {
  const m = Math.min(W, H);
  const items = groups.slice(0, 3);
  const extra = groups.slice(3).map((g) => g.text);
  const spec = [
    { shape: 'gear9', d: m * 0.56, x: W * 0.62, y: H * 0.4 },
    { shape: 'gear6', d: m * 0.42, x: W * 0.36, y: H * 0.3 },
    { shape: 'gear6', d: m * 0.38, x: W * 0.42, y: H * 0.74 },
  ];
  const out = [];
  items.forEach((gr, i) => {
    const s = spec[i];
    out.push(N(s.shape, s.x - s.d / 2, s.y - s.d / 2, s.d, s.d, 'main', i));
    const text = i === items.length - 1 && extra.length ? `${gr.text}\n${extra.join('\n')}` : gr.text;
    out.push(N('rect', s.x - s.d * 0.3, s.y - s.d * 0.2, s.d * 0.6, s.d * 0.4, 'label', i, { text, textGroup: 'gear' }));
  });
  return out;
};

export const RELATIONSHIP_LAYOUTS = [
  // Balance
  Rl('balance', 'هاوسەنگی', 'دوو لایەن لەسەر تەرازوویەک، لایەنی قورستر دادەبەزێت.', (groups, W, H) => {
    const [a, b] = twoSides(groups);
    const out = [];
    const tilt = Math.max(-8, Math.min(8, (a.children.length - b.children.length) * 3));
    out.push(N('triangle', W / 2 - W * 0.06, H * 0.72, W * 0.12, H * 0.26, 'connector', 0));
    out.push(N('rect', W * 0.05, H * 0.68, W * 0.9, H * 0.04, 'accent', 0, { rotation: -tilt }));
    [a, b].forEach((side, k) => {
      const x = k === 0 ? W * 0.55 : W * 0.05;
      const items = [side.text, ...side.children];
      colSlots(items.length, H * 0.62, gapOf(W, H) * 0.6, H * (k === 0 ? 0.02 + tilt * 0.004 : 0.02 - tilt * 0.004))
        .forEach((s, i) => {
          out.push(N('roundRect', x, s.y, W * 0.4, s.h, i === 0 ? 'main' : 'sub', k, { text: items[i], textGroup: i === 0 ? 'side' : 'sideSub' }));
        });
    });
    return out;
  }, true),

  // Converging Radial
  Rl('convergingRadial', 'تیشکی کۆبووەوە', 'بەشەکان بە تیر بەرەو ناوەندێک دەچن.', (groups, W, H) => {
    const center = groups[0];
    const sats = groups.slice(1);
    const n = Math.max(1, sats.length);
    const dc = Math.min(W, H) * 0.34;
    const cx = W / 2;
    const cy = H - dc / 2 - 2;
    const R = Math.min(W / 2, H) * 0.78;
    const bw = Math.min(W * 0.24, (Math.PI * R) / n * 0.8);
    const bh = Math.min(H * 0.2, bw * 0.6);
    const out = [N('ellipse', cx - dc / 2, cy - dc / 2, dc, dc, 'main', 0, { text: fullText(center), textGroup: 'center' })];
    sats.forEach((g, i) => {
      // Arc over the top, item 1 on the right
      const deg = n === 1 ? -90 : -10 - (i * 160) / (n - 1);
      const rad = (deg * Math.PI) / 180;
      const bx = cx + R * Math.cos(rad);
      const by = Math.max(bh / 2, cy + R * Math.sin(rad) * 0.95);
      out.push(N('roundRect', bx - bw / 2, by - bh / 2, bw, bh, 'main', i + 1, { text: fullText(g) }));
      const ax = (bx + cx) / 2;
      const ay = (by + cy) / 2;
      const len = Math.max(6, Math.hypot(cx - bx, cy - by) - dc / 2 - bh / 2 - 6);
      const rot = (Math.atan2(cy - by, cx - bx) * 180) / Math.PI;
      out.push(N('rightArrow', ax - len / 2, ay - len * 0.12, len, len * 0.24, 'connector', i + 1, { rotation: rot }));
    });
    return out;
  }, true),

  // Basic Venn
  Rl('basicVenn', 'ڤێنی سادە', 'بازنە تێکەڵەکان بە ڕەنگی نیمچە ڕوون.', (groups, W, H) => vennRing(groups, W, H)),

  // Linear Venn
  Rl('linearVenn', 'ڤێنی ڕیزکراو', 'بازنەی تێکەڵ لە ڕیزێکدا لە ڕاستەوە بۆ چەپ.', (groups, W, H) => {
    const n = groups.length;
    const d = Math.min(H * 0.95, W / (n * 0.72 + 0.28));
    const step = d * 0.72;
    const total = d + (n - 1) * step;
    const x0 = (W + total) / 2;
    const out = [];
    groups.forEach((g, i) => {
      const x = x0 - d - i * step;
      out.push(N('ellipse', x, (H - d) / 2, d, d, 'venn', i));
      out.push(N('rect', x + d * 0.18, H / 2 - d * 0.2, d * 0.64, d * 0.4, 'text', i, { text: fullText(g), align: 'center' }));
    });
    return out;
  }),

  // Stacked Venn
  Rl('stackedVenn', 'ڤێنی سەریەک', 'بازنە لەناو بازنەدا، هەموو لە خوارەوە بەیەکەوە.', (groups, W, H) => {
    const n = groups.length;
    const D = Math.min(H, W * 0.8);
    const out = [];
    const bottom = (H + D) / 2;
    const sizes = groups.map((_, i) => D * (1 - i / (n + 0.6)));
    sizes.forEach((d, i) => {
      out.push(N('ellipse', W / 2 - d / 2, bottom - d, d, d, 'venn', i, { alpha: 70 }));
    });
    sizes.forEach((d, i) => {
      const top = bottom - d;
      const nextTop = i + 1 < n ? bottom - sizes[i + 1] : bottom;
      const bandH = Math.max(6, (nextTop - top) * 0.95);
      out.push(N('rect', W / 2 - d * 0.35, top + 1, d * 0.7, bandH, 'text', i, { text: groups[i].text, align: 'center', textGroup: 'band' }));
    });
    return out;
  }),

  // Target List
  Rl('targetList', 'لیستی ئامانج', 'ئامانج لە چەپ و لیستی خاڵەکان لە ڕاست.', (groups, W, H) => target(groups, W, H, true)),

  // Basic Target
  Rl('basicTarget', 'ئامانجی سادە', 'ئەڵقەی ناوەندی و ناوی هەر ئەڵقەیەک لە تەنیشتی.', (groups, W, H) => target(groups, W, H, false)),

  // Counterbalance Arrows
  Rl('counterbalanceArrows', 'تیری هاوسەنگ', 'تیرێکی سەرەوە و تیرێکی خوارەوە لەسەر تەرازوویەک.', (groups, W, H) => {
    const [a, b] = twoSides(groups);
    return [
      N('triangle', W / 2 - W * 0.06, H * 0.55, W * 0.12, H * 0.2, 'connector', 0),
      N('rect', W * 0.1, H * 0.51, W * 0.8, H * 0.04, 'accent', 0, { rotation: -6 }),
      N('upArrow', W * 0.6, H * 0.02, W * 0.28, H * 0.46, 'main', 0, { text: fullText(a), inset: W * 0.04 }),
      N('downArrow', W * 0.12, H * 0.52, W * 0.28, H * 0.46, 'main', 1, { text: fullText(b), inset: W * 0.04 }),
    ];
  }, true),

  // Opposing Arrows
  Rl('opposingArrows', 'تیری دژ بە یەک', 'تیرێک بەرەو سەرەوە و تیرێک بەرەو خوارەوە.', (groups, W, H) => {
    const [a, b] = twoSides(groups);
    return [
      N('upArrow', W * 0.53, 0, W * 0.16, H, 'main', 0),
      N('downArrow', W * 0.31, 0, W * 0.16, H, 'main', 1),
      N('rect', W * 0.71, 0, W * 0.29, H, 'text', 0, { text: fullText(a) }),
      N('rect', 0, 0, W * 0.29, H, 'text', 1, { text: fullText(b), align: 'left' }),
    ];
  }),

  // Diverging Arrows
  Rl('divergingArrows', 'تیری لێکجیابووەوە', 'دوو تیر لە ناوەندەوە بەرەو دوو لا.', (groups, W, H) => {
    const [a, b] = twoSides(groups);
    const h = Math.min(H, W * 0.3);
    return [
      N('rightArrow', W * 0.5, (H - h) / 2, W * 0.5, h, 'main', 0, { text: fullText(a), inset: W * 0.03 }),
      N('leftArrow', 0, (H - h) / 2, W * 0.5, h, 'main', 1, { text: fullText(b), inset: W * 0.03 }),
    ];
  }),

  // Converging Arrows
  Rl('convergingArrows', 'تیری کۆبووەوە', 'دوو تیر لە دوو لاوە بەرەو ناوەند.', (groups, W, H) => {
    const [a, b] = twoSides(groups);
    const h = Math.min(H, W * 0.3);
    return [
      N('leftArrow', W * 0.51, (H - h) / 2, W * 0.49, h, 'main', 0, { text: fullText(a), inset: W * 0.03 }),
      N('rightArrow', 0, (H - h) / 2, W * 0.49, h, 'main', 1, { text: fullText(b), inset: W * 0.03 }),
    ];
  }),

  // Funnel-like relationship
  Rl('funnelRelationship', 'قیفی پەیوەندی', 'خاڵەکان لە ناو قیفێکدا تەسک دەبنەوە بۆ ئەنجامێک.', (groups, W, H) => {
    const inputs = groups.length > 1 ? groups.slice(0, -1) : groups;
    const result = groups.length > 1 ? groups[groups.length - 1] : { text: '', children: [] };
    const out = [];
    const bandsH = H * 0.7;
    const g = gapOf(W, H) * 0.5;
    colSlots(inputs.length, bandsH, g).forEach((s, i) => {
      const t0 = s.y / bandsH;
      const w = W * (0.95 - 0.55 * t0);
      // A narrowing band: trapezoid flipped upside down (wide top) -> rotation 180, text as a label
      out.push(N('trapezoid', (W - w) / 2, s.y, w, s.h, 'main', i, { rotation: 180, text: inputs[i].text, textGroup: 'band' }));
    });
    out.push(N('downArrow', W / 2 - W * 0.05, bandsH + g, W * 0.1, H * 0.1, 'connector', 0));
    out.push(N('roundRect', W * 0.3, bandsH + H * 0.12, W * 0.4, H - bandsH - H * 0.12, 'main', inputs.length, { text: fullText(result) }));
    return out;
  }, true),

  // Radial Venn
  Rl('radialVenn', 'ڤێنی تیشکی', 'بازنەیەکی ناوەندی و بازنە تێکەڵەکان بە دەوریدا.', (groups, W, H) => vennRing(groups, W, H, true)),

  // Gear-like relationship
  Rl('gearRelationship', 'چەرخی پەیوەندی', 'سێ چەرخی تێکچوو بۆ سێ لایەنی پەیوەست.', (groups, W, H) => gearCluster(groups, W, H), true),
];

