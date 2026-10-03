// Kurdish Fonts List (Assets TTFs + Safe System + PowerPoint Only)
export const KURDISH_FONTS = [
  // Safe / System
  { name: 'Tahoma', exportName: 'Tahoma', label: 'تەهۆما (Tahoma - Safe)' },
  { name: 'Arial', exportName: 'Arial', label: 'ئاریال (Arial - Safe)' },
  { name: 'Noto Naskh Arabic', exportName: 'Noto Naskh Arabic', label: 'نووسخ (Noto Naskh Arabic)' },
  { name: 'Noto Sans Arabic', exportName: 'Noto Sans Arabic', label: 'نووسخ سانس (Noto Sans Arabic)' },

  // Kurdish Custom TTF Fonts (from assets/font)
  { name: 'ShBaibwnKurdish', exportName: '00 Sh-Baibwn Kurdish', label: 'شێنێ - بەیبوون (Sh-Baibwn)' },
  { name: 'ShBnaushKurdish', exportName: 'Ali_K_Khalid', label: 'شێنێ - بنەوش (Sh-Bnaush)' },
  { name: 'ShHalalaKurdish', exportName: 'Ali_K_Jiddah', label: 'شێنێ - هەڵاڵە (Sh-Halala)' },
  { name: 'ShHeroKurdish', exportName: 'Ali_k_kanaqen', label: 'شێنێ - هێرۆ (Sh-Hero)' },
  { name: 'ShKhunchaKurdish', exportName: 'Ali_K_Azzam', label: 'شێنێ - خونچە (Sh-Khuncha)' },
  { name: 'ShKnerKurdish', exportName: 'Ali_k_Sayid', label: 'شێنێ - کنێر (Sh-Kner)' },
  { name: 'ShNergzKurdish', exportName: 'Ali_K_Sharif bold', label: 'شێنێ - نێرگز (Sh-Nergz)' },
  { name: 'ShReihanKurdish', exportName: 'Ali_K_Sahifa', label: 'شێنێ - ڕەیحان (Sh-Reihan)' },
  { name: 'ShShilanKurdish', exportName: 'Ali_K_Sharif', label: 'شێنێ - شێلان (Sh-Shilan)' },
  { name: 'ShShlerKurdish', exportName: 'Ali_K_Sulaimania', label: 'شێنێ - شلێر (Sh-Shler)' },
  { name: 'ShSunbulKurdish', exportName: 'Ali_K_Traditional', label: 'شێنێ - سنبل (Sh-Sunbul)' },
  { name: 'ShSusanKurdish', exportName: 'Ali_K_Alwand', label: 'شێنێ - سوسن (Sh-Susan)' },
  { name: 'ShYasmeenKurdish', exportName: 'Old Antic Bold', label: 'شێنێ - یاسمین (Sh-Yasmeen)' },
  { name: 'ShShamamKurdish', exportName: 'Old Antic Decorative', label: 'شێنێ - شمام (Sh-Shamam)' },
  { name: 'ShKhaldarKurdish', exportName: '!16 Sh-Khaldar Kurdish', label: 'شێنێ - خاڵدار (Sh-Khaldar)' },
  { name: 'ShSharifKurdish', exportName: '!00 Sh-Sharif Kurdish', label: 'شێنێ - شەریف (Sh-Sharif)' },
  { name: 'ShSamikKurdish', exportName: '!02 Sh-Samik Kurdish', label: 'شێنێ - سمک (Sh-Samik)' },

  { name: 'Dtpkn0ms', exportName: 'DTP Kurdish Naskh S Em', label: 'نووسخی دێکۆتایپ EM' },
  { name: 'Dtpkn0s', exportName: 'DTP Kurdish Naskh S', label: 'نووسخی دێکۆتایپ' },
  { name: 'Dtpkn0sn', exportName: 'DTP Kurdish Naskh S En', label: 'نووسخی دێکۆتایپ EN' },
  { name: 'Pgdnaskh', exportName: 'PG-DTP Kurdish Naskh Em', label: 'پێشمەرگە - نووسخی دێکۆتایپ' },
  { name: 'PgKnask', exportName: 'PG Kurdish Naskh S Em', label: 'پێشمەرگە - نووسخ' },

  // PowerPoint Only
  { name: 'Segoe UI', exportName: 'Segoe UI', label: 'سیگۆی (Segoe UI - PowerPoint only)', pptOnly: true },
  { name: 'Traditional Arabic', exportName: 'Traditional Arabic', label: 'تڕادیشناڵ عەرەبیک (Traditional Arabic - PowerPoint only)', pptOnly: true },
  { name: 'Dubai', exportName: 'Dubai', label: 'دوبەی (Dubai - PowerPoint only)', pptOnly: true },
];

// English Fonts List
export const ENGLISH_FONTS = [
  { name: 'Calibri', exportName: 'Calibri', label: 'Calibri (PowerPoint Default)' },
  { name: 'Arial', exportName: 'Arial', label: 'Arial' },
  { name: 'Times New Roman', exportName: 'Times New Roman', label: 'Times New Roman' },
  { name: 'Courier New', exportName: 'Courier New', label: 'Courier New' },
  { name: 'Georgia', exportName: 'Georgia', label: 'Georgia' },
  { name: 'Trebuchet MS', exportName: 'Trebuchet MS', label: 'Trebuchet MS' },
  { name: 'Verdana', exportName: 'Verdana', label: 'Verdana' },
  { name: 'Inter', exportName: 'Inter', label: 'Inter' },
  { name: 'Roboto', exportName: 'Roboto', label: 'Roboto' },
];

/**
 * Returns real Windows font family name for PPTX export name table lookup
 */
export const getExportFontFamily = (fontName, isKurdish = true) => {
  if (!fontName) return isKurdish ? 'Tahoma' : 'Calibri';
  const list = isKurdish ? KURDISH_FONTS : ENGLISH_FONTS;
  const match = list.find((f) => f.name === fontName || f.exportName === fontName);
  if (match) return match.exportName;
  return fontName;
};
