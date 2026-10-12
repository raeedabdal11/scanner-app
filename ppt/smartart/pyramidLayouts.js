// SmartArt "Pyramid" layouts (Kurdish names in the UI, PowerPoint names in the comments).
// Bands are made of plain prst "triangle" shapes that share the apex: the biggest triangle is drawn
// first and every smaller one covers its top part, so each band keeps its own color with exact
// geometry (no custom paths). Inverted pyramids use the same triangles rotated 180° (text is always
// a separate unrotated label). Thin white lines separate the bands.
import { N, gapOf, colSlots, fullText, lineNode } from './layoutKit';

const Py = (id, name, desc, build, approx = false) => ({ id, category: 'pyramid', name, desc, build, approx });

// Banded triangle inside (ox, oy, PW, PH); band 0 is the top band.
const bandedPyramid = (groups, ox, oy, PW, PH, inverted, labels = true) => {
  const n = groups.length;
  const bh = PH / n;
  const out = [];
  if (!inverted) {
    for (let k = n - 1; k >= 0; k--) {
      const h = (k + 1) * bh;
      const w = PW * ((k + 1) / n);
      out.push(N('triangle', ox + (PW - w) / 2, oy, w, h, 'main', k));
    }
  } else {
    for (let k = 0; k < n; k++) {
      const h = (n - k) * bh;
      const w = PW * ((n - k) / n);
      out.push(N('triangle', ox + (PW - w) / 2, oy + k * bh, w, h, 'main', k, { rotation: 180 }));
    }
  }
  for (let k = 1; k < n; k++) {
    const y = oy + k * bh;
    const wAt = inverted ? PW * ((n - k) / n) : PW * (k / n);
    out.push(lineNode(ox + (PW - wAt) / 2, y, ox + (PW + wAt) / 2, y, k, { lineColor: '#ffffff', lineWidth: 2 }));
  }
  if (labels) {
    groups.forEach((g, k) => {
      // Usable width at the band's middle height
      const mid = inverted ? (n - k - 0.5) / n : (k + 0.5) / n;
      const w = PW * mid * 0.78;
      out.push(N('rect', ox + (PW - w) / 2, oy + k * bh + bh * 0.08, w, bh * 0.84, 'label', k, { text: fullText(g), textGroup: 'band' }));
    });
  }
  return out;
};

export const PYRAMID_LAYOUTS = [
  // Basic Pyramid
  Py('basicPyramid', 'هەرەمی سادە', 'هەرەمێک بە چینی ڕەنگاوڕەنگ، سەرەکی لە سەرەوە.', (groups, W, H) => {
    const PW = Math.min(W, H * 1.35);
    return bandedPyramid(groups, (W - PW) / 2, 0, PW, H, false);
  }),

  // Inverted Pyramid
  Py('invertedPyramid', 'هەرەمی پێچەوانە', 'هەرەمێکی سەرەوژێر، پانترین چین لە سەرەوە.', (groups, W, H) => {
    const PW = Math.min(W, H * 1.35);
    return bandedPyramid(groups, (W - PW) / 2, 0, PW, H, true);
  }),

  // Pyramid List
  Py('pyramidList', 'لیستی هەرەمی', 'هەرەمێک لە پشتەوە و سندوقی دەق لەسەری.', (groups, W, H) => {
    const PW = Math.min(W * 0.6, H * 1.2);
    const out = [N('triangle', 0, 0, PW, H, 'bg', 0)];
    const g = gapOf(W, H) * 0.8;
    const n = groups.length;
    colSlots(n, H * 0.9, g, H * 0.08).forEach((s, i) => {
      // Boxes start over the pyramid's right slope and reach the right edge (RTL text side)
      const yMid = s.y + s.h / 2;
      const slopeX = PW / 2 + (PW / 2) * (yMid / H);
      const x = Math.max(PW * 0.45, slopeX - PW * 0.18);
      out.push(N('roundRect', x, s.y, W - x, s.h, 'main', i, { text: fullText(groups[i]) }));
    });
    return out;
  }),

  // Segmented Pyramid
  Py('segmentedPyramid', 'هەرەمی بەشکراو', 'هەرەمێک لە سێگۆشەی بچووک، هەر سێگۆشەیەک خاڵێک.', (groups, W, H) => {
    const n = groups.length;
    const rows = Math.max(1, Math.ceil(Math.sqrt(n)));
    const PW = Math.min(W, H * 1.15);
    const ox = (W - PW) / 2;
    const th = H / rows;
    const tw = PW / rows;
    const out = [];
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const count = 2 * r + 1;
      const rowLeft = ox + (PW - (r + 1) * tw) / 2;
      // Right to left inside each row (RTL)
      for (let k = count - 1; k >= 0; k--) {
        const up = k % 2 === 0;
        const x = rowLeft + (k * tw) / 2;
        const y = r * th;
        const has = idx < n;
        out.push(N('triangle', x, y, tw, th, has ? 'main' : 'bg', has ? idx : 0, up ? {} : { rotation: 180 }));
        if (has) {
          out.push(N('rect', x + tw * 0.2, y + (up ? th * 0.45 : th * 0.08), tw * 0.6, th * 0.45, 'label', idx, {
            text: groups[idx].text, textGroup: 'seg',
          }));
        }
        idx++;
      }
    }
    return out;
  }, true),
];
