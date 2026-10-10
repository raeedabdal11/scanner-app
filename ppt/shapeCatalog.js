import React from 'react';
import Svg, { Path, Rect, Ellipse, Line, Circle, G, Polygon } from 'react-native-svg';

// --- Star Path Generator ---
export function generateStarPath(points, innerRadiusRatio = 0.45) {
  const outerR = 50;
  const innerR = outerR * innerRadiusRatio;
  const cx = 50;
  const cy = 50;
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) {
      d += `M ${x.toFixed(2)},${y.toFixed(2)}`;
    } else {
      d += ` L ${x.toFixed(2)},${y.toFixed(2)}`;
    }
  }
  return d + ' Z';
}

// --- Regular Polygon Generator ---
export function generatePolygonPath(sides) {
  const r = 50;
  const cx = 50;
  const cy = 50;
  let d = '';
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) {
      d += `M ${x.toFixed(2)},${y.toFixed(2)}`;
    } else {
      d += ` L ${x.toFixed(2)},${y.toFixed(2)}`;
    }
  }
  return d + ' Z';
}

// --- Irregular Burst / Explosion Generator ---
export function generateBurstPath(points = 8) {
  const cx = 50;
  const cy = 50;
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const isOuter = i % 2 === 0;
    const outerR = 48 + (i % 4 === 0 ? 2 : -2);
    const innerR = 25 + (i % 4 === 2 ? 5 : 0);
    const r = isOuter ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) {
      d += `M ${x.toFixed(2)},${y.toFixed(2)}`;
    } else {
      d += ` L ${x.toFixed(2)},${y.toFixed(2)}`;
    }
  }
  return d + ' Z';
}

// --- PowerPoint Shape Categories ---
export const SHAPE_CATEGORIES = [
  { id: 'lines_arrows', name: 'هێڵەکان و تیرەکان' },
  { id: 'rectangles', name: 'چوارگۆشەکان' },
  { id: 'basic_shapes', name: 'شێوە سەرەتاییەکان' },
  { id: 'math_symbols', name: 'هێما بیرکارییەکان' },
  { id: 'stars_banners', name: 'ئەستێرە و بەنەرەکان' },
  { id: 'callouts', name: 'بڵقەکانی قسەکردن' },
  { id: 'flowchart', name: 'هێڵکاری (Flowchart)' },
];

// --- Comprehensive Shape Definitions ---
export const ALL_SHAPES = [
  // ==========================================
  // 1. LINES & ARROWS (هێڵەکان و تیرەکان)
  // ==========================================
  { id: 'line', category: 'lines_arrows', name: 'هێڵ' },
  { id: 'arrow', category: 'lines_arrows', name: 'تیری هێڵی' },
  { id: 'doubleArrow', category: 'lines_arrows', name: 'تیری دووسەر' },
  { id: 'elbowConnector', category: 'lines_arrows', name: 'بەستەری زۆنگ (Elbow)', path: 'M 0,10 L 50,10 L 50,90 L 100,90' },
  { id: 'curvedConnector', category: 'lines_arrows', name: 'بەستەری چەماوە', path: 'M 0,10 C 60,10 40,90 100,90' },
  { id: 'rightArrow', category: 'lines_arrows', name: 'تیری بەرەو ڕاست', path: 'M 0,30 L 60,30 L 60,0 L 100,50 L 60,100 L 60,70 L 0,70 Z' },
  { id: 'leftArrow', category: 'lines_arrows', name: 'تیری بەرەو چەپ', path: 'M 40,0 L 0,50 L 40,100 L 40,70 L 100,70 L 100,30 L 40,30 Z' },
  { id: 'upArrow', category: 'lines_arrows', name: 'تیری بەرەو سەرەوە', path: 'M 50,0 L 100,40 L 70,40 L 70,100 L 30,100 L 30,40 L 0,40 Z' },
  { id: 'downArrow', category: 'lines_arrows', name: 'تیری بەرەو خوارەوە', path: 'M 30,0 L 70,0 L 70,60 L 100,60 L 50,100 L 0,60 L 30,60 Z' },
  { id: 'leftRightArrow', category: 'lines_arrows', name: 'تیری ڕاست و چەپ', path: 'M 0,50 L 30,0 L 30,30 L 70,30 L 70,0 L 100,50 L 70,100 L 70,70 L 30,70 L 30,100 Z' },
  { id: 'upDownArrow', category: 'lines_arrows', name: 'تیری سەرەوە و خوارەوە', path: 'M 50,0 L 100,30 L 70,30 L 70,70 L 100,70 L 50,100 L 0,70 L 30,70 L 30,30 L 0,30 Z' },
  { id: 'quadArrow', category: 'lines_arrows', name: 'تیری چوار لایەنە', path: 'M 35,35 L 50,0 L 65,35 L 100,50 L 65,65 L 50,100 L 35,65 L 0,50 Z' },
  { id: 'bentArrow', category: 'lines_arrows', name: 'تیری چەماوە', path: 'M 0,100 L 0,35 L 60,35 L 60,0 L 100,50 L 60,100 L 60,65 L 35,65 L 35,100 Z' },
  { id: 'uturnArrow', category: 'lines_arrows', name: 'تیری پێچاوپێچ (U-Turn)', path: 'M 0,100 L 0,40 C 0,10 50,10 50,40 L 50,20 L 100,60 L 50,100 L 50,80 L 30,80 C 20,80 20,90 20,100 Z' },
  { id: 'curvedRightArrow', category: 'lines_arrows', name: 'تیری کەوانی بۆ ڕاست', path: 'M 0,80 C 0,30 50,20 70,30 L 70,0 L 100,50 L 70,100 L 70,70 C 40,60 20,70 0,100 Z' },
  { id: 'curvedLeftArrow', category: 'lines_arrows', name: 'تیری کەوانی بۆ چەپ', path: 'M 100,80 C 100,30 50,20 30,30 L 30,0 L 0,50 L 30,100 L 30,70 C 60,60 80,70 100,100 Z' },
  { id: 'chevron', category: 'lines_arrows', name: 'تیری شێوە V (Chevron)', path: 'M 0,0 L 70,0 L 100,50 L 70,100 L 0,100 L 30,50 Z' },
  { id: 'notchedRightArrow', category: 'lines_arrows', name: 'تیری ددانەدار', path: 'M 0,30 L 60,30 L 60,0 L 100,50 L 60,100 L 60,70 L 0,70 L 20,50 Z' },
  { id: 'stripedRightArrow', category: 'lines_arrows', name: 'تیری هێڵدار', path: 'M 0,30 L 10,30 L 10,70 L 0,70 Z M 20,30 L 30,30 L 30,70 L 20,70 Z M 40,30 L 60,30 L 60,0 L 100,50 L 60,100 L 60,70 L 40,70 Z' },

  // ==========================================
  // 2. RECTANGLES (چوارگۆشەکان)
  // ==========================================
  { id: 'rect', category: 'rectangles', name: 'چوارگۆشە', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z' },
  { id: 'roundRect', category: 'rectangles', name: 'چوارگۆشەی خڕ' },
  { id: 'snip1Rect', category: 'rectangles', name: 'گۆشەیەک بڕاو', path: 'M 0,0 L 80,0 L 100,20 L 100,100 L 0,100 Z' },
  { id: 'snip2SameRect', category: 'rectangles', name: 'دوو گۆشەی بڕاو (یەک لا)', path: 'M 0,0 L 80,0 L 100,20 L 100,80 L 80,100 L 0,100 Z' },
  { id: 'snip2DiagRect', category: 'rectangles', name: 'دوو گۆشەی بڕاو (پێچەوانە)', path: 'M 20,0 L 100,0 L 100,80 L 80,100 L 0,100 L 0,20 Z' },
  { id: 'round1Rect', category: 'rectangles', name: 'گۆشەیەک خڕ', path: 'M 0,0 L 70,0 C 100,0 100,0 100,30 L 100,100 L 0,100 Z' },
  { id: 'round2SameRect', category: 'rectangles', name: 'دوو گۆشەی خڕ (یەک لا)', path: 'M 0,0 L 70,0 C 100,0 100,0 100,30 L 100,70 C 100,100 100,100 70,100 L 0,100 Z' },
  { id: 'round2DiagRect', category: 'rectangles', name: 'دوو گۆشەی خڕ (پێچەوانە)', path: 'M 30,0 L 100,0 L 100,70 C 100,100 100,100 70,100 L 0,100 L 0,30 C 0,0 0,0 30,0 Z' },
  { id: 'snipRound1Rect', category: 'rectangles', name: 'گۆشەیەک بڕاو و خڕ', path: 'M 0,0 L 80,0 L 100,20 L 100,70 C 100,100 100,100 70,100 L 0,100 Z' },

  // ==========================================
  // 3. BASIC SHAPES (شێوە سەرەتاییەکان)
  // ==========================================
  { id: 'ellipse', category: 'basic_shapes', name: 'بازنە / هێلکەیی' },
  { id: 'triangle', category: 'basic_shapes', name: 'سێگۆشەی هاولاوە', path: 'M 50,0 L 100,100 L 0,100 Z' },
  { id: 'rtTriangle', category: 'basic_shapes', name: 'سێگۆشەی ڕاستگۆشە', path: 'M 0,0 L 100,100 L 0,100 Z' },
  { id: 'parallelogram', category: 'basic_shapes', name: 'لاڕێکە', path: 'M 25,0 L 100,0 L 75,100 L 0,100 Z' },
  { id: 'trapezoid', category: 'basic_shapes', name: 'نیمچە لاڕێکە', path: 'M 20,0 L 80,0 L 100,100 L 0,100 Z' },
  { id: 'diamond', category: 'basic_shapes', name: 'سەرمێوژ', path: 'M 50,0 L 100,50 L 50,100 L 0,50 Z' },
  { id: 'pentagon', category: 'basic_shapes', name: 'پێنجلا', path: generatePolygonPath(5) },
  { id: 'hexagon', category: 'basic_shapes', name: 'شەشلا', path: generatePolygonPath(6) },
  { id: 'heptagon', category: 'basic_shapes', name: 'حەوتلا', path: generatePolygonPath(7) },
  { id: 'octagon', category: 'basic_shapes', name: 'هەشتلا', path: generatePolygonPath(8) },
  { id: 'decagon', category: 'basic_shapes', name: 'دەلا', path: generatePolygonPath(10) },
  { id: 'dodecagon', category: 'basic_shapes', name: 'دوانزەلا', path: generatePolygonPath(12) },
  { id: 'pie', category: 'basic_shapes', name: 'کەرتی بازنە (Pie)', path: 'M 50,50 L 50,0 A 50,50 0 1,1 0,50 Z' },
  { id: 'chord', category: 'basic_shapes', name: 'ژێی بازنە (Chord)', path: 'M 15,15 A 50,50 0 0,1 85,85 Z' },
  { id: 'teardrop', category: 'basic_shapes', name: 'دڵۆپە (Teardrop)', path: 'M 50,0 L 100,50 C 100,78 78,100 50,100 C 22,100 0,78 0,50 Z' },
  { id: 'frame', category: 'basic_shapes', name: 'چوارچێوە (Frame)', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z M 15,15 L 15,85 L 85,85 L 85,15 Z' },
  { id: 'halfFrame', category: 'basic_shapes', name: 'نیوە چوارچێوە', path: 'M 0,0 L 100,0 L 100,100 L 80,100 L 80,20 L 0,20 Z' },
  { id: 'lShape', category: 'basic_shapes', name: 'شێوە L', path: 'M 0,0 L 30,0 L 30,70 L 100,70 L 100,100 L 0,100 Z' },
  { id: 'diagonalStripe', category: 'basic_shapes', name: 'نەواری لار', path: 'M 30,0 L 100,70 L 100,100 L 70,100 L 0,30 L 0,0 Z' },
  { id: 'plus', category: 'basic_shapes', name: 'خاچ / کۆ', path: 'M 33,0 L 67,0 L 67,33 L 100,33 L 100,67 L 67,67 L 67,100 L 33,100 L 33,67 L 0,67 L 0,33 L 33,33 Z' },
  { id: 'donut', category: 'basic_shapes', name: 'ئەڵقە (Donut)' },
  { id: 'can', category: 'basic_shapes', name: 'بڕکە (Cylinder)', path: 'M 0,20 C 0,0 100,0 100,20 L 100,80 C 100,100 0,100 0,80 Z M 0,20 C 0,40 100,40 100,20' },
  { id: 'cube', category: 'basic_shapes', name: 'شەشپاڵو (Cube)', path: 'M 0,30 L 70,30 L 70,100 L 0,100 Z M 0,30 L 30,0 L 100,0 L 70,30 Z M 70,30 L 100,0 L 100,70 L 70,100 Z' },
  { id: 'bezel', category: 'basic_shapes', name: 'قەباخ (Bezel)', path: 'M 0,0 L 100,0 L 80,20 L 20,20 Z M 100,0 L 100,100 L 80,80 L 80,20 Z M 100,100 L 0,100 L 20,80 L 80,80 Z M 0,100 L 0,0 L 20,20 L 20,80 Z' },
  { id: 'foldedCorner', category: 'basic_shapes', name: 'پەڕەی پێچراوە', path: 'M 0,0 L 70,0 L 100,30 L 100,100 L 0,100 Z M 70,0 L 70,30 L 100,30 Z' },
  { id: 'heart', category: 'basic_shapes', name: 'دڵ', path: 'M 50,25 C 50,10 25,0 10,20 C -10,50 35,80 50,100 C 65,80 110,50 90,20 C 75,0 50,10 50,25 Z' },
  { id: 'lightningBolt', category: 'basic_shapes', name: 'بروسکە', path: 'M 55,0 L 15,55 L 45,55 L 30,100 L 85,40 L 55,40 Z' },
  { id: 'sun', category: 'basic_shapes', name: 'خۆر', path: 'M 50,20 A 30,30 0 1,0 50,80 A 30,30 0 1,0 50,20 M 50,0 L 50,12 M 50,88 L 50,100 M 0,50 L 12,50 M 88,50 L 100,50 M 15,15 L 24,24 M 76,76 L 85,85 M 15,85 L 24,76 M 76,24 L 85,15' },
  { id: 'moon', category: 'basic_shapes', name: 'مانگ', path: 'M 60,0 C 20,0 0,25 0,50 C 0,75 25,100 65,100 C 35,85 25,50 40,20 C 48,7 60,0 60,0 Z' },
  { id: 'cloud', category: 'basic_shapes', name: 'هەور', path: 'M 20,80 L 80,80 C 95,80 95,60 85,50 C 90,30 70,20 55,30 C 45,15 25,20 20,35 C 5,35 5,80 20,80 Z' },
  { id: 'arc', category: 'basic_shapes', name: 'کەوان', path: 'M 0,100 A 100,100 0 0,1 100,0' },
  { id: 'smileyFace', category: 'basic_shapes', name: 'ڕووخساری بەدەنگ' },
  { id: 'blockArc', category: 'basic_shapes', name: 'کەوانی ئەستوور', path: 'M 0,100 A 100,100 0 0,1 100,0 L 80,0 A 80,80 0 0,0 0,80 Z' },

  // ==========================================
  // 4. MATH SYMBOLS (هێما بیرکارییەکان)
  // ==========================================
  { id: 'mathPlus', category: 'math_symbols', name: 'کۆ (+)', path: 'M 35,0 L 65,0 L 65,35 L 100,35 L 100,65 L 65,65 L 65,100 L 35,100 L 35,65 L 0,65 L 0,35 L 35,35 Z' },
  { id: 'mathMinus', category: 'math_symbols', name: 'لێدەرکردن (-)', path: 'M 0,35 L 100,35 L 100,65 L 0,65 Z' },
  { id: 'mathMultiply', category: 'math_symbols', name: 'کەڕەت (×)', path: 'M 20,0 L 50,30 L 80,0 L 100,20 L 70,50 L 100,80 L 80,100 L 50,70 L 20,100 L 0,80 L 30,50 L 0,20 Z' },
  { id: 'mathDivide', category: 'math_symbols', name: 'دابەش (÷)', path: 'M 40,10 A 10,10 0 1,1 60,10 A 10,10 0 1,1 40,10 M 0,40 L 100,40 L 100,60 L 0,60 Z M 40,80 A 10,10 0 1,1 60,80 A 10,10 0 1,1 40,80' },
  { id: 'mathEqual', category: 'math_symbols', name: 'یەکسانە (=)', path: 'M 0,20 L 100,20 L 100,40 L 0,40 Z M 0,60 L 100,60 L 100,80 L 0,80 Z' },
  { id: 'mathNotEqual', category: 'math_symbols', name: 'یەکسان نییە (≠)', path: 'M 0,20 L 100,20 L 100,40 L 0,40 Z M 0,60 L 100,60 L 100,80 L 0,80 Z M 70,0 L 85,0 L 30,100 L 15,100 Z' },

  // ==========================================
  // 5. STARS & BANNERS (ئەستێرە و بەنەرەکان)
  // ==========================================
  { id: 'star4', category: 'stars_banners', name: 'ئەستێرەی ٤ پەڕە', path: generateStarPath(4, 0.4) },
  { id: 'star5', category: 'stars_banners', name: 'ئەستێرەی ٥ پەڕە', path: generateStarPath(5, 0.38) },
  { id: 'star6', category: 'stars_banners', name: 'ئەستێرەی ٦ پەڕە', path: generateStarPath(6, 0.5) },
  { id: 'star7', category: 'stars_banners', name: 'ئەستێرەی ٧ پەڕە', path: generateStarPath(7, 0.5) },
  { id: 'star8', category: 'stars_banners', name: 'ئەستێرەی ٨ پەڕە', path: generateStarPath(8, 0.5) },
  { id: 'star10', category: 'stars_banners', name: 'ئەستێرەی ١٠ پەڕە', path: generateStarPath(10, 0.55) },
  { id: 'star12', category: 'stars_banners', name: 'ئەستێرەی ١٢ پەڕە', path: generateStarPath(12, 0.6) },
  { id: 'star16', category: 'stars_banners', name: 'ئەستێرەی ١٦ پەڕە', path: generateStarPath(16, 0.65) },
  { id: 'star24', category: 'stars_banners', name: 'ئەستێرەی ٢٤ پەڕە', path: generateStarPath(24, 0.7) },
  { id: 'star32', category: 'stars_banners', name: 'ئەستێرەی ٣٢ پەڕە', path: generateStarPath(32, 0.75) },
  { id: 'explosion1', category: 'stars_banners', name: 'تەقینەوە ٨ پەڕە', path: generateBurstPath(8) },
  { id: 'explosion2', category: 'stars_banners', name: 'تەقینەوە ١٤ پەڕە', path: generateBurstPath(14) },
  { id: 'wave', category: 'stars_banners', name: 'شەپۆل (Wave)', path: 'M 0,20 Q 25,0 50,20 T 100,20 L 100,80 Q 75,100 50,80 T 0,80 Z' },
  { id: 'ribbon', category: 'stars_banners', name: 'بەنەری نەوار', path: 'M 0,20 L 20,40 L 0,60 L 20,60 L 20,80 L 80,80 L 80,60 L 100,60 L 80,40 L 100,20 L 80,20 L 80,0 L 20,0 L 20,20 Z' },
  { id: 'ribbon2', category: 'stars_banners', name: 'بەنەری سەرەوە', path: 'M 0,40 L 20,20 L 0,0 L 20,0 L 20,20 L 80,20 L 80,0 L 100,0 L 80,20 L 100,40 L 80,40 L 80,80 L 20,80 L 20,40 Z' },
  { id: 'horizontalScroll', category: 'stars_banners', name: 'تۆماری ئاسۆیی', path: 'M 10,10 C 0,10 0,30 10,30 L 90,30 C 100,30 100,10 90,10 Z M 10,30 L 10,90 C 0,90 0,70 10,70 L 90,70 C 100,70 100,90 90,90 L 90,30 Z' },
  { id: 'verticalScroll', category: 'stars_banners', name: 'تۆماری ستوونی', path: 'M 10,10 C 10,0 30,0 30,10 L 30,90 C 30,100 10,100 10,90 Z M 30,10 L 90,10 C 90,0 70,0 70,10 L 70,90 C 70,100 90,100 90,90 L 30,90 Z' },

  // ==========================================
  // 6. CALLOUTS (بڵقەکانی قسەکردن)
  // ==========================================
  { id: 'wedgeRectCallout', category: 'callouts', name: 'بڵقی چوارگۆشە', path: 'M 0,0 L 100,0 L 100,75 L 45,75 L 20,100 L 30,75 L 0,75 Z' },
  { id: 'wedgeRoundRectCallout', category: 'callouts', name: 'بڵقی خڕ', path: 'M 10,0 L 90,0 C 100,0 100,0 100,10 L 100,65 C 100,75 100,75 90,75 L 45,75 L 20,100 L 30,75 L 10,75 C 0,75 0,75 0,65 L 0,10 C 0,0 0,0 10,0 Z' },
  { id: 'wedgeEllipseCallout', category: 'callouts', name: 'بڵقی بازنەیی' },
  { id: 'cloudCallout', category: 'callouts', name: 'بڵقی هەوری', path: 'M 20,70 C 5,70 5,30 25,30 C 25,10 60,10 70,25 C 85,15 100,30 95,50 C 100,65 85,80 70,70 Z' },

  // ==========================================
  // 7. FLOWCHART (هێڵکاری)
  // ==========================================
  { id: 'flowProcess', category: 'flowchart', name: 'پڕۆسە (Process)', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z' },
  { id: 'flowDecision', category: 'flowchart', name: 'بڕیار (Decision)', path: 'M 50,0 L 100,50 L 50,100 L 0,50 Z' },
  { id: 'flowData', category: 'flowchart', name: 'داتا (Data)', path: 'M 20,0 L 100,0 L 80,100 L 0,100 Z' },
  { id: 'flowPredefined', category: 'flowchart', name: 'پڕۆسەی دیاریکراو', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z M 15,0 L 15,100 M 85,0 L 85,100' },
  { id: 'flowInternalStorage', category: 'flowchart', name: 'عەمباری ناوەکی', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z M 0,20 L 100,20 M 20,0 L 20,100' },
  { id: 'flowDocument', category: 'flowchart', name: 'بەڵگەنامە (Document)', path: 'M 0,0 L 100,0 L 100,80 Q 75,100 50,80 T 0,80 Z' },
  { id: 'flowMultidocument', category: 'flowchart', name: 'چەندین بەڵگەنامە', path: 'M 20,0 L 100,0 L 100,60 L 80,60 L 80,20 L 0,20 Z M 10,10 L 90,10 L 90,70 L 70,70 L 70,30 L 0,30 Z M 0,20 L 80,20 L 80,80 Q 60,100 40,80 T 0,80 Z' },
  { id: 'flowTerminator', category: 'flowchart', name: 'دەستپێک / کۆتایی', path: 'M 30,0 L 70,0 C 100,0 100,100 70,100 L 30,100 C 0,100 0,0 30,0 Z' },
  { id: 'flowPreparation', category: 'flowchart', name: 'ئامادەکاری', path: 'M 20,0 L 80,0 L 100,50 L 80,100 L 20,100 L 0,50 Z' },
  { id: 'flowManualInput', category: 'flowchart', name: 'تێکردنی دەستی', path: 'M 0,20 L 100,0 L 100,100 L 0,100 Z' },
  { id: 'flowManualOperation', category: 'flowchart', name: 'کرداری دەستی', path: 'M 0,0 L 100,0 L 80,100 L 20,100 Z' },
  { id: 'flowDisplay', category: 'flowchart', name: 'پێشاندەر (Display)', path: 'M 20,0 L 80,0 C 100,20 100,80 80,100 L 20,100 L 0,50 Z' },
];

// Map shape ID to shape object
export const SHAPE_MAP = ALL_SHAPES.reduce((acc, shape) => {
  acc[shape.id] = shape;
  return acc;
}, {});

// --- OpenXML Preset Geometry Names Mapping ---
export const OPENXML_SHAPE_PRST_MAP = {
  ellipse: 'oval',
  circle: 'oval',
  roundRect: 'roundRect',
  rect: 'rect',
  line: 'line',
  arrow: 'line',
  doubleArrow: 'line',
  flowProcess: 'flowChartProcess',
  flowDecision: 'flowChartDecision',
  flowData: 'flowChartInputOutput',
  flowPredefined: 'flowChartPredefinedProcess',
  flowInternalStorage: 'flowChartInternalStorage',
  flowDocument: 'flowChartDocument',
  flowMultidocument: 'flowChartMultidocument',
  flowTerminator: 'flowChartTerminator',
  flowPreparation: 'flowChartPreparation',
  flowManualInput: 'flowChartManualInput',
  flowManualOperation: 'flowChartManualOperation',
  flowDisplay: 'flowChartDisplay',
  plus: 'mathPlus',
};

// --- Professional PowerPoint Shape Style Presets (أنماط الأشكال) ---
export const SHAPE_STYLE_PRESETS = [
  { id: 'blue_dark', name: 'شینی تۆخ (Blue)', fill: '#1f497d', outlineColor: '#132d4e', outlineWidth: 2, textColor: '#ffffff' },
  { id: 'red_intense', name: 'سووری بەهێز (Red)', fill: '#c00000', outlineColor: '#800000', outlineWidth: 2, textColor: '#ffffff' },
  { id: 'green_emerald', name: 'سەوزی ژینگە (Green)', fill: '#2e7d32', outlineColor: '#1b5e20', outlineWidth: 2, textColor: '#ffffff' },
  { id: 'yellow_golden', name: 'زەردی ئاڵتونی (Yellow)', fill: '#ffb300', outlineColor: '#ff8f00', outlineWidth: 2, textColor: '#000000' },
  { id: 'purple_royal', name: 'مۆری شاهانە (Purple)', fill: '#6a1b9a', outlineColor: '#4a148c', outlineWidth: 2, textColor: '#ffffff' },
  { id: 'orange_vibrant', name: 'نارنجی گەش (Orange)', fill: '#e65100', outlineColor: '#bf360c', outlineWidth: 2, textColor: '#ffffff' },
  { id: 'cyan_sky', name: 'کەویاری گەش (Cyan)', fill: '#00b0f0', outlineColor: '#0070c0', outlineWidth: 2, textColor: '#ffffff' },

  { id: 'white_blue_border', name: 'سپی و چوارچێوەی شین', fill: '#ffffff', outlineColor: '#1f497d', outlineWidth: 2.5, textColor: '#1f497d' },
  { id: 'white_red_border', name: 'سپی و چوارچێوەی سوور', fill: '#ffffff', outlineColor: '#c00000', outlineWidth: 2.5, textColor: '#c00000' },
  { id: 'white_black_border', name: 'سپی و چوارچێوەی ڕەش', fill: '#ffffff', outlineColor: '#000000', outlineWidth: 2, textColor: '#000000' },
  { id: 'black_graphite', name: 'ڕەشی گرافیتی', fill: '#1c1c1e', outlineColor: '#3a3a3c', outlineWidth: 2, textColor: '#ffffff' },
  { id: 'gray_soft', name: 'ڕەساسی مۆدێرن', fill: '#e5e5ea', outlineColor: '#8e8e93', outlineWidth: 1.5, textColor: '#000000' },

  { id: 'outline_blue', name: 'خڵۆڵ (چوارچێوەی شین)', fill: 'none', outlineColor: '#007aff', outlineWidth: 3, textColor: '#007aff' },
  { id: 'outline_red', name: 'خڵۆڵ (چوارچێوەی سوور)', fill: 'none', outlineColor: '#ff3b30', outlineWidth: 3, textColor: '#ff3b30' },
  { id: 'outline_yellow', name: 'خڵۆڵ (چوارچێوەی زەرد)', fill: 'none', outlineColor: '#ffcc00', outlineWidth: 3, textColor: '#ffcc00' },
  { id: 'outline_green', name: 'خڵۆڵ (چوارچێوەی سەوز)', fill: 'none', outlineColor: '#34c759', outlineWidth: 3, textColor: '#34c759' },
  { id: 'outline_black', name: 'خڵۆڵ (چوارچێوەی ڕەش)', fill: 'none', outlineColor: '#000000', outlineWidth: 3, textColor: '#000000' },
  { id: 'outline_white', name: 'خڵۆڵ (چوارچێوەی سپی)', fill: 'none', outlineColor: '#ffffff', outlineWidth: 3, textColor: '#ffffff' },
];

// Helper function to render any shape in React Native SVG
export function renderSvgShape({
  shapeType = 'rect',
  fill = '#1f497d',
  outlineColor = '#000000',
  outlineWidth = 2,
  cornerRadius = 20,
  svgWidth = '100%',
  svgHeight = '100%',
}) {
  const isLine = shapeType === 'line';
  const isArrow = shapeType === 'arrow';
  const isDoubleArrow = shapeType === 'doubleArrow';

  const strokeWidth = outlineWidth > 0 ? outlineWidth : 0;
  const stroke = outlineWidth > 0 ? outlineColor : 'none';

  if (isLine) {
    return (
      <Svg width={svgWidth} height={svgHeight} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Line
          x1="0"
          y1="50"
          x2="100"
          y2="50"
          stroke={outlineColor || '#000000'}
          strokeWidth={Math.max(2, outlineWidth * 3)}
          vectorEffect="non-scaling-stroke"
        />
      </Svg>
    );
  }

  if (isArrow) {
    return (
      <Svg width={svgWidth} height={svgHeight} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Line
          x1="0"
          y1="50"
          x2="80"
          y2="50"
          stroke={outlineColor || '#000000'}
          strokeWidth={Math.max(2, outlineWidth * 3)}
          vectorEffect="non-scaling-stroke"
        />
        <Path
          d="M 80,25 L 100,50 L 80,75 Z"
          fill={outlineColor || '#000000'}
        />
      </Svg>
    );
  }

  if (isDoubleArrow) {
    return (
      <Svg width={svgWidth} height={svgHeight} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Path d="M 20,25 L 0,50 L 20,75 Z" fill={outlineColor || '#000000'} />
        <Line
          x1="20"
          y1="50"
          x2="80"
          y2="50"
          stroke={outlineColor || '#000000'}
          strokeWidth={Math.max(2, outlineWidth * 3)}
          vectorEffect="non-scaling-stroke"
        />
        <Path d="M 80,25 L 100,50 L 80,75 Z" fill={outlineColor || '#000000'} />
      </Svg>
    );
  }

  if (shapeType === 'rect' || shapeType === 'flowProcess') {
    return (
      <Svg width={svgWidth} height={svgHeight} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Rect
          x="0"
          y="0"
          width="100"
          height="100"
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      </Svg>
    );
  }

  if (shapeType === 'roundRect') {
    const rx = Math.max(2, Math.min(40, cornerRadius));
    return (
      <Svg width={svgWidth} height={svgHeight} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Rect
          x="0"
          y="0"
          width="100"
          height="100"
          rx={rx}
          ry={rx}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      </Svg>
    );
  }

  if (shapeType === 'ellipse' || shapeType === 'wedgeEllipseCallout') {
    return (
      <Svg width={svgWidth} height={svgHeight} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Ellipse
          cx="50"
          cy="50"
          rx="50"
          ry="50"
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
        {shapeType === 'wedgeEllipseCallout' && (
          <Path
            d="M 25,85 L 10,100 L 40,90 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </Svg>
    );
  }

  if (shapeType === 'donut') {
    return (
      <Svg width={svgWidth} height={svgHeight} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Path
          d="M 50,0 A 50,50 0 1,0 50,100 A 50,50 0 1,0 50,0 M 50,25 A 25,25 0 1,1 50,75 A 25,25 0 1,1 50,25 Z"
          fill={fill}
          fillRule="evenodd"
          stroke={stroke}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      </Svg>
    );
  }

  if (shapeType === 'smileyFace') {
    return (
      <Svg width={svgWidth} height={svgHeight} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Circle cx="50" cy="50" r="48" fill={fill} stroke={stroke} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
        <Circle cx="32" cy="35" r="6" fill={stroke !== 'none' ? stroke : '#000000'} />
        <Circle cx="68" cy="35" r="6" fill={stroke !== 'none' ? stroke : '#000000'} />
        <Path
          d="M 25,60 Q 50,85 75,60"
          fill="none"
          stroke={stroke !== 'none' ? stroke : '#000000'}
          strokeWidth={Math.max(3, strokeWidth)}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </Svg>
    );
  }

  const def = SHAPE_MAP[shapeType];
  const pathD = def?.path || 'M 0,0 L 100,0 L 100,100 L 0,100 Z';

  return (
    <Svg width={svgWidth} height={svgHeight} viewBox="0 0 100 100" preserveAspectRatio="none">
      <Path
        d={pathD}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    </Svg>
  );
}

// Helper function to render any shape in HTML SVG for PDF export
export function getShapeSvgHtml({
  shapeType = 'rect',
  fill = '#1f497d',
  outlineColor = '#000000',
  outlineWidth = 2,
  cornerRadius = 20,
}) {
  const isLine = shapeType === 'line';
  const isArrow = shapeType === 'arrow';
  const isDoubleArrow = shapeType === 'doubleArrow';
  const stroke = outlineWidth > 0 ? (outlineColor || '#000000') : 'none';

  if (isLine) {
    return `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="position: absolute; top:0; left:0;">
      <line x1="0" y1="50" x2="100" y2="50" stroke="${outlineColor || '#000000'}" stroke-width="${Math.max(2, outlineWidth * 3)}" vector-effect="non-scaling-stroke" />
    </svg>`;
  }

  if (isArrow) {
    return `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="position: absolute; top:0; left:0;">
      <line x1="0" y1="50" x2="80" y2="50" stroke="${outlineColor || '#000000'}" stroke-width="${Math.max(2, outlineWidth * 3)}" vector-effect="non-scaling-stroke" />
      <path d="M 80,25 L 100,50 L 80,75 Z" fill="${outlineColor || '#000000'}" />
    </svg>`;
  }

  if (isDoubleArrow) {
    return `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="position: absolute; top:0; left:0;">
      <path d="M 20,25 L 0,50 L 20,75 Z" fill="${outlineColor || '#000000'}" />
      <line x1="20" y1="50" x2="80" y2="50" stroke="${outlineColor || '#000000'}" stroke-width="${Math.max(2, outlineWidth * 3)}" vector-effect="non-scaling-stroke" />
      <path d="M 80,25 L 100,50 L 80,75 Z" fill="${outlineColor || '#000000'}" />
    </svg>`;
  }

  if (shapeType === 'rect' || shapeType === 'flowProcess') {
    return `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="position: absolute; top:0; left:0;">
      <rect x="0" y="0" width="100" height="100" fill="${fill}" stroke="${stroke}" stroke-width="${outlineWidth}" vector-effect="non-scaling-stroke" />
    </svg>`;
  }

  if (shapeType === 'roundRect') {
    const rx = Math.max(2, Math.min(40, cornerRadius));
    return `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="position: absolute; top:0; left:0;">
      <rect x="0" y="0" width="100" height="100" rx="${rx}" ry="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${outlineWidth}" vector-effect="non-scaling-stroke" />
    </svg>`;
  }

  if (shapeType === 'ellipse' || shapeType === 'wedgeEllipseCallout') {
    const wedgeCallout = shapeType === 'wedgeEllipseCallout' ? `<path d="M 25,85 L 10,100 L 40,90 Z" fill="${fill}" stroke="${stroke}" stroke-width="${outlineWidth}" vector-effect="non-scaling-stroke" />` : '';
    return `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="position: absolute; top:0; left:0;">
      <ellipse cx="50" cy="50" rx="50" ry="50" fill="${fill}" stroke="${stroke}" stroke-width="${outlineWidth}" vector-effect="non-scaling-stroke" />
      ${wedgeCallout}
    </svg>`;
  }

  const def = SHAPE_MAP[shapeType];
  const pathD = def?.path || 'M 0,0 L 100,0 L 100,100 L 0,100 Z';
  return `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="position: absolute; top:0; left:0;">
    <path d="${pathD}" fill="${fill}" stroke="${stroke}" stroke-width="${outlineWidth}" vector-effect="non-scaling-stroke" />
  </svg>`;
}

