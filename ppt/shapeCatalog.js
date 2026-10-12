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

// Darker overlay for the icon on action buttons (drawn over the button's own fill)
const SHAPE_DETAIL_FILL = 'rgba(0,0,0,0.35)';

// Optional shape fields: open (outline only, e.g. brackets), evenOdd (holes), detail (icon path),
// detailEvenOdd, lines (open leader / divider lines drawn with the outline only).

// --- PowerPoint Shape Categories ---
export const SHAPE_CATEGORIES = [
  { id: 'lines_arrows', name: 'هێڵەکان' },
  { id: 'block_arrows', name: 'تیرەکان' },
  { id: 'rectangles', name: 'چوارگۆشەکان' },
  { id: 'basic_shapes', name: 'شێوە سەرەتاییەکان' },
  { id: 'math_symbols', name: 'هێما بیرکارییەکان' },
  { id: 'stars_banners', name: 'ئەستێرە و بەنەرەکان' },
  { id: 'callouts', name: 'بڵقەکانی قسەکردن' },
  { id: 'flowchart', name: 'هێڵکاری' },
  { id: 'action_buttons', name: 'دوگمەکانی کردار' },
];

// --- Comprehensive Shape Definitions ---
export const ALL_SHAPES = [
  // ==========================================
  // 1. LINES & ARROWS (هێڵەکان و تیرەکان)
  // ==========================================
  { id: 'line', category: 'lines_arrows', name: 'هێڵ' },
  { id: 'arrow', category: 'lines_arrows', name: 'تیری هێڵی' },
  { id: 'doubleArrow', category: 'lines_arrows', name: 'تیری دووسەر' },
  { id: 'elbowConnector', category: 'lines_arrows', name: 'بەستەری زۆنگ', path: 'M 0,10 L 50,10 L 50,90 L 100,90' },
  { id: 'curvedConnector', category: 'lines_arrows', name: 'بەستەری چەماوە', path: 'M 0,10 C 60,10 40,90 100,90' },
  { id: 'rightArrow', category: 'block_arrows', name: 'تیری بەرەو ڕاست', path: 'M 0,30 L 60,30 L 60,0 L 100,50 L 60,100 L 60,70 L 0,70 Z' },
  { id: 'leftArrow', category: 'block_arrows', name: 'تیری بەرەو چەپ', path: 'M 40,0 L 0,50 L 40,100 L 40,70 L 100,70 L 100,30 L 40,30 Z' },
  { id: 'upArrow', category: 'block_arrows', name: 'تیری بەرەو سەرەوە', path: 'M 50,0 L 100,40 L 70,40 L 70,100 L 30,100 L 30,40 L 0,40 Z' },
  { id: 'downArrow', category: 'block_arrows', name: 'تیری بەرەو خوارەوە', path: 'M 30,0 L 70,0 L 70,60 L 100,60 L 50,100 L 0,60 L 30,60 Z' },
  { id: 'leftRightArrow', category: 'block_arrows', name: 'تیری ڕاست و چەپ', path: 'M 0,50 L 30,0 L 30,30 L 70,30 L 70,0 L 100,50 L 70,100 L 70,70 L 30,70 L 30,100 Z' },
  { id: 'upDownArrow', category: 'block_arrows', name: 'تیری سەرەوە و خوارەوە', path: 'M 50,0 L 100,30 L 70,30 L 70,70 L 100,70 L 50,100 L 0,70 L 30,70 L 30,30 L 0,30 Z' },
  { id: 'quadArrow', category: 'block_arrows', name: 'تیری چوار لایەنە', path: 'M 35,35 L 50,0 L 65,35 L 100,50 L 65,65 L 50,100 L 35,65 L 0,50 Z' },
  { id: 'bentArrow', category: 'block_arrows', name: 'تیری چەماوە', path: 'M 0,100 L 0,35 L 60,35 L 60,0 L 100,50 L 60,100 L 60,65 L 35,65 L 35,100 Z' },
  { id: 'uturnArrow', category: 'block_arrows', name: 'تیری پێچاوپێچ', path: 'M 0,100 L 0,40 C 0,10 50,10 50,40 L 50,20 L 100,60 L 50,100 L 50,80 L 30,80 C 20,80 20,90 20,100 Z' },
  { id: 'curvedRightArrow', category: 'block_arrows', name: 'تیری کەوانی بۆ ڕاست', path: 'M 0,80 C 0,30 50,20 70,30 L 70,0 L 100,50 L 70,100 L 70,70 C 40,60 20,70 0,100 Z' },
  { id: 'curvedLeftArrow', category: 'block_arrows', name: 'تیری کەوانی بۆ چەپ', path: 'M 100,80 C 100,30 50,20 30,30 L 30,0 L 0,50 L 30,100 L 30,70 C 60,60 80,70 100,100 Z' },
  { id: 'chevron', category: 'block_arrows', name: 'تیری نووکدار', path: 'M 0,0 L 70,0 L 100,50 L 70,100 L 0,100 L 30,50 Z' },
  { id: 'notchedRightArrow', category: 'block_arrows', name: 'تیری ددانەدار', path: 'M 0,30 L 60,30 L 60,0 L 100,50 L 60,100 L 60,70 L 0,70 L 20,50 Z' },
  { id: 'stripedRightArrow', category: 'block_arrows', name: 'تیری هێڵدار', path: 'M 0,30 L 10,30 L 10,70 L 0,70 Z M 20,30 L 30,30 L 30,70 L 20,70 Z M 40,30 L 60,30 L 60,0 L 100,50 L 60,100 L 60,70 L 40,70 Z' },

  // ==========================================
  // 2b. BLOCK ARROWS (تیرەکان) — new shapes; ids are the exact OOXML prst names
  // ==========================================
  { id: 'homePlate', category: 'block_arrows', name: 'پێنجگۆشەی تیری', path: 'M 0,0 L 75,0 L 100,50 L 75,100 L 0,100 Z' },
  { id: 'leftUpArrow', category: 'block_arrows', name: 'تیری چەپ و سەرەوە', path: 'M 0,75 L 20,55 L 20,67 L 67,67 L 67,20 L 55,20 L 75,0 L 95,20 L 83,20 L 83,83 L 20,83 L 20,95 Z' },
  { id: 'bentUpArrow', category: 'block_arrows', name: 'تیری چەماوە بۆ سەرەوە', path: 'M 0,70 L 65,70 L 65,25 L 50,25 L 75,0 L 100,25 L 85,25 L 85,90 L 0,90 Z' },
  { id: 'leftRightUpArrow', category: 'block_arrows', name: 'تیری سێ لایەنە', path: 'M 0,75 L 18,58 L 18,68 L 42,68 L 42,22 L 32,22 L 50,0 L 68,22 L 58,22 L 58,68 L 82,68 L 82,58 L 100,75 L 82,92 L 82,82 L 18,82 L 18,92 Z' },
  { id: 'curvedUpArrow', category: 'block_arrows', name: 'تیری کەوانی بۆ سەرەوە', path: 'M 0,0 C 0,60 40,85 70,60 L 60,55 L 90,30 L 95,70 L 84,65 C 50,100 0,85 0,0 Z' },
  { id: 'curvedDownArrow', category: 'block_arrows', name: 'تیری کەوانی بۆ خوارەوە', path: 'M 0,100 C 0,40 40,15 70,40 L 60,45 L 90,70 L 95,30 L 84,35 C 50,0 0,15 0,100 Z' },
  { id: 'circularArrow', category: 'block_arrows', name: 'تیری بازنەیی', path: 'M 15,60 A 36,36 0 1,1 82,45 L 95,45 L 77,68 L 59,45 L 71,45 A 25,25 0 1,0 27,60 Z' },
  { id: 'rightArrowCallout', category: 'block_arrows', name: 'بڵقی تیری ڕاست', path: 'M 0,0 L 60,0 L 60,35 L 78,35 L 78,20 L 100,50 L 78,80 L 78,65 L 60,65 L 60,100 L 0,100 Z' },
  { id: 'leftArrowCallout', category: 'block_arrows', name: 'بڵقی تیری چەپ', path: 'M 100,0 L 40,0 L 40,35 L 22,35 L 22,20 L 0,50 L 22,80 L 22,65 L 40,65 L 40,100 L 100,100 Z' },
  { id: 'upArrowCallout', category: 'block_arrows', name: 'بڵقی تیری سەرەوە', path: 'M 0,100 L 0,40 L 35,40 L 35,22 L 20,22 L 50,0 L 80,22 L 65,22 L 65,40 L 100,40 L 100,100 Z' },
  { id: 'downArrowCallout', category: 'block_arrows', name: 'بڵقی تیری خوارەوە', path: 'M 0,0 L 100,0 L 100,60 L 65,60 L 65,78 L 80,78 L 50,100 L 20,78 L 35,78 L 35,60 L 0,60 Z' },
  { id: 'quadArrowCallout', category: 'block_arrows', name: 'بڵقی تیری چوار لایەنە', path: 'M 28,28 L 42,28 L 42,18 L 34,18 L 50,0 L 66,18 L 58,18 L 58,28 L 72,28 L 72,42 L 82,42 L 82,34 L 100,50 L 82,66 L 82,58 L 72,58 L 72,72 L 58,72 L 58,82 L 66,82 L 50,100 L 34,82 L 42,82 L 42,72 L 28,72 L 28,58 L 18,58 L 18,66 L 0,50 L 18,34 L 18,42 L 28,42 Z' },

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
  { id: 'pie', category: 'basic_shapes', name: 'کەرتی بازنە', path: 'M 50,50 L 50,0 A 50,50 0 1,1 0,50 Z' },
  { id: 'chord', category: 'basic_shapes', name: 'ژێی بازنە', path: 'M 15,15 A 50,50 0 0,1 85,85 Z' },
  { id: 'teardrop', category: 'basic_shapes', name: 'دڵۆپە', path: 'M 50,0 L 100,50 C 100,78 78,100 50,100 C 22,100 0,78 0,50 Z' },
  { id: 'frame', category: 'basic_shapes', name: 'چوارچێوە', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z M 15,15 L 15,85 L 85,85 L 85,15 Z' },
  { id: 'halfFrame', category: 'basic_shapes', name: 'نیوە چوارچێوە', path: 'M 0,0 L 100,0 L 100,100 L 80,100 L 80,20 L 0,20 Z' },
  { id: 'lShape', category: 'basic_shapes', name: 'گۆشە', path: 'M 0,0 L 30,0 L 30,70 L 100,70 L 100,100 L 0,100 Z' },
  { id: 'diagonalStripe', category: 'basic_shapes', name: 'نەواری لار', path: 'M 30,0 L 100,70 L 100,100 L 70,100 L 0,30 L 0,0 Z' },
  { id: 'plus', category: 'basic_shapes', name: 'خاچ / کۆ', path: 'M 33,0 L 67,0 L 67,33 L 100,33 L 100,67 L 67,67 L 67,100 L 33,100 L 33,67 L 0,67 L 0,33 L 33,33 Z' },
  { id: 'donut', category: 'basic_shapes', name: 'ئەڵقە' },
  { id: 'can', category: 'basic_shapes', name: 'بڕکە', path: 'M 0,20 C 0,0 100,0 100,20 L 100,80 C 100,100 0,100 0,80 Z M 0,20 C 0,40 100,40 100,20' },
  { id: 'cube', category: 'basic_shapes', name: 'شەشپاڵو', path: 'M 0,30 L 70,30 L 70,100 L 0,100 Z M 0,30 L 30,0 L 100,0 L 70,30 Z M 70,30 L 100,0 L 100,70 L 70,100 Z' },
  { id: 'bezel', category: 'basic_shapes', name: 'قەباخ', path: 'M 0,0 L 100,0 L 80,20 L 20,20 Z M 100,0 L 100,100 L 80,80 L 80,20 Z M 100,100 L 0,100 L 20,80 L 80,80 Z M 0,100 L 0,0 L 20,20 L 20,80 Z' },
  { id: 'foldedCorner', category: 'basic_shapes', name: 'پەڕەی پێچراوە', path: 'M 0,0 L 70,0 L 100,30 L 100,100 L 0,100 Z M 70,0 L 70,30 L 100,30 Z' },
  { id: 'heart', category: 'basic_shapes', name: 'دڵ', path: 'M 50,25 C 50,10 25,0 10,20 C -10,50 35,80 50,100 C 65,80 110,50 90,20 C 75,0 50,10 50,25 Z' },
  { id: 'lightningBolt', category: 'basic_shapes', name: 'بروسکە', path: 'M 55,0 L 15,55 L 45,55 L 30,100 L 85,40 L 55,40 Z' },
  { id: 'sun', category: 'basic_shapes', name: 'خۆر', path: 'M 50,20 A 30,30 0 1,0 50,80 A 30,30 0 1,0 50,20 M 50,0 L 50,12 M 50,88 L 50,100 M 0,50 L 12,50 M 88,50 L 100,50 M 15,15 L 24,24 M 76,76 L 85,85 M 15,85 L 24,76 M 76,24 L 85,15' },
  { id: 'moon', category: 'basic_shapes', name: 'مانگ', path: 'M 60,0 C 20,0 0,25 0,50 C 0,75 25,100 65,100 C 35,85 25,50 40,20 C 48,7 60,0 60,0 Z' },
  { id: 'cloud', category: 'basic_shapes', name: 'هەور', path: 'M 20,80 L 80,80 C 95,80 95,60 85,50 C 90,30 70,20 55,30 C 45,15 25,20 20,35 C 5,35 5,80 20,80 Z' },
  { id: 'arc', category: 'basic_shapes', name: 'کەوان', path: 'M 0,100 A 100,100 0 0,1 100,0' },
  { id: 'smileyFace', category: 'basic_shapes', name: 'ڕووخساری بەدەنگ' },
  { id: 'blockArc', category: 'basic_shapes', name: 'کەوانی ئەستوور', path: 'M 0,100 A 100,100 0 0,1 100,0 L 80,0 A 80,80 0 0,0 0,80 Z' },
  { id: 'plaque', category: 'basic_shapes', name: 'تابلۆ', path: 'M 10,0 L 90,0 A 10,10 0 0,0 100,10 L 100,90 A 10,10 0 0,0 90,100 L 10,100 A 10,10 0 0,0 0,90 L 0,10 A 10,10 0 0,0 10,0 Z' },
  { id: 'noSmoking', category: 'basic_shapes', name: 'نیشانەی قەدەغە', evenOdd: true, path: 'M 0,50 A 50,50 0 1,1 100,50 A 50,50 0 1,1 0,50 Z M 18,50 A 32,32 0 1,1 82,50 A 32,32 0 1,1 18,50 Z M 28,34 L 34,28 L 72,66 L 66,72 Z' },
  { id: 'pieWedge', category: 'basic_shapes', name: 'کەرتی چارەک', path: 'M 100,0 L 100,100 L 0,100 A 100,100 0 0,1 100,0 Z' },
  { id: 'leftBracket', category: 'basic_shapes', name: 'کەوانەی چوارگۆشەی چەپ', open: true, path: 'M 100,0 Q 0,0 0,15 L 0,85 Q 0,100 100,100' },
  { id: 'rightBracket', category: 'basic_shapes', name: 'کەوانەی چوارگۆشەی ڕاست', open: true, path: 'M 0,0 Q 100,0 100,15 L 100,85 Q 100,100 0,100' },
  { id: 'leftBrace', category: 'basic_shapes', name: 'کەوانەی لووتی چەپ', open: true, path: 'M 100,0 Q 50,0 50,10 L 50,40 Q 50,50 0,50 Q 50,50 50,60 L 50,90 Q 50,100 100,100' },
  { id: 'rightBrace', category: 'basic_shapes', name: 'کەوانەی لووتی ڕاست', open: true, path: 'M 0,0 Q 50,0 50,10 L 50,40 Q 50,50 100,50 Q 50,50 50,60 L 50,90 Q 50,100 0,100' },
  { id: 'bracketPair', category: 'basic_shapes', name: 'جووتە کەوانەی چوارگۆشە', open: true, path: 'M 15,0 Q 0,0 0,15 L 0,85 Q 0,100 15,100 M 85,0 Q 100,0 100,15 L 100,85 Q 100,100 85,100' },
  { id: 'bracePair', category: 'basic_shapes', name: 'جووتە کەوانەی لووت', open: true, path: 'M 15,0 Q 8,0 8,8 L 8,42 Q 8,50 0,50 Q 8,50 8,58 L 8,92 Q 8,100 15,100 M 85,0 Q 92,0 92,8 L 92,42 Q 92,50 100,50 Q 92,50 92,58 L 92,92 Q 92,100 85,100' },

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
  { id: 'wave', category: 'stars_banners', name: 'شەپۆل', path: 'M 0,20 Q 25,0 50,20 T 100,20 L 100,80 Q 75,100 50,80 T 0,80 Z' },
  { id: 'ribbon', category: 'stars_banners', name: 'بەنەری نەوار', path: 'M 0,20 L 20,40 L 0,60 L 20,60 L 20,80 L 80,80 L 80,60 L 100,60 L 80,40 L 100,20 L 80,20 L 80,0 L 20,0 L 20,20 Z' },
  { id: 'ribbon2', category: 'stars_banners', name: 'بەنەری سەرەوە', path: 'M 0,40 L 20,20 L 0,0 L 20,0 L 20,20 L 80,20 L 80,0 L 100,0 L 80,20 L 100,40 L 80,40 L 80,80 L 20,80 L 20,40 Z' },
  { id: 'horizontalScroll', category: 'stars_banners', name: 'تۆماری ئاسۆیی', path: 'M 10,10 C 0,10 0,30 10,30 L 90,30 C 100,30 100,10 90,10 Z M 10,30 L 10,90 C 0,90 0,70 10,70 L 90,70 C 100,70 100,90 90,90 L 90,30 Z' },
  { id: 'verticalScroll', category: 'stars_banners', name: 'تۆماری ستوونی', path: 'M 10,10 C 10,0 30,0 30,10 L 30,90 C 30,100 10,100 10,90 Z M 30,10 L 90,10 C 90,0 70,0 70,10 L 70,90 C 70,100 90,100 90,90 L 30,90 Z' },
  { id: 'ellipseRibbon', category: 'stars_banners', name: 'نەواری چەماوە', path: 'M 0,25 Q 50,50 100,25 L 88,50 L 100,75 Q 50,100 0,75 L 12,50 Z' },
  { id: 'ellipseRibbon2', category: 'stars_banners', name: 'نەواری چەماوە بۆ سەرەوە', path: 'M 0,75 Q 50,50 100,75 L 88,50 L 100,25 Q 50,0 0,25 L 12,50 Z' },
  { id: 'doubleWave', category: 'stars_banners', name: 'شەپۆلی دووانە', path: 'M 0,15 C 15,0 35,30 50,15 S 85,0 100,15 L 100,85 C 85,100 65,70 50,85 S 15,100 0,85 Z' },
  { id: 'leftRightRibbon', category: 'stars_banners', name: 'نەواری دوو لایەنە', path: 'M 0,60 L 20,35 L 20,45 L 50,45 L 50,20 L 80,20 L 80,10 L 100,35 L 80,60 L 80,50 L 50,50 L 50,75 L 20,75 L 20,85 Z' },

  // ==========================================
  // 6. CALLOUTS (بڵقەکانی قسەکردن)
  // ==========================================
  { id: 'wedgeRectCallout', category: 'callouts', name: 'بڵقی چوارگۆشە', path: 'M 0,0 L 100,0 L 100,75 L 45,75 L 20,100 L 30,75 L 0,75 Z' },
  { id: 'wedgeRoundRectCallout', category: 'callouts', name: 'بڵقی خڕ', path: 'M 10,0 L 90,0 C 100,0 100,0 100,10 L 100,65 C 100,75 100,75 90,75 L 45,75 L 20,100 L 30,75 L 10,75 C 0,75 0,75 0,65 L 0,10 C 0,0 0,0 10,0 Z' },
  { id: 'wedgeEllipseCallout', category: 'callouts', name: 'بڵقی بازنەیی' },
  { id: 'cloudCallout', category: 'callouts', name: 'بڵقی هەوری', path: 'M 20,70 C 5,70 5,30 25,30 C 25,10 60,10 70,25 C 85,15 100,30 95,50 C 100,65 85,80 70,70 Z' },
  { id: 'borderCallout1', category: 'callouts', name: 'بڵقی هێڵی ١', path: 'M 30,0 L 100,0 L 100,70 L 30,70 Z', lines: 'M 30,35 L 0,100' },
  { id: 'borderCallout2', category: 'callouts', name: 'بڵقی هێڵی ٢', path: 'M 30,0 L 100,0 L 100,70 L 30,70 Z', lines: 'M 30,35 L 15,35 L 0,100' },
  { id: 'borderCallout3', category: 'callouts', name: 'بڵقی هێڵی ٣', path: 'M 30,0 L 100,0 L 100,70 L 30,70 Z', lines: 'M 30,35 L 15,35 L 15,80 L 0,100' },
  { id: 'callout1', category: 'callouts', name: 'بڵقی بێ چوارچێوەی ١', path: 'M 30,0 L 100,0 L 100,70 L 30,70 Z', lines: 'M 30,35 L 0,100' },
  { id: 'callout2', category: 'callouts', name: 'بڵقی بێ چوارچێوەی ٢', path: 'M 30,0 L 100,0 L 100,70 L 30,70 Z', lines: 'M 30,35 L 15,35 L 0,100' },
  { id: 'callout3', category: 'callouts', name: 'بڵقی بێ چوارچێوەی ٣', path: 'M 30,0 L 100,0 L 100,70 L 30,70 Z', lines: 'M 30,35 L 15,35 L 15,80 L 0,100' },
  { id: 'accentCallout1', category: 'callouts', name: 'بڵقی هێڵی جیاکەرەوە', path: 'M 30,0 L 100,0 L 100,70 L 30,70 Z', lines: 'M 25,0 L 25,70 M 25,35 L 0,100' },
  { id: 'accentBorderCallout1', category: 'callouts', name: 'بڵقی هێڵی جیاکەرەوە و چوارچێوە', path: 'M 30,0 L 100,0 L 100,70 L 30,70 Z', lines: 'M 25,0 L 25,70 M 25,35 L 0,100' },

  // ==========================================
  // 7. FLOWCHART (هێڵکاری)
  // ==========================================
  { id: 'flowProcess', category: 'flowchart', name: 'پڕۆسە', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z' },
  { id: 'flowDecision', category: 'flowchart', name: 'بڕیار', path: 'M 50,0 L 100,50 L 50,100 L 0,50 Z' },
  { id: 'flowData', category: 'flowchart', name: 'داتا', path: 'M 20,0 L 100,0 L 80,100 L 0,100 Z' },
  { id: 'flowPredefined', category: 'flowchart', name: 'پڕۆسەی دیاریکراو', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z M 15,0 L 15,100 M 85,0 L 85,100' },
  { id: 'flowInternalStorage', category: 'flowchart', name: 'عەمباری ناوەکی', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z M 0,20 L 100,20 M 20,0 L 20,100' },
  { id: 'flowDocument', category: 'flowchart', name: 'بەڵگەنامە', path: 'M 0,0 L 100,0 L 100,80 Q 75,100 50,80 T 0,80 Z' },
  { id: 'flowMultidocument', category: 'flowchart', name: 'چەندین بەڵگەنامە', path: 'M 20,0 L 100,0 L 100,60 L 80,60 L 80,20 L 0,20 Z M 10,10 L 90,10 L 90,70 L 70,70 L 70,30 L 0,30 Z M 0,20 L 80,20 L 80,80 Q 60,100 40,80 T 0,80 Z' },
  { id: 'flowTerminator', category: 'flowchart', name: 'دەستپێک / کۆتایی', path: 'M 30,0 L 70,0 C 100,0 100,100 70,100 L 30,100 C 0,100 0,0 30,0 Z' },
  { id: 'flowPreparation', category: 'flowchart', name: 'ئامادەکاری', path: 'M 20,0 L 80,0 L 100,50 L 80,100 L 20,100 L 0,50 Z' },
  { id: 'flowManualInput', category: 'flowchart', name: 'تێکردنی دەستی', path: 'M 0,20 L 100,0 L 100,100 L 0,100 Z' },
  { id: 'flowManualOperation', category: 'flowchart', name: 'کرداری دەستی', path: 'M 0,0 L 100,0 L 80,100 L 20,100 Z' },
  { id: 'flowDisplay', category: 'flowchart', name: 'پێشاندەر', path: 'M 20,0 L 80,0 C 100,20 100,80 80,100 L 20,100 L 0,50 Z' },

  { id: 'flowChartAlternateProcess', category: 'flowchart', name: 'پڕۆسەی جێگرەوە', path: 'M 12,0 L 88,0 Q 100,0 100,12 L 100,88 Q 100,100 88,100 L 12,100 Q 0,100 0,88 L 0,12 Q 0,0 12,0 Z' },
  { id: 'flowChartConnector', category: 'flowchart', name: 'بەستەر', path: 'M 0,50 A 50,50 0 1,1 100,50 A 50,50 0 1,1 0,50 Z' },
  { id: 'flowChartOffpageConnector', category: 'flowchart', name: 'بەستەری دەرەوەی پەڕە', path: 'M 0,0 L 100,0 L 100,80 L 50,100 L 0,80 Z' },
  { id: 'flowChartDelay', category: 'flowchart', name: 'دواخستن', path: 'M 0,0 L 50,0 A 50,50 0 0,1 50,100 L 0,100 Z' },
  { id: 'flowChartPunchedCard', category: 'flowchart', name: 'کارتی کونکراو', path: 'M 20,0 L 100,0 L 100,100 L 0,100 L 0,20 Z' },
  { id: 'flowChartPunchedTape', category: 'flowchart', name: 'شریتی کونکراو', path: 'M 0,10 Q 25,30 50,10 T 100,10 L 100,90 Q 75,70 50,90 T 0,90 Z' },
  { id: 'flowChartSummingJunction', category: 'flowchart', name: 'خاڵی کۆکردنەوە', path: 'M 0,50 A 50,50 0 1,1 100,50 A 50,50 0 1,1 0,50 Z', lines: 'M 15,15 L 85,85 M 85,15 L 15,85' },
  { id: 'flowChartOr', category: 'flowchart', name: 'یان', path: 'M 0,50 A 50,50 0 1,1 100,50 A 50,50 0 1,1 0,50 Z', lines: 'M 50,0 L 50,100 M 0,50 L 100,50' },
  { id: 'flowChartCollate', category: 'flowchart', name: 'کۆکردنەوەی ڕیزکراو', path: 'M 0,0 L 100,0 L 0,100 L 100,100 Z' },
  { id: 'flowChartSort', category: 'flowchart', name: 'پۆلێنکردن', path: 'M 50,0 L 100,50 L 50,100 L 0,50 Z', lines: 'M 0,50 L 100,50' },
  { id: 'flowChartExtract', category: 'flowchart', name: 'دەرهێنان', path: 'M 50,0 L 100,100 L 0,100 Z' },
  { id: 'flowChartMerge', category: 'flowchart', name: 'تێکەڵکردن', path: 'M 0,0 L 100,0 L 50,100 Z' },
  { id: 'flowChartOnlineStorage', category: 'flowchart', name: 'عەمباری سەرهێڵ', path: 'M 15,0 L 100,0 Q 85,50 100,100 L 15,100 Q 0,50 15,0 Z' },
  { id: 'flowChartMagneticDisk', category: 'flowchart', name: 'دیسکی موگناتیسی', path: 'M 0,15 C 0,-5 100,-5 100,15 L 100,85 C 100,105 0,105 0,85 Z', lines: 'M 0,15 C 0,35 100,35 100,15' },
  { id: 'flowChartMagneticDrum', category: 'flowchart', name: 'دەهۆڵی موگناتیسی', path: 'M 15,0 L 85,0 C 105,0 105,100 85,100 L 15,100 C -5,100 -5,0 15,0 Z', lines: 'M 85,0 C 65,0 65,100 85,100' },
  { id: 'flowChartMagneticTape', category: 'flowchart', name: 'شریتی موگناتیسی', path: 'M 50,100 A 50,50 0 1,1 85.36,85.36 L 100,85.36 L 100,100 Z' },

  // ==========================================
  // 8. ACTION BUTTONS (دوگمەکانی کردار) — plain shapes, no hyperlink behavior
  // ==========================================
  { id: 'actionButtonBlank', category: 'action_buttons', name: 'دوگمەی بەتاڵ', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z' },
  { id: 'actionButtonHome', category: 'action_buttons', name: 'دوگمەی ماڵەوە', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z', detail: 'M 50,20 L 80,48 L 72,48 L 72,80 L 28,80 L 28,48 L 20,48 Z' },
  { id: 'actionButtonHelp', category: 'action_buttons', name: 'دوگمەی یارمەتی', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z', detail: 'M 38,35 Q 38,20 50,20 Q 64,20 64,34 Q 64,44 54,48 L 54,60 L 46,60 L 46,44 Q 56,40 56,34 Q 56,28 50,28 Q 46,28 46,35 Z M 46,66 L 54,66 L 54,76 L 46,76 Z' },
  { id: 'actionButtonInformation', category: 'action_buttons', name: 'دوگمەی زانیاری', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z', detailEvenOdd: true, detail: 'M 20,50 A 30,30 0 1,1 80,50 A 30,30 0 1,1 20,50 Z M 46,42 L 54,42 L 54,70 L 46,70 Z M 46,29 L 54,29 L 54,36 L 46,36 Z' },
  { id: 'actionButtonForwardNext', category: 'action_buttons', name: 'دوگمەی دواتر', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z', detail: 'M 30,20 L 75,50 L 30,80 Z' },
  { id: 'actionButtonBackPrevious', category: 'action_buttons', name: 'دوگمەی پێشوو', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z', detail: 'M 70,20 L 25,50 L 70,80 Z' },
  { id: 'actionButtonEnd', category: 'action_buttons', name: 'دوگمەی کۆتایی', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z', detail: 'M 25,20 L 65,50 L 25,80 Z M 68,20 L 76,20 L 76,80 L 68,80 Z' },
  { id: 'actionButtonBeginning', category: 'action_buttons', name: 'دوگمەی سەرەتا', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z', detail: 'M 75,20 L 35,50 L 75,80 Z M 24,20 L 32,20 L 32,80 L 24,80 Z' },
  { id: 'actionButtonReturn', category: 'action_buttons', name: 'دوگمەی گەڕانەوە', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z', detail: 'M 70,25 L 70,60 Q 70,75 55,75 L 40,75 Q 25,75 25,60 L 25,50 L 15,50 L 30,32 L 45,50 L 35,50 L 35,60 Q 35,65 40,65 L 55,65 Q 60,65 60,60 L 60,25 Z' },
  { id: 'actionButtonDocument', category: 'action_buttons', name: 'دوگمەی بەڵگەنامە', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z', detail: 'M 30,18 L 60,18 L 72,30 L 72,82 L 30,82 Z' },
  { id: 'actionButtonSound', category: 'action_buttons', name: 'دوگمەی دەنگ', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z', detail: 'M 22,40 L 38,40 L 55,22 L 55,78 L 38,60 L 22,60 Z M 62,35 L 68,32 L 75,50 L 68,68 L 62,65 L 67,50 Z' },
  { id: 'actionButtonMovie', category: 'action_buttons', name: 'دوگمەی ڤیدیۆ', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z', detail: 'M 18,35 L 60,35 L 60,65 L 18,65 Z M 60,45 L 82,32 L 82,68 L 60,55 Z' },
];

// Map shape ID to shape object
export const SHAPE_MAP = ALL_SHAPES.reduce((acc, shape) => {
  acc[shape.id] = shape;
  return acc;
}, {});

// --- OpenXML Preset Geometry Names Mapping ---
// Values must be valid ST_ShapeType names (checked by ppt/scripts/checkShapePrst.mjs).
// Shape ids that are already valid names are written as-is.
export const OPENXML_SHAPE_PRST_MAP = {
  ellipse: 'ellipse',
  circle: 'ellipse',
  elbowConnector: 'bentConnector3',
  curvedConnector: 'curvedConnector3',
  snipRound1Rect: 'snipRoundRect',
  lShape: 'corner',
  diagonalStripe: 'diagStripe',
  bezel: 'bevel',
  explosion1: 'irregularSeal1',
  explosion2: 'irregularSeal2',
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

// --- PowerPoint-like Shape Style gallery ---
// Only uses properties the PPTX exporter already writes: solid fill, outline color/width, text color.
const STYLE_DARK_TEXT = '#262626';

const mixHex = (hex, target, t) => {
  const a = hex.replace('#', '');
  const b = target.replace('#', '');
  let out = '#';
  for (let i = 0; i < 6; i += 2) {
    const v = Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t);
    out += v.toString(16).padStart(2, '0');
  }
  return out;
};
const tint = (hex, t) => mixHex(hex, '#ffffff', t);
const shade = (hex, t) => mixHex(hex, '#000000', t);

export const SHAPE_STYLE_COLORS = [
  { id: 'blue', name: 'شین', hex: '#4472c4' },
  { id: 'red', name: 'سوور', hex: '#c00000' },
  { id: 'green', name: 'سەوز', hex: '#70ad47' },
  { id: 'yellow', name: 'زەرد', hex: '#ffc000' },
  { id: 'orange', name: 'پرتەقاڵی', hex: '#ed7d31' },
  { id: 'purple', name: 'مۆر', hex: '#7030a0' },
  { id: 'gray', name: 'خۆڵەمێشی', hex: '#7f7f7f' },
  { id: 'black', name: 'ڕەش', hex: '#262626' },
];

const STYLE_ROW_DEFS = [
  { id: 'outline', title: 'هێڵی ڕەنگاوڕەنگ', make: (c) => ({ fill: '#ffffff', outlineColor: c, outlineWidth: 3, textColor: c }) },
  { id: 'solid', title: 'پڕکراو بە ڕەنگ', make: (c) => ({ fill: c, outlineColor: c, outlineWidth: 0, textColor: '#ffffff' }) },
  { id: 'solid_outline', title: 'پڕکراو و هێڵ', make: (c) => ({ fill: c, outlineColor: shade(c, 0.35), outlineWidth: 3, textColor: '#ffffff' }) },
  { id: 'moderate', title: 'ناوەند', make: (c) => ({ fill: tint(c, 0.85), outlineColor: c, outlineWidth: 2, textColor: STYLE_DARK_TEXT }) },
  { id: 'subtle', title: 'نەرم', make: (c) => ({ fill: tint(c, 0.6), outlineColor: c, outlineWidth: 0, textColor: STYLE_DARK_TEXT }) },
  { id: 'intense', title: 'بەهێز', make: (c) => ({ fill: shade(c, 0.45), outlineColor: tint(c, 0.45), outlineWidth: 3, textColor: '#ffffff' }) },
  { id: 'thick', title: 'هێڵی ئەستوور', make: (c) => ({ fill: '#ffffff', outlineColor: c, outlineWidth: 6, textColor: STYLE_DARK_TEXT }) },
  { id: 'thin', title: 'هێڵی تەنک', make: (c) => ({ fill: 'none', outlineColor: c, outlineWidth: 1, textColor: c }) },
];

// [{ id, title, presets: [{ id, name, fill, outlineColor, outlineWidth, textColor }] }]
export const SHAPE_STYLE_ROWS = STYLE_ROW_DEFS.map((row) => ({
  id: row.id,
  title: row.title,
  presets: SHAPE_STYLE_COLORS.map((color) => ({
    id: `${row.id}_${color.id}`,
    name: color.name,
    ...row.make(color.hex),
  })),
}));

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
        fill={def?.open ? 'none' : fill}
        fillRule={def?.evenOdd ? 'evenodd' : 'nonzero'}
        stroke={stroke}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      {!!def?.detail && (
        <Path
          d={def.detail}
          fill={SHAPE_DETAIL_FILL}
          fillRule={def.detailEvenOdd ? 'evenodd' : 'nonzero'}
          stroke={stroke}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {!!def?.lines && (
        <Path d={def.lines} fill="none" stroke={stroke} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
      )}
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
  const mainFill = def?.open ? 'none' : fill;
  const mainRule = def?.evenOdd ? 'evenodd' : 'nonzero';
  const detailSvg = def?.detail
    ? `<path d="${def.detail}" fill="${SHAPE_DETAIL_FILL}" fill-rule="${def.detailEvenOdd ? 'evenodd' : 'nonzero'}" stroke="${stroke}" stroke-width="${outlineWidth}" vector-effect="non-scaling-stroke" />`
    : '';
  const linesSvg = def?.lines
    ? `<path d="${def.lines}" fill="none" stroke="${stroke}" stroke-width="${outlineWidth}" vector-effect="non-scaling-stroke" />`
    : '';
  return `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="position: absolute; top:0; left:0;">
    <path d="${pathD}" fill="${mainFill}" fill-rule="${mainRule}" stroke="${stroke}" stroke-width="${outlineWidth}" vector-effect="non-scaling-stroke" />
    ${detailSvg}
    ${linesSvg}
  </svg>`;
}

