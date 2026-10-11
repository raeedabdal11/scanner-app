// Font catalog for the PowerPoint editor.
//
// Kurdish / Arabic-script fonts are listed in three groups:
//  - 'recommended': contain every Kurdish letter (ی ێ ۆ ڕ ڵ ە ک گ پ چ ژ ڤ). Either bundled Unicode
//    Kurdish fonts (customFonts.js, drawn for real) or Windows fonts that exist in PowerPoint (on
//    Android those are drawn with the closest available family, `display`).
//  - 'bundled': TTFs in assets/font (loaded by App.js) with Unicode Arabic glyphs, but missing
//    ێ ۆ ڕ ڵ (those letters fall back to the system font).
//  - 'legacy': Ali-K / DTP *symbol* fonts in assets/font. Their glyphs live in the private-use area
//    (U+F200–U+F2FE), so Unicode Kurdish text is drawn with the system font. They stay listed
//    because users picked them in older versions.
// PPTX export always writes `exportName` into <a:latin>/<a:ea>/<a:cs>.

import { CUSTOM_KURDISH_FONTS } from './customFonts';

export const KURDISH_SAMPLE_TEXT = 'کوردستان ئەلفوبێ';
export const LATIN_SAMPLE_TEXT = 'English 123';

// Families the app can actually draw on Android
const APP_SANS = 'Vazirmatn';
const SYS_SANS = 'sans-serif';
const SYS_SERIF = 'serif';

export const KURDISH_FONT_GROUPS = [
  { key: 'recommended', title: 'پێشنیارکراو — هەموو پیتە کوردییەکانی تێدایە' },
  { key: 'bundled', title: 'فۆنتەکانی ناو ئەپ — هەندێک پیتی کوردی نییە' },
  { key: 'legacy', title: 'فۆنتە کۆنەکان — دەقی یونیکۆد بە فۆنتی سیستەم دەردەکەوێت' },
];

const LEGACY_SYMBOL_FONTS = [
  ['ShBnaushKurdish', 'Ali_K_Khalid', 'شێنێ - بنەوش'],
  ['ShHalalaKurdish', 'Ali_K_Jiddah', 'شێنێ - هەڵاڵە'],
  ['ShHeroKurdish', 'Ali_k_kanaqen', 'شێنێ - هێرۆ'],
  ['ShKhunchaKurdish', 'Ali_K_Azzam', 'شێنێ - خونچە'],
  ['ShKnerKurdish', 'Ali_k_Sayid', 'شێنێ - کنێر'],
  ['ShNergzKurdish', 'Ali_K_Sharif bold', 'شێنێ - نێرگز'],
  ['ShReihanKurdish', 'Ali_K_Sahifa', 'شێنێ - ڕەیحان'],
  ['ShShilanKurdish', 'Ali_K_Sharif', 'شێنێ - شێلان'],
  ['ShShlerKurdish', 'Ali_K_Sulaimania', 'شێنێ - شلێر'],
  ['ShSunbulKurdish', 'Ali_K_Traditional', 'شێنێ - سنبل'],
  ['ShSusanKurdish', 'Ali_K_Alwand', 'شێنێ - سوسن'],
  ['ShYasmeenKurdish', 'Old Antic Bold', 'شێنێ - یاسمین'],
  ['ShShamamKurdish', 'Old Antic Decorative', 'شێنێ - شمام'],
  ['Dtpkn0ms', 'DTP Kurdish Naskh S Em', 'نووسخی دێکۆتایپ ١'],
  ['Dtpkn0s', 'DTP Kurdish Naskh S', 'نووسخی دێکۆتایپ ٢'],
  ['Dtpkn0sn', 'DTP Kurdish Naskh S En', 'نووسخی دێکۆتایپ ٣'],
  ['Pgdnaskh', 'PG-DTP Kurdish Naskh Em', 'پێشمەرگە - نووسخی دێکۆتایپ'],
  ['PgKnask', 'PG Kurdish Naskh S Em', 'پێشمەرگە - نووسخ'],
];

const customFont = (id, badge = 'کوردی') => {
  const f = CUSTOM_KURDISH_FONTS.find((c) => c.id === id);
  return { name: f.id, exportName: f.family, label: f.label, badge, display: f.id, group: 'recommended' };
};
const MS = (name, label, badge, display) => ({ name, exportName: name, label, badge, display, group: 'recommended' });

// Most popular first
const POPULAR_KURDISH = [
  customFont('Rudaw', 'پێشنیارکراو'),
  customFont('UniShlerSamik', 'پێشنیارکراو'),
  customFont('UniShlerKhaldar'),
  customFont('UniShlerKufy'),
  MS('Tahoma', 'تەهۆما', 'پێشنیارکراو', SYS_SANS),
  customFont('SarchiaAli'),
  { name: 'Vazirmatn', exportName: 'Vazirmatn', label: 'وەزیرمەتن', badge: 'ناو ئەپ', display: APP_SANS, group: 'recommended' },
  customFont('UnikurdWeb'),
  customFont('UnikurdGoran'),
  customFont('UnikurdNaske'),
  MS('Arial', 'ئێریاڵ', 'ویندۆز', SYS_SANS),
  MS('Segoe UI', 'سیگۆ', 'ویندۆز', SYS_SANS),
  MS('Calibri', 'کالیبری', 'ویندۆز', SYS_SANS),
  MS('Times New Roman', 'تایمز نیو ڕۆمان', 'ویندۆز', SYS_SERIF),
  MS('Simplified Arabic', 'نەسخی سادە', 'ویندۆز', SYS_SERIF),
  MS('Sakkal Majalla', 'سەککال مەجەللە', 'ویندۆز', SYS_SERIF),
  MS('Arabic Typesetting', 'نەسخی چاپ', 'ویندۆز', SYS_SERIF),
];
const OTHER_CUSTOM_KURDISH = CUSTOM_KURDISH_FONTS
  .filter((c) => !POPULAR_KURDISH.some((p) => p.name === c.id))
  .map((c) => customFont(c.id));

export const KURDISH_FONTS = [
  ...POPULAR_KURDISH,
  ...OTHER_CUSTOM_KURDISH,

  { name: 'ShBaibwnKurdish', exportName: '00 Sh-Baibwn Kurdish', label: 'شێنێ - بەیبوون', badge: 'ناو ئەپ', display: 'ShBaibwnKurdish', group: 'bundled' },
  { name: 'ShKhaldarKurdish', exportName: '!16 Sh-Khaldar Kurdish', label: 'شێنێ - خاڵدار', badge: 'ناو ئەپ', display: 'ShKhaldarKurdish', group: 'bundled' },
  { name: 'ShSharifKurdish', exportName: '!00 Sh-Sharif Kurdish', label: 'شێنێ - شەریف', badge: 'ناو ئەپ', display: 'ShSharifKurdish', group: 'bundled' },
  { name: 'ShSamikKurdish', exportName: '!02 Sh-Samik Kurdish', label: 'شێنێ - سمک', badge: 'ناو ئەپ', display: 'ShSamikKurdish', group: 'bundled' },

  ...LEGACY_SYMBOL_FONTS.map(([name, exportName, label]) => ({
    name, exportName, label, badge: 'کۆن', display: name, group: 'legacy',
  })),
];

// Latin fonts (used for English letters / numbers inside a run). None of them is bundled, so on
// Android they are drawn with the closest system family.
export const ENGLISH_FONTS = [
  { name: 'Calibri', exportName: 'Calibri', label: 'کالیبری', badge: 'پێشنیارکراو', display: SYS_SANS },
  { name: 'Arial', exportName: 'Arial', label: 'ئێریاڵ', badge: 'پێشنیارکراو', display: SYS_SANS },
  { name: 'Segoe UI', exportName: 'Segoe UI', label: 'سیگۆ', badge: 'پێشنیارکراو', display: SYS_SANS },
  { name: 'Tahoma', exportName: 'Tahoma', label: 'تەهۆما', badge: '', display: SYS_SANS },
  { name: 'Times New Roman', exportName: 'Times New Roman', label: 'تایمز نیو ڕۆمان', badge: '', display: SYS_SERIF },
  { name: 'Georgia', exportName: 'Georgia', label: 'جۆرجیا', badge: '', display: SYS_SERIF },
  { name: 'Verdana', exportName: 'Verdana', label: 'ڤێردانا', badge: '', display: SYS_SANS },
  { name: 'Trebuchet MS', exportName: 'Trebuchet MS', label: 'تریبوچێت', badge: '', display: SYS_SANS },
  { name: 'Courier New', exportName: 'Courier New', label: 'کوریەر نیو', badge: '', display: 'monospace' },
  { name: 'Inter', exportName: 'Inter', label: 'ئینتەر', badge: '', display: SYS_SANS },
  { name: 'Roboto', exportName: 'Roboto', label: 'ڕۆبۆتۆ', badge: 'ئەندرۆید', display: SYS_SANS },
];

// Hidden: kept only for documents created with older versions.
export const LEGACY_FONTS = [
  { name: 'Noto Naskh Arabic', exportName: 'Noto Naskh Arabic', display: SYS_SERIF },
  { name: 'Noto Sans Arabic', exportName: 'Noto Sans Arabic', display: SYS_SANS },
  { name: 'Traditional Arabic', exportName: 'Traditional Arabic', display: SYS_SERIF },
  { name: 'Dubai', exportName: 'Dubai', display: SYS_SANS },
];

const ALL_FONTS = [...KURDISH_FONTS, ...ENGLISH_FONTS, ...LEGACY_FONTS];

const findFont = (fontName) =>
  ALL_FONTS.find((f) => f.name === fontName) ||
  ALL_FONTS.find((f) => f.exportName === fontName);

/**
 * Returns the real Windows font family name for PPTX export (<a:latin>/<a:ea>/<a:cs> typeface).
 */
export const getExportFontFamily = (fontName, isKurdish = true) => {
  if (!fontName) return isKurdish ? 'Tahoma' : 'Calibri';
  const match = findFont(fontName);
  if (match) return match.exportName;
  return fontName;
};

/**
 * Returns the font family the app can really draw on Android for a stored font name
 * (canvas, preview, thumbnails, PDF). Unknown names fall back to the system sans-serif.
 */
export const getDisplayFontFamily = (fontName) => {
  if (!fontName) return SYS_SANS;
  const match = findFont(fontName);
  return match ? match.display : SYS_SANS;
};

/**
 * CSS font-family stack for the PDF renderer (Vazirmatn is embedded there with @font-face).
 */
export const getCssFontStack = (fontName) => {
  const display = getDisplayFontFamily(fontName);
  if (display === SYS_SERIF) return 'serif';
  if (display === 'monospace') return 'monospace';
  if (display === SYS_SANS) return 'sans-serif';
  // Vazirmatn and the bundled TTFs (embedded in the PDF with @font-face)
  return `'${display}', sans-serif`;
};
