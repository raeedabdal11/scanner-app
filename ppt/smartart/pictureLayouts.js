// SmartArt "Picture" layouts (Kurdish names in the UI, PowerPoint names in the comments).
// A 'picture' node is an image slot: { shape: rect | roundRect | ellipse, image: item.image }.
// The image is cover-cropped to the slot (crop position from the text pane). Empty slots show a
// light placeholder (plus a picture icon on the canvas only). Pictures sit on the RIGHT (RTL).
import { N, gapOf, rtlSlots, colSlots, gridDims, fullText, bullets } from './layoutKit';

const Pc = (id, name, desc, build, approx = false) => ({ id, category: 'picture', name, desc, build, approx });

const pic = (shape, x, y, w, h, g, idx) => N(shape, x, y, w, h, 'picture', idx, { image: g.image || null });

export const PICTURE_LAYOUTS = [
  // Picture Accent List
  Pc('pictureAccentList', 'لیستی وێنەی نیشانەدار', 'وێنەیەکی چوارگۆشە لە ڕاست و دەق لە چەپی.', (groups, W, H) => {
    const g = gapOf(W, H);
    const out = [];
    colSlots(groups.length, H, g).forEach((s, i) => {
      const pw = Math.min(s.h, W * 0.3);
      out.push(N('rect', 0, s.y, W - pw - g * 0.5, s.h, 'sub', i, { text: fullText(groups[i]) }));
      out.push(pic('rect', W - pw, s.y, pw, s.h, groups[i], i));
    });
    return out;
  }),

  // Bending Picture Accent List
  Pc('bendingPictureAccentList', 'لیستی وێنەی چەماوە', 'کارتی وێنە لە چەند ڕیزێکدا بە ناونیشانی ڕەنگاوڕەنگ.', (groups, W, H) => {
    const n = groups.length;
    const g = gapOf(W, H) * 1.5;
    const { cols, rows } = gridDims(n, W, H);
    const cw = (W - (cols - 1) * g) / cols;
    const ch = (H - (rows - 1) * g) / rows;
    const out = [];
    groups.forEach((gr, i) => {
      const r = Math.floor(i / cols);
      const k = i % cols;
      const x = W - (k + 1) * cw - k * g;
      const y = r * (ch + g);
      out.push(pic('rect', x, y, cw, ch * 0.78, gr, i));
      out.push(N('rect', x + cw * 0.08, y + ch * 0.62, cw * 0.84, ch * 0.38, 'main', i, { text: fullText(gr) }));
    });
    return out;
  }, true),

  // Picture Caption List
  Pc('pictureCaptionList', 'لیستی وێنە و ڕوونکردنەوە', 'وێنە لە سەرەوە و ڕوونکردنەوە لە ژێریدا.', (groups, W, H) => {
    const g = gapOf(W, H);
    const out = [];
    rtlSlots(groups.length, W, g).forEach((s, i) => {
      out.push(pic('rect', s.x, 0, s.w, H * 0.68, groups[i], i));
      out.push(N('rect', s.x, H * 0.7, s.w, H * 0.3, 'text', i, { text: fullText(groups[i]), align: 'center', valign: 'top' }));
    });
    return out;
  }),

  // Vertical Picture List
  Pc('verticalPictureList', 'لیستی وێنەی ستوونی', 'ڕیزی سندوق، هەر یەکێک وێنەیەکی بچووکی لە ڕاستە.', (groups, W, H) => {
    const g = gapOf(W, H);
    const out = [];
    colSlots(groups.length, H, g).forEach((s, i) => {
      // Background box over the full row; the text box leaves room for the picture on the right
      out.push(N('roundRect', 0, s.y, W, s.h, 'sub', i, { cornerRadius: 10 }));
      out.push(N('rect', 0, s.y, W - s.h, s.h, 'text', i, { text: fullText(groups[i]), inset: s.h * 0.12 }));
      const p = s.h * 0.78;
      out.push(pic('roundRect', W - p - s.h * 0.11, s.y + s.h * 0.11, p, p, groups[i], i));
    });
    return out;
  }),

  // Horizontal Picture List
  Pc('horizontalPictureList', 'لیستی وێنەی ئاسۆیی', 'ستوونەکان: ناونیشان، وێنە و ڕوونکردنەوە.', (groups, W, H) => {
    const g = gapOf(W, H);
    const out = [];
    rtlSlots(groups.length, W, g).forEach((s, i) => {
      out.push(N('rect', s.x, 0, s.w, H * 0.2, 'main', i, { text: groups[i].text }));
      out.push(pic('rect', s.x, H * 0.21, s.w, H * 0.46, groups[i], i));
      out.push(N('rect', s.x, H * 0.68, s.w, H * 0.32, 'sub', i, { text: bullets(groups[i]), valign: 'top' }));
    });
    return out;
  }),

  // Picture Strips
  Pc('pictureStrips', 'شریتی وێنە', 'شریتی درێژ بە وێنەیەکی بچووک لە سەر لای ڕاستی.', (groups, W, H) => {
    const g = gapOf(W, H) * 1.6;
    const out = [];
    colSlots(groups.length, H, g).forEach((s, i) => {
      const p = s.h * 1.05;
      out.push(N('rect', 0, s.y + s.h * 0.12, W - p * 0.55, s.h * 0.82, 'sub', i, { text: fullText(groups[i]) }));
      out.push(pic('rect', W - p, s.y, p, s.h, groups[i], i));
    });
    return out;
  }),

  // Titled Picture Accent List
  Pc('titledPictureAccentList', 'لیستی وێنەی ناونیشاندار', 'ناونیشانێک لە سەرەوە و وێنە و دەق لە ژێریدا.', (groups, W, H) => {
    const g = gapOf(W, H);
    const title = groups[0];
    const rest = groups.slice(1);
    const out = [N('rect', 0, 0, W, H * 0.18, 'main', 0, { text: title.text, textGroup: 'title' })];
    if (rest.length) {
      colSlots(rest.length, H * 0.8, g, H * 0.2).forEach((s, i) => {
        const p = Math.min(s.h, W * 0.22);
        out.push(pic('rect', W - p, s.y, p, s.h, rest[i], i + 1));
        out.push(N('rect', 0, s.y, W - p - g, s.h, 'text', i + 1, { text: fullText(rest[i]) }));
      });
    }
    return out;
  }),

  // Picture Grid
  Pc('pictureGrid', 'تۆڕی وێنە', 'وێنەکان لە تۆڕێکدا و ناونیشان لە ژێر هەر یەکێکیان.', (groups, W, H) => {
    const n = groups.length;
    const g = gapOf(W, H);
    const { cols, rows } = gridDims(n, W, H);
    const cw = (W - (cols - 1) * g) / cols;
    const ch = (H - (rows - 1) * g) / rows;
    const out = [];
    groups.forEach((gr, i) => {
      const r = Math.floor(i / cols);
      const k = i % cols;
      const x = W - (k + 1) * cw - k * g;
      const y = r * (ch + g);
      out.push(pic('rect', x, y, cw, ch * 0.76, gr, i));
      out.push(N('rect', x, y + ch * 0.77, cw, ch * 0.23, 'text', i, { text: gr.text, align: 'center' }));
    });
    return out;
  }),

  // Circular Picture Callout
  Pc('circularPictureCallout', 'بازنەی وێنەی ڕوونکراو', 'وێنەیەکی گەورەی بازنەیی و وێنە بچووکەکان بە دەوریدا.', (groups, W, H) => {
    const main = groups[0];
    const rest = groups.slice(1);
    const D = Math.min(H, W * 0.5) * 0.92;
    const cx = W - D / 2 - 2;
    const cy = H / 2;
    const out = [pic('ellipse', cx - D / 2, cy - D / 2, D, D, main, 0)];
    // Name band over the lower part of the big picture
    out.push(N('rect', cx - D * 0.4, cy + D * 0.18, D * 0.8, D * 0.24, 'accent', 0));
    out.push(N('rect', cx - D * 0.4, cy + D * 0.18, D * 0.8, D * 0.24, 'label', 0, { text: main.text, textGroup: 'main' }));
    const n = rest.length;
    if (n) {
      const d = Math.min(D * 0.32, (H / n) * 0.88);
      const R = D / 2 + d * 0.7;
      rest.forEach((g, i) => {
        // Arc on the LEFT of the big picture, from upper-left to lower-left (225 deg -> 135 deg)
        const deg = n === 1 ? 180 : 225 - (90 * i) / (n - 1);
        const rad = (deg * Math.PI) / 180;
        const px = cx + R * Math.cos(rad);
        const py = Math.max(d / 2, Math.min(H - d / 2, cy + R * Math.sin(rad)));
        out.push(pic('ellipse', px - d / 2, py - d / 2, d, d, g, i + 1));
        out.push(N('rect', 0, py - d / 2, Math.max(10, px - d / 2 - 6), d, 'text', i + 1, { text: fullText(g) }));
      });
    }
    return out;
  }, true),

  // Captioned Pictures
  Pc('captionedPictures', 'وێنەی بە ڕوونکردنەوە', 'هەر وێنەیەک بە سندوقێکی ڕوونکردنەوە لەسەر بەشی خوارەوەی.', (groups, W, H) => {
    const g = gapOf(W, H);
    const out = [];
    rtlSlots(groups.length, W, g).forEach((s, i) => {
      out.push(pic('rect', s.x, 0, s.w, H * 0.8, groups[i], i));
      out.push(N('rect', s.x + s.w * 0.06, H * 0.62, s.w * 0.88, H * 0.38, 'main', i, { text: fullText(groups[i]) }));
    });
    return out;
  }),

  // Picture Lineup
  Pc('pictureLineup', 'ڕیزی وێنە', 'وێنە بەرزەکان لە تەنیشت یەک و ناو لە سەر بەشی خوارەوەیان.', (groups, W, H) => {
    const out = [];
    rtlSlots(groups.length, W, 2).forEach((s, i) => {
      out.push(pic('rect', s.x, 0, s.w, H, groups[i], i));
      out.push(N('rect', s.x, H * 0.72, s.w, H * 0.28, 'main', i, { text: fullText(groups[i]) }));
    });
    return out;
  }),

  // Alternating Picture Blocks
  Pc('alternatingPictureBlocks', 'بلۆکی وێنەی ئاڵوگۆڕ', 'ڕیزەکان بە نۆرە: وێنە لە ڕاست، پاشان لە چەپ.', (groups, W, H) => {
    const g = gapOf(W, H);
    const out = [];
    colSlots(groups.length, H, g).forEach((s, i) => {
      const pw = Math.min(W * 0.36, s.h * 1.6);
      const picRight = i % 2 === 0;
      out.push(pic('rect', picRight ? W - pw : 0, s.y, pw, s.h, groups[i], i));
      out.push(N('rect', picRight ? 0 : pw + g * 0.5, s.y, W - pw - g * 0.5, s.h, 'main', i, { text: fullText(groups[i]) }));
    });
    return out;
  }),
];
