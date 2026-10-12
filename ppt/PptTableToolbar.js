// Toolbar for a selected table element: rows/columns, ready styles, cell formatting, borders,
// plus a small sheet that edits ONE cell's text (no TextInput ever lives on the canvas).
import React, { useState, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PptValueCard } from './PptValueCard';
import { PptSafeAreaRoot, useEditorInsets } from './useEditorInsets';
import {
  TABLE_STYLES,
  TABLE_LIMITS,
  getCell,
  getCellStyle,
  getTableBorder,
  insertRow,
  deleteRow,
  insertCol,
  deleteCol,
  equalizeColumns,
  getTargetCells,
  setCellProps,
  setCellText,
  applyTableStyle,
  setTableBorder,
} from './tableModel';

const TABS = [
  { key: 'rowcol', label: 'ڕیز و ستوون', icon: 'grid-outline' },
  { key: 'style', label: 'ستایل', icon: 'color-palette-outline' },
  { key: 'cell', label: 'خانە', icon: 'square-outline' },
  { key: 'border', label: 'هێڵ', icon: 'remove-outline' },
];

const SCOPES = [
  { key: 'cell', label: 'خانە' },
  { key: 'row', label: 'هەموو ڕیزەکە' },
  { key: 'col', label: 'هەموو ستوونەکە' },
];

const ALIGNS = [
  { key: 'right', label: 'ڕاست', icon: 'reorder-three-outline' },
  { key: 'center', label: 'ناوەڕاست', icon: 'menu-outline' },
  { key: 'left', label: 'چەپ', icon: 'reorder-three-outline' },
];

const TABLE_PALETTE = [
  '#ffffff', '#f2f2f2', '#bfbfbf', '#7f7f7f', '#404040', '#000000',
  '#dae3f3', '#4472c4', '#1f497d', '#fbe5d6', '#ed7d31', '#c00000',
  '#e2efd9', '#70ad47', '#fff2cc', '#ffc000', '#e5e0ec', '#7030a0',
];

const FONT_CHIPS = [10, 12, 14, 18, 24].map((v) => ({ value: v, label: `${v}` }));
const BORDER_CHIPS = [0, 1, 2, 3, 4].map((v) => ({ value: v, label: `${v}` }));

const KURDISH_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const kd = (n) => String(n).replace(/\d/g, (d) => KURDISH_DIGITS[Number(d)]);

// Row of color swatches; `onReset` adds a "بێ گۆڕین" chip that removes the cell override
const ColorRow = ({ value, onPick, onReset }) => (
  <View style={styles.swatchRow}>
    {onReset && (
      <TouchableOpacity style={styles.resetChip} onPress={onReset}>
        <Text style={styles.resetChipText}>ڕەنگی ستایل</Text>
      </TouchableOpacity>
    )}
    {TABLE_PALETTE.map((hex) => {
      const active = (value || '').toLowerCase() === hex;
      return (
        <TouchableOpacity
          key={`sw_${hex}`}
          style={[styles.swatch, { backgroundColor: hex }, active && styles.swatchActive]}
          onPress={() => onPick(hex)}
        />
      );
    })}
  </View>
);

const ActionBtn = ({ icon, label, onPress, disabled, danger, active }) => (
  <TouchableOpacity
    style={[styles.actionBtn, danger && styles.actionBtnDanger, active && styles.actionBtnActive, disabled && styles.disabled]}
    onPress={onPress}
    disabled={disabled}
  >
    <Ionicons name={icon} size={16} color={danger ? '#ff453a' : active ? '#ffcc00' : '#ffffff'} />
    <Text style={styles.actionBtnText}>{label}</Text>
  </TouchableOpacity>
);

// Mini preview of a ready table style
const StyleCard = ({ style, active, onPress }) => (
  <TouchableOpacity style={[styles.styleCard, active && styles.styleCardActive]} onPress={onPress}>
    <View style={[styles.stylePreview, { borderColor: style.borderColor }]}>
      <View style={[styles.stylePreviewRow, { backgroundColor: style.headerFill }]}>
        <View style={[styles.stylePreviewBar, { backgroundColor: style.headerTextColor }]} />
      </View>
      <View style={[styles.stylePreviewRow, { backgroundColor: style.bodyFill }]}>
        <View style={[styles.stylePreviewBar, { backgroundColor: style.bodyTextColor, opacity: 0.5 }]} />
      </View>
      <View style={[styles.stylePreviewRow, { backgroundColor: style.altRowFill }]}>
        <View style={[styles.stylePreviewBar, { backgroundColor: style.bodyTextColor, opacity: 0.5 }]} />
      </View>
    </View>
    <Text style={[styles.styleCardText, active && styles.styleCardTextActive]} numberOfLines={1}>{style.label}</Text>
  </TouchableOpacity>
);

export const PptTableToolbar = forwardRef(({ element, selectedCell, onSelectCell, onChangeElement }, ref) => {
  const [activeTab, setActiveTab] = useState('rowcol');
  const [scope, setScope] = useState('cell');
  const [editor, setEditor] = useState(null); // { r, c, text } while the cell sheet is open
  const insets = useEditorInsets();
  const { height: windowH } = useWindowDimensions();

  const sel = selectedCell && selectedCell.r < element.rows && selectedCell.c < element.cols ? selectedCell : null;

  const openCellEditor = (r, c) => {
    if (r === undefined || c === undefined) return;
    setEditor({ r, c, text: getCell(element, r, c).text || '' });
  };

  // Back order: cell sheet -> tab panel / cell selection -> (editor deselects the table)
  useImperativeHandle(ref, () => ({
    openCellEditor,
    closeSubModal: () => {
      if (editor) {
        setEditor(null);
        return 'table cell editor';
      }
      return null;
    },
    closeTabPanel: () => {
      if (activeTab !== 'rowcol') {
        setActiveTab('rowcol');
        return 'table toolbar tab';
      }
      if (sel && onSelectCell) {
        onSelectCell(null);
        return 'table cell selection';
      }
      return null;
    },
  }), [editor, activeTab, sel, element]);

  const update = (next) => {
    if (next !== element) onChangeElement(next);
  };

  // Row / column actions work on the selected cell, or on the last row / column
  const r0 = sel ? sel.r : element.rows - 1;
  const c0 = sel ? sel.c : element.cols - 1;
  const canAddRow = element.rows < TABLE_LIMITS.maxRows;
  const canAddCol = element.cols < TABLE_LIMITS.maxCols;

  const addRow = (below) => {
    const at = below ? r0 + 1 : r0;
    update(insertRow(element, at));
    if (sel && onSelectCell) onSelectCell({ r: at, c: c0 });
  };
  // Column 0 is on the right: "right of" = same index, "left of" = index + 1
  const addCol = (toLeft) => {
    const at = toLeft ? c0 + 1 : c0;
    update(insertCol(element, at));
    if (sel && onSelectCell) onSelectCell({ r: r0, c: at });
  };
  const removeRow = () => {
    update(deleteRow(element, r0));
    if (sel && onSelectCell) onSelectCell({ r: Math.min(r0, element.rows - 2), c: c0 });
  };
  const removeCol = () => {
    update(deleteCol(element, c0));
    if (sel && onSelectCell) onSelectCell({ r: r0, c: Math.min(c0, element.cols - 2) });
  };

  const targets = getTargetCells(element, sel, scope);
  const selStyle = sel ? getCellStyle(element, sel.r, sel.c) : null;
  const setCells = (patch) => {
    if (targets.length > 0) update(setCellProps(element, targets, patch));
  };
  const resetCells = (keys) => {
    if (targets.length === 0) return;
    const patch = {};
    keys.forEach((k) => { patch[k] = undefined; });
    update(setCellProps(element, targets, patch));
  };

  const border = getTableBorder(element);

  const saveCellText = () => {
    if (editor) update(setCellText(element, editor.r, editor.c, editor.text));
    setEditor(null);
  };

  const noCellHint = !sel && (
    <Text style={styles.hint}>سەرەتا کرتە لەسەر خانەیەکی خشتەکە بکە.</Text>
  );

  return (
    <View style={styles.toolbarContainer}>
      {/* Selected cell status + edit text */}
      <View style={styles.statusRow}>
        <Text style={styles.statusText}>
          {sel
            ? `خانەی هەڵبژێردراو: ڕیزی ${kd(sel.r + 1)}، ستوونی ${kd(sel.c + 1)}`
            : `خشتە: ${kd(element.rows)} ڕیز × ${kd(element.cols)} ستوون`}
        </Text>
        <TouchableOpacity
          style={[styles.editTextBtn, !sel && styles.disabled]}
          disabled={!sel}
          onPress={() => sel && openCellEditor(sel.r, sel.c)}
        >
          <Ionicons name="create-outline" size={15} color="#ffffff" />
          <Text style={styles.editTextBtnText}>دەستکاریکردنی دەق</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabHeaderRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabHeaderBtn, activeTab === t.key && styles.tabHeaderBtnActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Ionicons name={t.icon} size={15} color={activeTab === t.key ? '#ffffff' : '#aaaaaa'} />
            <Text style={[styles.tabHeaderBtnText, activeTab === t.key && styles.tabHeaderBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={{ maxHeight: Math.round(windowH * 0.34) }}
        contentContainerStyle={styles.tabContentBox}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {activeTab === 'rowcol' && (
          <View>
            <Text style={styles.sectionTitle}>زیادکردن:</Text>
            <View style={styles.actionGrid}>
              <ActionBtn icon="arrow-up-outline" label="ڕیز لە سەرەوە" onPress={() => addRow(false)} disabled={!canAddRow} />
              <ActionBtn icon="arrow-down-outline" label="ڕیز لە خوارەوە" onPress={() => addRow(true)} disabled={!canAddRow} />
              <ActionBtn icon="arrow-forward-outline" label="ستوون لە ڕاست" onPress={() => addCol(false)} disabled={!canAddCol} />
              <ActionBtn icon="arrow-back-outline" label="ستوون لە چەپ" onPress={() => addCol(true)} disabled={!canAddCol} />
            </View>
            <Text style={styles.sectionTitle}>سڕینەوە و ڕێکخستن:</Text>
            <View style={styles.actionGrid}>
              <ActionBtn icon="trash-outline" label="سڕینەوەی ڕیز" onPress={removeRow} disabled={element.rows <= 1} danger />
              <ActionBtn icon="trash-outline" label="سڕینەوەی ستوون" onPress={removeCol} disabled={element.cols <= 1} danger />
              <ActionBtn icon="swap-horizontal-outline" label="یەکسانکردنی پانی" onPress={() => update(equalizeColumns(element))} />
              <ActionBtn
                icon={element.locked ? 'lock-closed' : 'lock-open-outline'}
                label={element.locked ? 'کردنەوەی قفڵ' : 'قفڵکردن'}
                onPress={() => update({ ...element, locked: !element.locked })}
                active={!!element.locked}
              />
            </View>
            {!sel && <Text style={styles.hint}>بێ هەڵبژاردنی خانە، کۆتا ڕیز و ستوون بەکاردێن.</Text>}
          </View>
        )}

        {activeTab === 'style' && (
          <View>
            <Text style={styles.sectionTitle}>ستایلە ئامادەکان:</Text>
            <View style={styles.styleGrid}>
              {TABLE_STYLES.map((st) => (
                <StyleCard
                  key={st.key}
                  style={st}
                  active={element.styleKey === st.key}
                  onPress={() => update(applyTableStyle(element, st.key))}
                />
              ))}
            </View>
            <View style={styles.toggleRow}>
              <ActionBtn
                icon={element.headerRow ? 'checkbox-outline' : 'square-outline'}
                label="ڕیزی سەردێڕ"
                onPress={() => update({ ...element, headerRow: !element.headerRow })}
                active={!!element.headerRow}
              />
              <ActionBtn
                icon={element.bandRows ? 'checkbox-outline' : 'square-outline'}
                label="ڕیزی ڕەنگاوڕەنگ"
                onPress={() => update({ ...element, bandRows: !element.bandRows })}
                active={!!element.bandRows}
              />
            </View>
          </View>
        )}

        {activeTab === 'cell' && (
          <View>
            {noCellHint}
            <View style={styles.scopeRow}>
              {SCOPES.map((s) => (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.scopeChip, scope === s.key && styles.scopeChipActive]}
                  onPress={() => setScope(s.key)}
                >
                  <Text style={[styles.scopeChipText, scope === s.key && styles.scopeChipTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[!sel && styles.disabled]} pointerEvents={sel ? 'auto' : 'none'}>
              <Text style={styles.sectionTitle}>ڕەنگی خانە:</Text>
              <ColorRow value={selStyle?.fill} onPick={(hex) => setCells({ fill: hex })} onReset={() => resetCells(['fill'])} />

              <Text style={styles.sectionTitle}>ڕەنگی دەق:</Text>
              <ColorRow value={selStyle?.color} onPick={(hex) => setCells({ color: hex })} onReset={() => resetCells(['color'])} />

              <PptValueCard
                title="قەبارەی فۆنت"
                valueText={`${selStyle ? selStyle.fontSize : element.fontSize || 14}`}
                min={8}
                max={40}
                step={1}
                value={selStyle ? selStyle.fontSize : element.fontSize || 14}
                onChange={(v) => setCells({ fontSize: v })}
                chips={FONT_CHIPS}
                style={{ marginTop: 8 }}
              />

              <View style={styles.toggleRow}>
                <ActionBtn
                  icon="text"
                  label="ئەستوور"
                  onPress={() => setCells({ bold: !(selStyle && selStyle.bold) })}
                  active={!!selStyle?.bold}
                />
                <ActionBtn
                  icon="text-outline"
                  label="لار"
                  onPress={() => setCells({ italic: !(selStyle && selStyle.italic) })}
                  active={!!selStyle?.italic}
                />
              </View>

              <Text style={styles.sectionTitle}>ڕیزکردنی دەق:</Text>
              <View style={styles.scopeRow}>
                {ALIGNS.map((a) => (
                  <TouchableOpacity
                    key={a.key}
                    style={[styles.scopeChip, selStyle?.align === a.key && styles.scopeChipActive]}
                    onPress={() => setCells({ align: a.key })}
                  >
                    <Text style={[styles.scopeChipText, selStyle?.align === a.key && styles.scopeChipTextActive]}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {activeTab === 'border' && (
          <View>
            <Text style={styles.sectionTitle}>ڕەنگی هێڵ:</Text>
            <ColorRow value={border.color} onPick={(hex) => update(setTableBorder(element, { borderColor: hex }))} />
            <PptValueCard
              title="ئەستووری هێڵ"
              valueText={`${border.width}`}
              min={0}
              max={6}
              step={1}
              value={border.width}
              onChange={(v) => update(setTableBorder(element, { borderWidth: v }))}
              chips={BORDER_CHIPS}
              style={{ marginTop: 8 }}
            />
          </View>
        )}
      </ScrollView>

      {/* One-cell text editor sheet */}
      <Modal
        visible={!!editor}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setEditor(null)}
      >
        <PptSafeAreaRoot style={styles.sheetOverlay}>
          <View style={[styles.sheetBox, { marginTop: insets.top + 24 }]}>
            <Text style={styles.sheetTitle}>
              {editor ? `دەقی خانەی ڕیزی ${kd(editor.r + 1)}، ستوونی ${kd(editor.c + 1)}` : ''}
            </Text>
            <TextInput
              style={styles.sheetInput}
              value={editor ? editor.text : ''}
              onChangeText={(t) => setEditor((e) => (e ? { ...e, text: t } : e))}
              multiline
              autoFocus
              textAlign="right"
              textAlignVertical="top"
              placeholder="دەقی خانەکە بنووسە..."
              placeholderTextColor="#777777"
            />
            <View style={styles.sheetBtnRow}>
              <TouchableOpacity style={[styles.sheetBtn, styles.sheetBtnPrimary]} onPress={saveCellText}>
                <Text style={styles.sheetBtnText}>دانان</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetBtn} onPress={() => setEditor(null)}>
                <Text style={styles.sheetBtnText}>پاشگەزبوونەوە</Text>
              </TouchableOpacity>
            </View>
          </View>
        </PptSafeAreaRoot>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  toolbarContainer: {
    backgroundColor: '#1c1c1e',
    borderTopWidth: 1,
    borderTopColor: '#2c2c2e',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  statusRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  statusText: {
    color: '#30d158',
    fontSize: 12,
    fontWeight: 'bold',
    flexShrink: 1,
    textAlign: 'right',
  },
  editTextBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#8B3A2B',
    paddingHorizontal: 10,
    minHeight: 36,
    borderRadius: 8,
  },
  editTextBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#141416',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  tabHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
    backgroundColor: '#2c2c2e',
    marginRight: 6,
  },
  tabHeaderBtnActive: {
    backgroundColor: '#8B3A2B',
  },
  tabHeaderBtnText: {
    color: '#aaaaaa',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabHeaderBtnTextActive: {
    color: '#ffffff',
  },
  tabContentBox: {
    padding: 10,
    paddingBottom: 16,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 6,
  },
  hint: {
    color: '#8e8e93',
    fontSize: 11,
    textAlign: 'right',
    marginVertical: 6,
  },
  actionGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 10,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  actionBtnDanger: {
    backgroundColor: '#ff453a18',
  },
  actionBtnActive: {
    borderColor: '#ffcc00',
    backgroundColor: '#3a3a10',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  disabled: {
    opacity: 0.35,
  },
  styleGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleCard: {
    width: 96,
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 6,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3a3a3c',
  },
  styleCardActive: {
    borderColor: '#30d158',
  },
  stylePreview: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 3,
    overflow: 'hidden',
  },
  stylePreviewRow: {
    height: 12,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
  },
  stylePreviewBar: {
    width: '55%',
    height: 3,
    borderRadius: 1.5,
  },
  styleCardText: {
    color: '#aaaaaa',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 5,
  },
  styleCardTextActive: {
    color: '#ffffff',
  },
  toggleRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 10,
  },
  scopeRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  scopeChip: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 12,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  scopeChipActive: {
    backgroundColor: '#8B3A2B',
    borderColor: '#8B3A2B',
  },
  scopeChipText: {
    color: '#aaaaaa',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scopeChipTextActive: {
    color: '#ffffff',
  },
  swatchRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: '#30d158',
  },
  resetChip: {
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#3a3a3c',
    justifyContent: 'center',
  },
  resetChipText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 16,
  },
  sheetBox: {
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  sheetTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 10,
  },
  sheetInput: {
    backgroundColor: '#2c2c2e',
    color: '#ffffff',
    borderRadius: 10,
    padding: 10,
    minHeight: 90,
    maxHeight: 180,
    fontSize: 15,
    writingDirection: 'rtl',
  },
  sheetBtnRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 12,
  },
  sheetBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#3a3a3c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnPrimary: {
    backgroundColor: '#2e7d32',
  },
  sheetBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
