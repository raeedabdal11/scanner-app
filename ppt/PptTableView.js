// Draws a table element (canvas, clean slide / thumbnails, preview). Fills and borders are one SVG
// each (gradients, transparency, dashed lines); cell text is plain <Text>. No TextInput lives on
// the canvas: cell text is edited in PptTableToolbar's sheet.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { layoutTable, getCell, getCellStyle, getCellBorders, resolveTableStyle } from './tableModel';
import { getDisplayFontFamily } from './fonts';

const DASH = { dash: '6,4', dot: '1.5,3' };
const VALIGN = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };

const hexToRgba = (hex, alpha) => {
  const h = (hex || '#000000').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const inRange = (cell, sel) => {
  if (!sel) return false;
  const r1 = Math.min(sel.r, sel.r2 ?? sel.r);
  const r2 = Math.max(sel.r, sel.r2 ?? sel.r);
  const c1 = Math.min(sel.c, sel.c2 ?? sel.c);
  const c2 = Math.max(sel.c, sel.c2 ?? sel.c);
  return cell.r <= r2 && cell.r + cell.rs - 1 >= r1 && cell.c <= c2 && cell.c + cell.cs - 1 >= c1;
};

/**
 * scale = on-screen px per slide point; slideHeightPt = slide height in points for this canvas.
 * selectedCell = { r, c, r2?, c2? } (logical); onCellTouch(r, c) gets the anchor of the touched cell.
 */
export const PptTableView = ({ elem, scale, slideHeightPt = 405, selectedCell = null, onCellTouch = null }) => {
  const lay = layoutTable(elem, 720, slideHeightPt);
  const st = resolveTableStyle(elem);
  const W = lay.totalWidthPt * scale;
  const H = lay.totalHeightPt * scale;
  const radius = (st.cornerRadius || 0) * scale;
  const fontFamily = getDisplayFontFamily(elem.kurdishFont || 'Tahoma');
  const shadow = elem.shadow;
  const gradId = (cell) => `tg_${elem.id}_${cell.r}_${cell.c}`;
  const isRange = selectedCell && (selectedCell.r2 !== undefined && (selectedCell.r2 !== selectedCell.r || selectedCell.c2 !== selectedCell.c));

  return (
    <View style={{ width: W, height: H }}>
      {/* Table shadow: a few soft layers behind the table */}
      {shadow && shadow.opacity > 0 &&
        [0, 1, 2].map((i) => {
          const spread = ((shadow.blur || 0) * scale * i) / 3;
          return (
            <View
              key={`sh_${i}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: (shadow.offset || 0) * scale - spread,
                top: (shadow.offset || 0) * scale - spread,
                width: W + spread * 2,
                height: H + spread * 2,
                borderRadius: radius + spread,
                backgroundColor: hexToRgba(shadow.color || '#000000', (shadow.opacity || 0.3) / (i + 2)),
              }}
            />
          );
        })}

      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: W,
          height: H,
          borderRadius: radius,
          overflow: radius > 0 ? 'hidden' : 'visible',
          backgroundColor: elem.bgFill || 'transparent',
        }}
      >
        {/* Fills */}
        <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            {lay.cells.map((cell) => {
              const cs = getCellStyle(elem, cell.r, cell.c);
              if (!cs.fill || !cs.fill2) return null;
              return (
                <LinearGradient key={gradId(cell)} id={gradId(cell)} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={cs.fill} stopOpacity={cs.fillAlpha / 100} />
                  <Stop offset="1" stopColor={cs.fill2} stopOpacity={cs.fillAlpha / 100} />
                </LinearGradient>
              );
            })}
          </Defs>
          {lay.cells.map((cell) => {
            const cs = getCellStyle(elem, cell.r, cell.c);
            if (!cs.fill) return null;
            return (
              <Rect
                key={`f_${cell.r}_${cell.c}`}
                x={cell.x * scale}
                y={cell.y * scale}
                width={cell.w * scale}
                height={cell.h * scale}
                fill={cs.fill2 ? `url(#${gradId(cell)})` : cs.fill}
                fillOpacity={cs.fill2 ? 1 : cs.fillAlpha / 100}
              />
            );
          })}
        </Svg>

        {/* Text (each anchor cell reports touches for cell selection) */}
        {lay.cells.map((cell) => {
          const cs = getCellStyle(elem, cell.r, cell.c);
          return (
            <View
              key={`t_${cell.r}_${cell.c}`}
              onTouchStart={onCellTouch ? () => onCellTouch(cell.r, cell.c) : undefined}
              style={{
                position: 'absolute',
                left: cell.x * scale,
                top: cell.y * scale,
                width: cell.w * scale,
                height: cell.h * scale,
                padding: cs.pad * scale,
                justifyContent: VALIGN[cs.valign] || 'center',
              }}
            >
              <Text
                style={{
                  color: cs.color,
                  fontSize: cs.fontSize * scale,
                  lineHeight: cs.fontSize * scale * 1.25,
                  fontWeight: cs.bold ? 'bold' : 'normal',
                  fontStyle: cs.italic ? 'italic' : 'normal',
                  textAlign: cs.align,
                  writingDirection: cs.dir,
                  fontFamily,
                }}
              >
                {getCell(elem, cell.r, cell.c).text}
              </Text>
            </View>
          );
        })}

        {/* Borders on top (centered on the cell edges) */}
        <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
          {lay.cells.map((cell) => {
            const b = getCellBorders(elem, cell);
            const x1 = cell.x * scale;
            const y1 = cell.y * scale;
            const x2 = (cell.x + cell.w) * scale;
            const y2 = (cell.y + cell.h) * scale;
            const line = (key, side, ax, ay, bx, by) => {
              const pen = b[side];
              if (!pen || !(pen.width > 0)) return null;
              return (
                <Line
                  key={key}
                  x1={ax}
                  y1={ay}
                  x2={bx}
                  y2={by}
                  stroke={pen.color}
                  strokeWidth={Math.max(0.5, pen.width * scale)}
                  strokeDasharray={DASH[pen.dash]}
                  strokeLinecap="square"
                />
              );
            };
            return (
              <React.Fragment key={`b_${cell.r}_${cell.c}`}>
                {line('t', 'top', x1, y1, x2, y1)}
                {line('b', 'bottom', x1, y2, x2, y2)}
                {line('l', 'left', x1, y1, x1, y2)}
                {line('r', 'right', x2, y1, x2, y2)}
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      {/* Selected cell / range */}
      {selectedCell &&
        lay.cells
          .filter((cell) => inRange(cell, selectedCell))
          .map((cell) => (
            <View
              key={`sel_${cell.r}_${cell.c}`}
              pointerEvents="none"
              style={[
                styles.selected,
                {
                  left: cell.x * scale,
                  top: cell.y * scale,
                  width: cell.w * scale,
                  height: cell.h * scale,
                  backgroundColor: isRange ? 'rgba(10,132,255,0.18)' : 'transparent',
                },
              ]}
            />
          ))}
    </View>
  );
};

const styles = StyleSheet.create({
  selected: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: '#0a84ff',
  },
});
