// Draws a table element (canvas, clean slide / thumbnails, preview). Plain Views + Text only:
// no TextInput lives on the canvas; cell text is edited in PptTableToolbar's sheet.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { layoutTable, getCell, getCellStyle, getTableBorder, TABLE_CELL_PAD_PT } from './tableModel';
import { getDisplayFontFamily } from './fonts';

/**
 * scale = on-screen px per slide point; slideHeightPt = slide height in points for this canvas.
 * Column 0 is on the RIGHT (row-reverse). Each cell draws half the border width on all sides
 * (plus the outer frame), so inner lines are one full border wide.
 */
export const PptTableView = ({ elem, scale, slideHeightPt = 405, selectedCell = null, onCellTouch = null }) => {
  const lay = layoutTable(elem, 720, slideHeightPt);
  const border = getTableBorder(elem);
  const half = (border.width * scale) / 2;
  const fontFamily = getDisplayFontFamily(elem.kurdishFont || 'Tahoma');

  return (
    <View
      style={{
        width: lay.totalWidthPt * scale,
        height: lay.totalHeightPt * scale,
        borderWidth: half,
        borderColor: border.color,
      }}
    >
      {lay.rowHeightsPt.map((rowH, r) => (
        <View key={`tr_${r}`} style={[styles.row, { height: rowH * scale }]}>
          {lay.colWidthsPt.map((colW, c) => {
            const cs = getCellStyle(elem, r, c);
            const isSel = !!selectedCell && selectedCell.r === r && selectedCell.c === c;
            return (
              <View
                key={`td_${r}_${c}`}
                onTouchStart={onCellTouch ? () => onCellTouch(r, c) : undefined}
                style={{
                  width: colW * scale,
                  height: '100%',
                  backgroundColor: cs.fill,
                  borderWidth: half,
                  borderColor: border.color,
                  justifyContent: 'center',
                  paddingHorizontal: TABLE_CELL_PAD_PT * scale,
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
                    writingDirection: 'rtl',
                    fontFamily,
                  }}
                >
                  {getCell(elem, r, c).text}
                </Text>
                {isSel && <View pointerEvents="none" style={styles.selectedCell} />}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
  },
  selectedCell: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderWidth: 2.5,
    borderColor: '#0a84ff',
  },
});
