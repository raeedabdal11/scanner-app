// Shared slide background model (pure JS — used by the canvas, preview, PDF and PPTX export).
//
// A slide keeps its legacy `background` color string. A custom background is stored in
// `slide.bgFill`:
//   { type: 'solid',    color }
//   { type: 'gradient', color, color2, angle }   angle: 0 | 45 | 90 | 135 (PowerPoint convention:
//                                                0 = left→right, 90 = top→bottom, clockwise)
//   { type: 'image',    uri, overlay }           uri: JPEG pre-cropped to the slide aspect,
//                                                overlay: 0..70 (% black on top of the image)

export const DEFAULT_SLIDE_BG = '#ffffff';
export const GRADIENT_ANGLES = [0, 45, 90, 135];
export const MAX_BG_OVERLAY = 70;

const isHexColor = (c) => typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c.trim());

export const normalizeHexColor = (c, fallback = DEFAULT_SLIDE_BG) => {
  if (!isHexColor(c)) return fallback;
  let h = c.trim().replace('#', '').toLowerCase();
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  return `#${h}`;
};

// Returns a normalized background description for any slide (old or new).
export const getSlideBackground = (slide) => {
  const baseColor = (slide && slide.background) || DEFAULT_SLIDE_BG;
  const fill = slide && slide.bgFill;
  if (fill && fill.type === 'gradient') {
    return {
      type: 'gradient',
      color: fill.color || baseColor,
      color2: fill.color2 || '#000000',
      angle: GRADIENT_ANGLES.includes(fill.angle) ? fill.angle : 90,
    };
  }
  if (fill && fill.type === 'image' && fill.uri) {
    return {
      type: 'image',
      uri: fill.uri,
      overlay: Math.max(0, Math.min(MAX_BG_OVERLAY, Math.round(fill.overlay || 0))),
      color: baseColor,
    };
  }
  return { type: 'solid', color: (fill && fill.type === 'solid' && fill.color) || baseColor };
};

// Returns the slide patch that stores a background description (one undo-able step).
export const makeSlideBackgroundPatch = (bg) => {
  if (!bg || bg.type === 'solid') {
    const color = normalizeHexColor(bg && bg.color);
    return { background: color, bgFill: null };
  }
  if (bg.type === 'gradient') {
    const color = normalizeHexColor(bg.color);
    return {
      background: color,
      bgFill: {
        type: 'gradient',
        color,
        color2: normalizeHexColor(bg.color2, '#000000'),
        angle: GRADIENT_ANGLES.includes(bg.angle) ? bg.angle : 90,
      },
    };
  }
  return {
    background: '#000000',
    bgFill: {
      type: 'image',
      uri: bg.uri,
      overlay: Math.max(0, Math.min(MAX_BG_OVERLAY, Math.round(bg.overlay || 0))),
    },
  };
};

// Gradient line endpoints in user space for a W×H box (CSS linear-gradient semantics:
// the line passes through the center and its length makes the corners hit 0% / 100%).
export const gradientLineCoords = (angleDeg, w, h) => {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const cx = w / 2;
  const cy = h / 2;
  return {
    x1: cx - dx * half,
    y1: cy - dy * half,
    x2: cx + dx * half,
    y2: cy + dy * half,
  };
};

// CSS background for the PDF renderer. imageDataUri is the embedded JPEG for image backgrounds.
export const getBackgroundCss = (bg, imageDataUri = null) => {
  if (bg.type === 'gradient') {
    return `background-color: ${bg.color}; background-image: linear-gradient(${bg.angle + 90}deg, ${bg.color}, ${bg.color2});`;
  }
  if (bg.type === 'image' && imageDataUri) {
    return `background-color: #000000; background-image: url('${imageDataUri}'); background-size: cover; background-position: center; background-repeat: no-repeat;`;
  }
  return `background-color: ${bg.color};`;
};
