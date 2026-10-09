import React from 'react';
import Svg, { Path, Rect, Ellipse, Line, Circle, G } from 'react-native-svg';

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

// --- PowerPoint Shape Categories ---
export const SHAPE_CATEGORIES = [
  { id: 'lines_arrows', name: 'هێڵەکان و تیرەکان' },
  { id: 'rectangles_basic', name: 'چوارگۆشە و شێوە سەرەتاییەکان' },
  { id: 'stars_banners', name: 'ئەستێرە و بەنەرەکان' },
  { id: 'callouts_symbols', name: 'بڵقی قسەکردن و هێماکان' },
];

// --- Comprehensive Shape Definitions ---
export const ALL_SHAPES = [
  // --- LINES & ARROWS ---
  { id: 'line', category: 'lines_arrows', name: 'هێڵ' },
  { id: 'arrow', category: 'lines_arrows', name: 'تیری هێڵی' },
  { id: 'doubleArrow', category: 'lines_arrows', name: 'تیری دووسەر' },
  { id: 'rightArrow', category: 'lines_arrows', name: 'تیری بەرەو ڕاست', path: 'M 0,30 L 60,30 L 60,0 L 100,50 L 60,100 L 60,70 L 0,70 Z' },
  { id: 'leftArrow', category: 'lines_arrows', name: 'تیری بەرەو چەپ', path: 'M 40,0 L 0,50 L 40,100 L 40,70 L 100,70 L 100,30 L 40,30 Z' },
  { id: 'upArrow', category: 'lines_arrows', name: 'تیری بەرەو سەرەوە', path: 'M 50,0 L 100,40 L 70,40 L 70,100 L 30,100 L 30,40 L 0,40 Z' },
  { id: 'downArrow', category: 'lines_arrows', name: 'تیری بەرەو خوارەوە', path: 'M 30,0 L 70,0 L 70,60 L 100,60 L 50,100 L 0,60 L 30,60 Z' },
  { id: 'leftRightArrow', category: 'lines_arrows', name: 'تیری ڕاست و چەپ', path: 'M 0,50 L 30,0 L 30,30 L 70,30 L 70,0 L 100,50 L 70,100 L 70,70 L 30,70 L 30,100 Z' },
  { id: 'upDownArrow', category: 'lines_arrows', name: 'تیری سەرەوە و خوارەوە', path: 'M 50,0 L 100,30 L 70,30 L 70,70 L 100,70 L 50,100 L 0,70 L 30,70 L 30,30 L 0,30 Z' },
  { id: 'quadArrow', category: 'lines_arrows', name: 'تیری چوار لایەنە', path: 'M 35,35 L 50,0 L 65,35 L 100,50 L 65,65 L 50,100 L 35,65 L 0,50 Z' },
  { id: 'bentArrow', category: 'lines_arrows', name: 'تیری چەماوە', path: 'M 0,100 L 0,35 L 60,35 L 60,0 L 100,50 L 60,100 L 60,65 L 35,65 L 35,100 Z' },
  { id: 'uturnArrow', category: 'lines_arrows', name: 'تیری پێچاوپێچ (U-Turn)', path: 'M 0,100 L 0,40 C 0,10 50,10 50,40 L 50,20 L 100,60 L 50,100 L 50,80 L 30,80 C 20,80 20,90 20,100 Z' },

  // --- RECTANGLES & BASIC SHAPES ---
  { id: 'rect', category: 'rectangles_basic', name: 'چوارگۆشە', path: 'M 0,0 L 100,0 L 100,100 L 0,100 Z' },
  { id: 'roundRect', category: 'rectangles_basic', name: 'چوارگۆشەی خڕ' },
  { id: 'snip1Rect', category: 'rectangles_basic', name: 'گۆشە بڕاو', path: 'M 0,0 L 80,0 L 100,20 L 100,100 L 0,100 Z' },
  { id: 'ellipse', category: 'rectangles_basic', name: 'بازنە / هێلکەیی' },
  { id: 'triangle', category: 'rectangles_basic', name: 'سێگۆشە', path: 'M 50,0 L 100,100 L 0,100 Z' },
  { id: 'rtTriangle', category: 'rectangles_basic', name: 'سێگۆشەی ڕاستگۆشە', path: 'M 0,0 L 100,100 L 0,100 Z' },
  { id: 'parallelogram', category: 'rectangles_basic', name: 'لاڕێکە', path: 'M 25,0 L 100,0 L 75,100 L 0,100 Z' },
  { id: 'trapezoid', category: 'rectangles_basic', name: 'نیمچە لاڕێکە', path: 'M 20,0 L 80,0 L 100,100 L 0,100 Z' },
  { id: 'diamond', category: 'rectangles_basic', name: 'سەرمێوژ', path: 'M 50,0 L 100,50 L 50,100 L 0,50 Z' },
  { id: 'pentagon', category: 'rectangles_basic', name: 'پێنجلا', path: generatePolygonPath(5) },
  { id: 'hexagon', category: 'rectangles_basic', name: 'شەشلا', path: generatePolygonPath(6) },
  { id: 'heptagon', category: 'rectangles_basic', name: 'حەوتلا', path: generatePolygonPath(7) },
  { id: 'octagon', category: 'rectangles_basic', name: 'هەشتلا', path: generatePolygonPath(8) },
  { id: 'decagon', category: 'rectangles_basic', name: 'دەلا', path: generatePolygonPath(10) },
  { id: 'dodecagon', category: 'rectangles_basic', name: 'دوانزەلا', path: generatePolygonPath(12) },

  // --- STARS & BANNERS ---
  { id: 'star4', category: 'stars_banners', name: 'ئەستێرەی ٤ پەڕە', path: generateStarPath(4, 0.4) },
  { id: 'star5', category: 'stars_banners', name: 'ئەستێرەی ٥ پەڕە', path: generateStarPath(5, 0.38) },
  { id: 'star6', category: 'stars_banners', name: 'ئەستێرەی ٦ پەڕە', path: generateStarPath(6, 0.5) },
  { id: 'star8', category: 'stars_banners', name: 'ئەستێرەی ٨ پەڕە', path: generateStarPath(8, 0.5) },
  { id: 'star10', category: 'stars_banners', name: 'ئەستێرەی ١٠ پەڕە', path: generateStarPath(10, 0.55) },
  { id: 'star12', category: 'stars_banners', name: 'ئەستێرەی ١٢ پەڕە', path: generateStarPath(12, 0.6) },
  { id: 'star16', category: 'stars_banners', name: 'ئەستێرەی ١٦ پەڕە', path: generateStarPath(16, 0.65) },
  { id: 'star24', category: 'stars_banners', name: 'ئەستێرەی ٢٤ پەڕە', path: generateStarPath(24, 0.7) },
  { id: 'star32', category: 'stars_banners', name: 'ئەستێرەی ٣٢ پەڕە', path: generateStarPath(32, 0.75) },
  { id: 'ribbon', category: 'stars_banners', name: 'بەنەری نەوار', path: 'M 0,20 L 20,40 L 0,60 L 20,60 L 20,80 L 80,80 L 80,60 L 100,60 L 80,40 L 100,20 L 80,20 L 80,0 L 20,0 L 20,20 Z' },
  { id: 'ribbon2', category: 'stars_banners', name: 'بەنەری سەرەوە', path: 'M 0,40 L 20,20 L 0,0 L 20,0 L 20,20 L 80,20 L 80,0 L 100,0 L 80,20 L 100,40 L 80,40 L 80,80 L 20,80 L 20,40 Z' },
  { id: 'horizontalScroll', category: 'stars_banners', name: 'تۆماری ئاسۆیی', path: 'M 10,10 C 0,10 0,30 10,30 L 90,30 C 100,30 100,10 90,10 Z M 10,30 L 10,90 C 0,90 0,70 10,70 L 90,70 C 100,70 100,90 90,90 L 90,30 Z' },
  { id: 'verticalScroll', category: 'stars_banners', name: 'تۆماری ستوونی', path: 'M 10,10 C 10,0 30,0 30,10 L 30,90 C 30,100 10,100 10,90 Z M 30,10 L 90,10 C 90,0 70,0 70,10 L 70,90 C 70,100 90,100 90,90 L 30,90 Z' },

  // --- CALLOUTS & SYMBOLS ---
  { id: 'plus', category: 'callouts_symbols', name: 'خاچ / کۆ', path: 'M 33,0 L 67,0 L 67,33 L 100,33 L 100,67 L 67,67 L 67,100 L 33,100 L 33,67 L 0,67 L 0,33 L 33,33 Z' },
  { id: 'heart', category: 'callouts_symbols', name: 'دڵ', path: 'M 50,25 C 50,10 25,0 10,20 C -10,50 35,80 50,100 C 65,80 110,50 90,20 C 75,0 50,10 50,25 Z' },
  { id: 'smileyFace', category: 'callouts_symbols', name: 'ڕووخساری بەدەنگ' },
  { id: 'sun', category: 'callouts_symbols', name: 'خۆر', path: 'M 50,20 A 30,30 0 1,0 50,80 A 30,30 0 1,0 50,20 M 50,0 L 50,12 M 50,88 L 50,100 M 0,50 L 12,50 M 88,50 L 100,50 M 15,15 L 24,24 M 76,76 L 85,85 M 15,85 L 24,76 M 76,24 L 85,15' },
  { id: 'moon', category: 'callouts_symbols', name: 'مانگ', path: 'M 60,0 C 20,0 0,25 0,50 C 0,75 25,100 65,100 C 35,85 25,50 40,20 C 48,7 60,0 60,0 Z' },
  { id: 'cloud', category: 'callouts_symbols', name: 'هەور', path: 'M 20,80 L 80,80 C 95,80 95,60 85,50 C 90,30 70,20 55,30 C 45,15 25,20 20,35 C 5,35 5,80 20,80 Z' },
  { id: 'lightningBolt', category: 'callouts_symbols', name: 'بروسکە', path: 'M 55,0 L 15,55 L 45,55 L 30,100 L 85,40 L 55,40 Z' },
  { id: 'donut', category: 'callouts_symbols', name: 'ئەڵقە (Donut)' },
  { id: 'can', category: 'callouts_symbols', name: 'بڕکە (Cylinder)', path: 'M 0,20 C 0,0 100,0 100,20 L 100,80 C 100,100 0,100 0,80 Z M 0,20 C 0,40 100,40 100,20' },
  { id: 'cube', category: 'callouts_symbols', name: 'شەشپاڵو (Cube)', path: 'M 0,30 L 70,30 L 70,100 L 0,100 Z M 0,30 L 30,0 L 100,0 L 70,30 Z M 70,30 L 100,0 L 100,70 L 70,100 Z' },
  { id: 'wedgeRectCallout', category: 'callouts_symbols', name: 'بڵقی چوارگۆشە', path: 'M 0,0 L 100,0 L 100,75 L 45,75 L 20,100 L 30,75 L 0,75 Z' },
  { id: 'wedgeRoundRectCallout', category: 'callouts_symbols', name: 'بڵقی خڕ', path: 'M 10,0 L 90,0 C 100,0 100,0 100,10 L 100,65 C 100,75 100,75 90,75 L 45,75 L 20,100 L 30,75 L 10,75 C 0,75 0,75 0,65 L 0,10 C 0,0 0,0 10,0 Z' },
  { id: 'wedgeEllipseCallout', category: 'callouts_symbols', name: 'بڵقی بازنەیی' },
  { id: 'cloudCallout', category: 'callouts_symbols', name: 'بڵقی هەوری', path: 'M 20,70 C 5,70 5,30 25,30 C 25,10 60,10 70,25 C 85,15 100,30 95,50 C 100,65 85,80 70,70 Z' },
];

// Map shape ID to shape object
export const SHAPE_MAP = ALL_SHAPES.reduce((acc, shape) => {
  acc[shape.id] = shape;
  return acc;
}, {});

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

  if (shapeType === 'rect') {
    return (
      <Svg width={svgWidth} height={svgHeight} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Rect
          x="1"
          y="1"
          width="98"
          height="98"
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
          x="1"
          y="1"
          width="98"
          height="98"
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
          rx="48"
          ry="48"
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
