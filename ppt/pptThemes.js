// Professional slide themes for the "دیزاین" tab.
//
// Applying a theme:
// - sets the slide background (solid / gradient),
// - replaces the theme's decorative shapes (elements flagged `themeDecor`) — user content is
//   never deleted or moved,
// - restyles text runs (color + Kurdish font) and the element font size, but only where the user
//   has not styled them manually. A value counts as "theme controlled" when it is still a stock
//   layout default or equals what the previous theme applied (`elem.themeStyle`).

import { makeSlideBackgroundPatch } from './slideBackground';
import { getElementRuns } from './formattedText';
import { makeId } from './makeId';

export const PPT_THEMES = [
  {
    key: 'classic_white',
    name: 'کلاسیکی سپی',
    background: { type: 'solid', color: '#ffffff' },
    titleColor: '#1f2937',
    textColor: '#374151',
    accent: '#8B3A2B',
    accent2: '#d6c7b8',
    titleSize: 40,
    bodySize: 20,
    titleFont: 'Times New Roman',
    bodyFont: 'Tahoma',
    decor: 'underline',
  },
  {
    key: 'dark_night',
    name: 'شەوی تاریک',
    background: { type: 'solid', color: '#111827' },
    titleColor: '#f9fafb',
    textColor: '#d1d5db',
    accent: '#38bdf8',
    accent2: '#6366f1',
    titleSize: 40,
    bodySize: 20,
    titleFont: 'Vazirmatn',
    bodyFont: 'Segoe UI',
    decor: 'bar',
  },
  {
    key: 'corporate_blue',
    name: 'شینی کۆمپانیا',
    background: { type: 'solid', color: '#f4f7fb' },
    titleColor: '#1f497d',
    textColor: '#334155',
    accent: '#1f497d',
    accent2: '#4bacc6',
    titleSize: 38,
    bodySize: 20,
    titleFont: 'Segoe UI',
    bodyFont: 'Tahoma',
    decor: 'bar',
  },
  {
    key: 'nature_green',
    name: 'سەوزی سروشت',
    background: { type: 'gradient', color: '#f0fdf4', color2: '#dcfce7', angle: 90 },
    titleColor: '#14532d',
    textColor: '#1f3d2b',
    accent: '#16a34a',
    accent2: '#84cc16',
    titleSize: 40,
    bodySize: 20,
    titleFont: 'Sakkal Majalla',
    bodyFont: 'Arial',
    decor: 'corner',
  },
  {
    key: 'royal_gold',
    name: 'زێڕینی شاهانە',
    background: { type: 'gradient', color: '#1c1917', color2: '#3f2d14', angle: 135 },
    titleColor: '#facc15',
    textColor: '#f5ecd7',
    accent: '#d4a017',
    accent2: '#8a6d1d',
    titleSize: 42,
    bodySize: 20,
    titleFont: 'Arabic Typesetting',
    bodyFont: 'Times New Roman',
    decor: 'corner',
  },
  {
    key: 'modern_purple',
    name: 'مۆری مۆدێرن',
    background: { type: 'gradient', color: '#2e1065', color2: '#7c3aed', angle: 45 },
    titleColor: '#ffffff',
    textColor: '#ede9fe',
    accent: '#f472b6',
    accent2: '#c4b5fd',
    titleSize: 42,
    bodySize: 20,
    titleFont: 'Vazirmatn',
    bodyFont: 'Vazirmatn',
    decor: 'underline',
  },
  {
    key: 'warm_orange',
    name: 'پرتەقاڵی گەرم',
    background: { type: 'solid', color: '#fff7ed' },
    titleColor: '#9a3412',
    textColor: '#431407',
    accent: '#f97316',
    accent2: '#fdba74',
    titleSize: 40,
    bodySize: 20,
    titleFont: 'Calibri',
    bodyFont: 'Tahoma',
    decor: 'bar',
  },
  {
    key: 'minimal_gray',
    name: 'خۆڵەمێشی مینیماڵ',
    background: { type: 'solid', color: '#f5f5f5' },
    titleColor: '#262626',
    textColor: '#525252',
    accent: '#737373',
    accent2: '#d4d4d4',
    titleSize: 36,
    bodySize: 18,
    titleFont: 'Segoe UI',
    bodyFont: 'Segoe UI',
    decor: 'underline',
  },
  {
    key: 'ocean_gradient',
    name: 'گرادیێنتی زەریا',
    background: { type: 'gradient', color: '#0e7490', color2: '#1e3a8a', angle: 90 },
    titleColor: '#ffffff',
    textColor: '#e0f2fe',
    accent: '#67e8f9',
    accent2: '#38bdf8',
    titleSize: 42,
    bodySize: 20,
    titleFont: 'Vazirmatn',
    bodyFont: 'Arial',
    decor: 'corner',
  },
  {
    key: 'kurdistan',
    name: 'کوردستانی',
    background: { type: 'solid', color: '#ffffff' },
    titleColor: '#b91c1c',
    textColor: '#1f2937',
    accent: '#ed2024',
    accent2: '#278e43',
    sun: '#febd11',
    titleSize: 40,
    bodySize: 20,
    titleFont: 'Simplified Arabic',
    bodyFont: 'Tahoma',
    decor: 'flag',
  },
];

export const getThemeByKey = (key) => PPT_THEMES.find((t) => t.key === key) || null;

// Text colors used by the stock layouts — treated as "not manually chosen".
const STOCK_TEXT_COLORS = new Set([
  '#1c1c1e', '#333333', '#444', '#444444', '#555555', '#666666', '#d24726',
  '#007aff', '#30d158', '#af52de', '#ff453a', '#ff9500',
]);
const STOCK_FONTS = new Set(['', 'Tahoma']);

const lc = (c) => (typeof c === 'string' ? c.trim().toLowerCase() : '');

const isTitleElement = (elem) =>
  elem.fontWeight === 'bold' || (elem.y || 0) < 20 || (elem.fontSize && elem.fontSize >= 24);

const makeDecor = (shapeType, x, y, width, height, fill, extra = {}) => {
  return {
    id: makeId('decor'),
    type: 'shape',
    shapeType,
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    width: Math.round(width * 10) / 10,
    height: Math.round(height * 10) / 10,
    rotation: 0,
    fill,
    outline: { color: fill, width: 0 },
    opacity: 1.0,
    cornerRadius: 0,
    locked: true,
    zIndex: 1,
    themeDecor: true,
    ...extra,
  };
};

// Decorative shapes for a theme (percent coordinates, RTL: accents sit on the right side).
const buildDecor = (theme, slide) => {
  const elements = (slide.elements || []).filter((e) => !e.themeDecor);
  if (theme.decor === 'bar') {
    return [
      makeDecor('rect', 97, 0, 3, 100, theme.accent),
      makeDecor('rect', 0, 97, 97, 3, theme.accent2),
    ];
  }
  if (theme.decor === 'corner') {
    return [
      makeDecor('rect', 78, 3, 19, 1.6, theme.accent),
      makeDecor('rect', 95.6, 3, 1.4, 26, theme.accent),
      makeDecor('rect', 3, 95.4, 19, 1.6, theme.accent2),
      makeDecor('rect', 3, 71, 1.4, 26, theme.accent2),
    ];
  }
  if (theme.decor === 'flag') {
    return [
      makeDecor('rect', 0, 0, 100, 2.4, theme.accent),
      makeDecor('rect', 0, 97.6, 100, 2.4, theme.accent2),
      makeDecor('ellipse', 92, 5, 5, 8.9, theme.sun),
    ];
  }
  // 'underline': a short accent line under the title + a thin bottom rule
  const title = elements
    .filter((e) => e.type === 'text' && isTitleElement(e))
    .sort((a, b) => (a.y || 0) - (b.y || 0))[0];
  let lineY = 22;
  let lineX = 35;
  let lineW = 30;
  if (title) {
    lineY = Math.min(94, (title.y || 0) + (title.height || 15) + 0.5);
    lineW = Math.max(10, Math.min(40, (title.width || 60) * 0.35));
    lineX = Math.max(0, Math.min(100 - lineW, (title.x || 0) + ((title.width || 60) - lineW) / 2));
  }
  return [
    makeDecor('rect', lineX, lineY, lineW, 1.2, theme.accent),
    makeDecor('rect', 0, 98.5, 100, 1.5, theme.accent2),
  ];
};

const applyThemeToText = (elem, theme) => {
  const role = isTitleElement(elem) ? 'title' : 'body';
  const color = role === 'title' ? theme.titleColor : theme.textColor;
  const font = role === 'title' ? theme.titleFont : theme.bodyFont;
  const size = role === 'title' ? theme.titleSize : theme.bodySize;
  const prev = elem.themeStyle || null;

  const runs = getElementRuns(elem).map((run) => {
    const next = { ...run };
    const runColor = lc(run.color);
    if (STOCK_TEXT_COLORS.has(runColor) || (prev && runColor === lc(prev.color))) {
      next.color = color;
    }
    const runFont = run.kurdishFont || run.kuFont || '';
    if (STOCK_FONTS.has(runFont) || (prev && runFont === prev.font)) {
      next.kuFont = font;
      delete next.kurdishFont;
    }
    return next;
  });

  const { color: _legacyColor, ...rest } = elem;
  const updated = { ...rest, runs, themeStyle: { color, font, fontSize: size } };
  const elemFont = elem.kurdishFont || '';
  if (STOCK_FONTS.has(elemFont) || (prev && elemFont === prev.font)) {
    updated.kurdishFont = font;
  }
  const sizeIsThemeControlled =
    elem.fontMode !== 'manual' || (prev && elem.fontSize === prev.fontSize);
  if (sizeIsThemeControlled) {
    updated.fontSize = size;
  }
  return updated;
};

// Styles one newly added element like the rest of a themed slide (no decor changes).
export const applyThemeToNewElement = (elem, theme) =>
  elem && theme && elem.type === 'text' ? applyThemeToText(elem, theme) : elem;

// Returns a new slide with the theme applied (content kept in place, decor replaced).
export const applyThemeToSlide = (slide, theme) => {
  if (!slide || !theme) return slide;
  const userElements = (slide.elements || []).filter((e) => !e.themeDecor);
  const styledElements = userElements.map((e) => (e.type === 'text' ? applyThemeToText(e, theme) : e));
  const decor = buildDecor(theme, { ...slide, elements: userElements });
  return {
    ...slide,
    ...makeSlideBackgroundPatch(theme.background),
    themeKey: theme.key,
    // Decor first in the array so it renders/exports behind content with the same zIndex
    elements: [...decor, ...styledElements],
  };
};

// Sample slide (title + two lines of Kurdish text) for the live theme thumbnails.
export const buildThemeSampleSlide = (theme) =>
  applyThemeToSlide(
    {
      id: `theme_sample_${theme.key}`,
      layout: 'title',
      background: '#ffffff',
      elements: [
        {
          id: `sample_title_${theme.key}`,
          type: 'text',
          x: 8, y: 18, width: 84, height: 22, zIndex: 2,
          text: 'سەردێڕی سلاید',
          fontMode: 'auto', fontWeight: 'bold', textAlign: 'center', writingDirection: 'rtl',
          lineSpacing: 1.2, color: '#1c1c1e',
        },
        {
          id: `sample_body_${theme.key}`,
          type: 'text',
          x: 12, y: 50, width: 76, height: 30, zIndex: 2,
          text: 'دێڕی یەکەمی نووسین لێرەیە\nدێڕی دووەمی نووسین لێرەیە',
          fontMode: 'auto', fontWeight: 'normal', textAlign: 'center', writingDirection: 'rtl',
          lineSpacing: 1.3, color: '#1c1c1e',
        },
      ],
    },
    theme
  );
