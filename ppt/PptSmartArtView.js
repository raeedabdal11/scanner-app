// Draws a SmartArt element ("نەخشەی زانیاری") from the layout engine's nodes: catalog shapes
// (renderSvgShape) + plain Text. Used by the canvas, thumbnails, the preview and the picker.
// smartArtToHtml() is the same drawing for the PDF.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { renderSvgShape, getShapeSvgHtml } from './shapeCatalog';
import { buildSmartArtNodes } from './smartart/engine';
import { getDisplayFontFamily, getCssFontStack } from './fonts';

const VALIGN = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };
const SHADOW_FILL = 'rgba(0,0,0,0.28)';
const glossFill = (gloss) => (gloss === 'glossy' ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.24)');

// Semi-transparent fills (Venn): rgba on screen / in the PDF, <a:alpha> in the PPTX
const fillColor = (nd) => {
  if (!nd.fill) return 'none';
  if (nd.alpha === undefined || nd.alpha >= 100) return nd.fill;
  const h = nd.fill.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) || 0);
  return `rgba(${r}, ${g}, ${b}, ${(nd.alpha / 100).toFixed(2)})`;
};

// Endpoints of a straight line node (prst "line": top-left -> bottom-right, flipH: top-right -> bottom-left)
const lineEnds = (nd) => ({
  x1: nd.flipH ? nd.x + nd.w : nd.x,
  y1: nd.y,
  x2: nd.flipH ? nd.x : nd.x + nd.w,
  y2: nd.y + nd.h,
});

const shapeTransform = (nd) => {
  const t = [];
  if (nd.rotation) t.push({ rotate: `${nd.rotation}deg` });
  if (nd.flipH) t.push({ scaleX: -1 });
  return t;
};

const ShapeSvg = ({ nd, fill, lineWidth, lineColor }) =>
  renderSvgShape({
    shapeType: nd.shape,
    fill,
    outlineColor: lineColor || 'transparent',
    outlineWidth: lineWidth,
    cornerRadius: nd.cornerRadius,
    svgWidth: '100%',
    svgHeight: '100%',
  });

/** elem + its box in points (W x H) and the on-screen scale (px per point) */
export const PptSmartArtView = ({ elem, W, H, scale }) => {
  const nodes = buildSmartArtNodes(elem, W, H);
  const fontFamily = getDisplayFontFamily(elem.kurdishFont || 'Tahoma');
  return (
    <View style={{ width: W * scale, height: H * scale }} pointerEvents="none">
      {/* Straight connector lines, behind every shape */}
      <Svg width={W * scale} height={H * scale} style={StyleSheet.absoluteFill}>
        {nodes.filter((nd) => nd.isLine).map((nd, k) => {
          const e = lineEnds(nd);
          return (
            <Line
              key={`ln_${k}`}
              x1={e.x1 * scale}
              y1={e.y1 * scale}
              x2={e.x2 * scale}
              y2={e.y2 * scale}
              stroke={nd.line ? nd.line.color : '#7f7f7f'}
              strokeWidth={Math.max(0.5, (nd.line ? nd.line.width : 1.5) * scale)}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
      {nodes.map((nd, k) => {
        if (nd.isLine) return null;
        const box = { left: nd.x * scale, top: nd.y * scale, width: nd.w * scale, height: nd.h * scale };
        const hasShape = !!nd.fill || !!nd.line;
        const lineWidth = nd.line ? Math.max(0.5, nd.line.width * scale) : 0;
        const shadowOff = Math.max(1, 2.5 * scale);
        return (
          <View key={`n_${k}`} style={[styles.abs, box]}>
            {hasShape && (
              <View style={[StyleSheet.absoluteFill, { transform: shapeTransform(nd) }]}>
                {nd.shadow && (
                  <View style={[StyleSheet.absoluteFill, { left: shadowOff, top: shadowOff, right: -shadowOff, bottom: -shadowOff }]}>
                    <ShapeSvg nd={nd} fill={SHADOW_FILL} lineWidth={0} />
                  </View>
                )}
                <ShapeSvg nd={nd} fill={fillColor(nd)} lineWidth={lineWidth} lineColor={nd.line && nd.line.color} />
                {!!nd.gloss && (
                  <View style={styles.glossClip}>
                    <View style={{ width: '100%', height: box.height }}>
                      <ShapeSvg nd={nd} fill={glossFill(nd.gloss)} lineWidth={0} />
                    </View>
                  </View>
                )}
              </View>
            )}
            {!!nd.text && (
              <View style={[StyleSheet.absoluteFill, { padding: nd.inset * scale, justifyContent: VALIGN[nd.valign] || 'center' }]}>
                <Text
                  style={{
                    color: nd.textColor,
                    fontSize: nd.fontSize * scale,
                    lineHeight: nd.fontSize * scale * 1.2,
                    fontWeight: nd.bold ? 'bold' : 'normal',
                    textAlign: nd.align,
                    writingDirection: 'rtl',
                    fontFamily,
                  }}
                >
                  {nd.text}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Same drawing as HTML for the PDF renderer. scale = HTML points per slide point. */
export const smartArtToHtml = (elem, W, H, scale) => {
  const nodes = buildSmartArtNodes(elem, W, H);
  const fontStack = getCssFontStack(elem.kurdishFont || 'Tahoma');
  const pt = (v) => `${(v * scale).toFixed(2)}pt`;
  const svg = (nd, fill, width, color) =>
    getShapeSvgHtml({ shapeType: nd.shape, fill, outlineColor: color || 'transparent', outlineWidth: width, cornerRadius: nd.cornerRadius });
  const lineSvg = `<svg width="${pt(W)}" height="${pt(H)}" viewBox="0 0 ${W} ${H}" style="position:absolute;left:0;top:0;">${nodes
    .filter((nd) => nd.isLine)
    .map((nd) => {
      const e = lineEnds(nd);
      return `<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="${nd.line ? nd.line.color : '#7f7f7f'}" stroke-width="${nd.line ? nd.line.width : 1.5}" stroke-linecap="round" />`;
    })
    .join('')}</svg>`;
  const parts = nodes.filter((nd) => !nd.isLine).map((nd) => {
    const tf = `${nd.rotation ? `rotate(${nd.rotation}deg)` : ''} ${nd.flipH ? 'scaleX(-1)' : ''}`.trim() || 'none';
    const lineW = nd.line ? Math.max(0.5, nd.line.width * scale) : 0;
    const hasShape = !!nd.fill || !!nd.line;
    const shapeHtml = hasShape
      ? `<div style="position:absolute;left:0;top:0;width:100%;height:100%;transform:${tf};">
          ${nd.shadow ? `<div style="position:absolute;left:${pt(2.5)};top:${pt(2.5)};width:100%;height:100%;">${svg(nd, SHADOW_FILL, 0)}</div>` : ''}
          <div style="position:absolute;left:0;top:0;width:100%;height:100%;">${svg(nd, fillColor(nd), lineW, nd.line && nd.line.color)}</div>
          ${nd.gloss ? `<div style="position:absolute;left:0;top:0;width:100%;height:50%;overflow:hidden;"><div style="position:relative;width:100%;height:${pt(nd.h)};">${svg(nd, glossFill(nd.gloss), 0)}</div></div>` : ''}
        </div>`
      : '';
    const textHtml = nd.text
      ? `<div style="position:absolute;left:0;top:0;width:100%;height:100%;box-sizing:border-box;padding:${pt(nd.inset)};
          display:flex;flex-direction:column;justify-content:${{ top: 'flex-start', middle: 'center', bottom: 'flex-end' }[nd.valign] || 'center'};">
          <div dir="rtl" style="color:${nd.textColor};font-size:${pt(nd.fontSize)};line-height:1.2;font-family:${fontStack};
            font-weight:${nd.bold ? 'bold' : 'normal'};text-align:${nd.align};white-space:pre-wrap;word-break:break-word;">${escapeHtml(nd.text)}</div>
        </div>`
      : '';
    return `<div style="position:absolute;left:${pt(nd.x)};top:${pt(nd.y)};width:${pt(nd.w)};height:${pt(nd.h)};">${shapeHtml}${textHtml}</div>`;
  });
  return `<div style="position:relative;width:${pt(W)};height:${pt(H)};">${lineSvg}${parts.join('')}</div>`;
};

const styles = StyleSheet.create({
  abs: {
    position: 'absolute',
  },
  glossClip: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    height: '50%',
    overflow: 'hidden',
  },
});
