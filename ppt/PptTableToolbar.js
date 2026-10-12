// Toolbar for a selected table: PowerPoint "Table Design" + "Layout" in Kurdish.
// Tabs: دیزاین (style gallery + style options), خانە (merge / fill / text), هێڵ (borders),
// قەبارە (row / column size), ڕیز و ستوون (insert / delete), کاریگەری (shadow / background / clear).
// Cell text is edited in a small sheet with ONE TextInput (no TextInput ever lives on the canvas).
import React, { useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PptValueCard } from './PptValueCard';
import { PptSafeAreaRoot, useEditorInsets } from './useEditorInsets';
import * as T from './tableModel';

const kd = T.toKurdishDigits;

const TABS = [
  { key: 'design', label: 'دیزاین', icon: 'color-palette-outline' },
  { key: 'cell', label: 'خانە', icon: 'square-outline' },
  { key: 'border', label: 'هێڵ', icon: 'grid-outline' },
  { key: 'size', label: 'قەبارە', icon: 'resize-outline' },
  { key: 'rowcol', label: 'ڕیز و ستوون', icon: 'add-circle-outline' },
  { key: 'effects', label: 'کاریگەری', icon: 'sparkles-outline' },
];

const OPTIONS = [
  { key: 'headerRow', label: 'ڕیزی سەرەوە' },
  { key: 'totalRow', label: 'ڕیزی کۆتایی' },
  { key: 'firstCol', label: 'ستوونی یەکەم' },
  { key: 'lastCol', label: 'ستوونی کۆتایی' },
  { key: 'bandRows', label: 'ڕیزی هێڵدار' },
  { key: 'bandCols', label: 'ستوونی هێڵدار' },
];

const SCOPES = [
  { key: 'cell', label: 'خانە / ناوچە' },
  { key: 'row', label: 'ڕیز' },
  { key: 'col', label: 'ستوون' },
  { key: 'table', label: 'هەموو خشتە' },
];

const ALIGNS = [
  { key: 'right', label: 'ڕاست' },
  { key: 'center', label: 'ناوەڕاست' },
  { key: 'left', label: 'چەپ' },
];
const VALIGNS = [
  { key: 'top', label: 'سەرەوە' },
  { key: 'middle', label: 'ناوەڕاست' },
  { key: 'bottom', label: 'خوارەوە' },
];
const DIRS = [
  { key: 'rtl', label: 'ڕاست بۆ چەپ' },
  { key: 'ltr', label: 'چەپ بۆ ڕاست' },
];
const DASHES = [
  { key: 'solid', label: 'هێڵی تەواو' },
  { key: 'dash', label: 'پچڕپچڕ' },
  { key: 'dot', label: 'خاڵخاڵ' },
];
const BORDER_PRESETS = [
  { key: 'all', label: 'هەموو', icon: 'grid-outline' },
  { key: 'outside', label: 'دەرەوە', icon: 'square-outline' },
  { key: 'inside', label: 'ناوەوە', icon: 'add-outline' },
  { key: 'none', label: 'هیچ', icon: 'close-outline' },
  { key: 'top', label: 'سەرەوە', icon: 'arrow-up-outline' },
  { key: 'bottom', label: 'خوارەوە', icon: 'arrow-down-outline' },
  { key: 'right', label: 'ڕاست', icon: 'arrow-forward-outline' },
  { key: 'left', label: 'چەپ', icon: 'arrow-back-outline' },
];

const PALETTE = [
  '#ffffff', '#f2f2f2', '#bfbfbf', '#7f7f7f', '#404040', '#000000',
  '#dae3f3', '#4472c4', '#1f497d', '#fbe5d6', '#ed7d31', '#c00000',
  '#e2efd9', '#70ad47', '#fff2cc', '#ffc000', '#e5e0ec', '#7030a0',
];

const chips = (list, suffix = '') => list.map((v) => ({ value: v, label: `${v}${suffix}` }));

// ---- small module-level pieces ----

const ColorRow = ({ value, onPick, extra }) => (
  <View style={styles.swatchRow}>
    {extra}
    {PALETTE.map((hex) => {
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

const SmallChip = ({ label, onPress, active }) => (
  <TouchableOpacity style={[styles.smallChip, active && styles.chipActive]} onPress={onPress}>
    <Text style={[styles.smallChipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const ChipRow = ({ items, value, onPick }) => (
  <View style={styles.chipRow}>
    {items.map((it) => (
      <TouchableOpacity
        key={it.key}
        style={[styles.chip, value === it.key && styles.chipActive]}
        onPress={() => onPick(it.key)}
      >
        <Text style={[styles.chipText, value === it.key && styles.chipTextActive]}>{it.label}</Text>
      </TouchableOpacity>
    ))}
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

const CheckBox = ({ label, value, onToggle }) => (
  <TouchableOpacity style={styles.checkRow} onPress={onToggle}>
    <Ionicons name={value ? 'checkbox' : 'square-outline'} size={20} color={value ? '#30d158' : '#8e8e93'} />
    <Text style={styles.checkText}>{label}</Text>
  </TouchableOpacity>
);

const SectionTitle = ({ children }) => <Text style={styles.sectionTitle}>{children}</Text>;

// Mini 4x3 preview of a gallery style with the table's current style options
const StyleCard = ({ style, options, active, onPress }) => {
  const preview = useMemo(() => {
    const fake = { rows: 4, cols: 3, cells: [], style, ...options };
    return Array.from({ length: 4 }, (_, r) =>
      Array.from({ length: 3 }, (_, c) => T.getCellStyle(fake, r, c))
    );
  }, [style, options]);
  const lineColor = style.borderMode === 'none' ? 'transparent' : style.borderColor;
  return (
    <TouchableOpacity style={[styles.styleCard, active && styles.styleCardActive]} onPress={onPress}>
      <View style={[styles.stylePreview, { borderColor: lineColor, borderRadius: style.cornerRadius ? 5 : 1 }]}>
        {preview.map((row, r) => (
          <View key={`pr_${r}`} style={styles.stylePreviewRow}>
            {row.map((cs, c) => (
              <View
                key={`pc_${c}`}
                style={[
                  styles.stylePreviewCell,
                  {
                    backgroundColor: cs.fill || '#ffffff',
                    borderColor: style.borderMode === 'all' ? lineColor : 'transparent',
                    borderBottomColor: style.borderMode === 'none' ? 'transparent' : lineColor,
                  },
                ]}
              >
                <View style={[styles.stylePreviewBar, { backgroundColor: cs.color, opacity: cs.isHeader ? 1 : 0.45 }]} />
              </View>
            ))}
          </View>
        ))}
      </View>
      <Text style={[styles.styleCardText, active && styles.chipTextActive]} numberOfLines={1}>{style.label}</Text>
    </TouchableOpacity>
  );
};

export const PptTableToolbar = forwardRef(({
  element,
  selectedCell,
  onSelectCell,
  onChangeElement,
  theme = null,
  slideHeightPt = 405,
}, ref) => {
  const [activeTab, setActiveTab] = useState('design');
  const [scope, setScope] = useState('cell');
  const [editor, setEditor] = useState(null); // { r, c, text } while the cell sheet is open
  const [pen, setPen] = useState({ color: '#000000', width: 1, dash: 'solid' });
  const insets = useEditorInsets();
  const { height: windowH } = useWindowDimensions();

  const accents = useMemo(() => T.getThemeAccents(theme), [theme]);
  const gallery = useMemo(() => T.buildTableStyles(accents), [accents]);
  const options = useMemo(() => {
    const o = {};
    OPTIONS.forEach(({ key }) => { o[key] = !!element[key]; });
    return o;
  }, [element.headerRow, element.totalRow, element.firstCol, element.lastCol, element.bandRows, element.bandCols]);

  const sel = selectedCell && selectedCell.r < element.rows && selectedCell.c < element.cols ? selectedCell : null;
  const isRange = !!sel && sel.r2 !== undefined && (sel.r2 !== sel.r || sel.c2 !== sel.c);
  const rect = T.getTargetRect(element, sel, sel ? scope : 'table');
  const selStyle = sel ? T.getCellStyle(element, T.getAnchorOf(element, sel.r, sel.c).r, T.getAnchorOf(element, sel.r, sel.c).c) : null;
  const merged = !!sel && T.isMergedAt(element, sel.r, sel.c);

  const update = (next) => {
    if (next && next !== element) onChangeElement(next);
  };

  const openCellEditor = (r, c) => {
    if (r === undefined || c === undefined) return;
    const a = T.getAnchorOf(element, r, c);
    setEditor({ r: a.r, c: a.c, text: T.getCell(element, a.r, a.c).text || '' });
  };

  // Back order: cell sheet -> tab / cell selection -> (editor deselects the table)
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
      if (sel && sel.rangeMode && onSelectCell) {
        onSelectCell({ r: sel.r, c: sel.c });
        return 'table range mode';
      }
      if (activeTab !== 'design') {
        setActiveTab('design');
        return 'table toolbar tab';
      }
      if (sel && onSelectCell) {
        onSelectCell(null);
        return 'table cell selection';
      }
      return null;
    },
  }), [editor, activeTab, sel, element]);

  const setCells = (patch) => update(T.setCellsProps(element, rect, patch));
  const resetCells = (keys) => {
    const patch = {};
    keys.forEach((k) => { patch[k] = undefined; });
    update(T.setCellsProps(element, rect, patch));
  };

  // ---- rows / columns (on the selected cell, or the last row / column)
  const r0 = sel ? sel.r : element.rows - 1;
  const c0 = sel ? sel.c : element.cols - 1;
  const addRow = (below) => {
    const at = below ? r0 + 1 : r0;
    update(T.insertRow(element, at));
    if (sel && onSelectCell) onSelectCell({ r: at, c: c0 });
  };
  // Column 0 is on the right: "right of" = same index, "left of" = index + 1
  const addCol = (toLeft) => {
    const at = toLeft ? c0 + 1 : c0;
    update(T.insertCol(element, at));
    if (sel && onSelectCell) onSelectCell({ r: r0, c: at });
  };
  const removeRow = () => {
    update(T.deleteRow(element, r0));
    if (sel && onSelectCell) onSelectCell({ r: Math.max(0, Math.min(r0, element.rows - 2)), c: c0 });
  };
  const removeCol = () => {
    update(T.deleteCol(element, c0));
    if (sel && onSelectCell) onSelectCell({ r: r0, c: Math.max(0, Math.min(c0, element.cols - 2)) });
  };

  const rowPt = sel ? Math.round(T.getRowHeightPt(element, sel.r, slideHeightPt)) : 0;
  const colPt = sel ? Math.round(T.getColWidthPt(element, sel.c)) : 0;

  const saveCellText = () => {
    if (editor) update(T.setCellText(element, editor.r, editor.c, editor.text));
    setEditor(null);
  };

  const confirmClear = () => {
    Alert.alert('پاککردنەوەی شێواز', 'هەموو ڕەنگ و هێڵ و شێوازی خشتەکە لادەبرێت (دەق دەمێنێتەوە).', [
      { text: 'نەخێر', style: 'cancel' },
      { text: 'بەڵێ', style: 'destructive', onPress: () => update(T.clearTableFormatting(element)) },
    ]);
  };

  const needCell = !sel && (
    <Text style={styles.hint}>سەرەتا کرتە لەسەر خانەیەکی خشتەکە بکە.</Text>
  );
  const scopeRow = (
    <View>
      <SectionTitle>جێبەجێکردن لەسەر:</SectionTitle>
      <ChipRow items={SCOPES} value={sel ? scope : 'table'} onPick={setScope} />
    </View>
  );

  const shadow = element.shadow;
  const setShadow = (patch) => update({ ...element, shadow: { offset: 3, blur: 6, opacity: 0.35, color: '#000000', ...(shadow || {}), ...patch } });

  return (
    <View style={styles.toolbarContainer}>
      {/* Selected cell status + edit text */}
      <View style={styles.statusRow}>
        <Text style={styles.statusText} numberOfLines={1}>
          {sel && sel.rangeMode
            ? 'کرتە لەسەر خانەی کۆتایی ناوچەکە بکە'
            : isRange
            ? `ناوچە: ${kd(Math.abs(sel.r2 - sel.r) + 1)} ڕیز × ${kd(Math.abs(sel.c2 - sel.c) + 1)} ستوون`
            : sel
            ? `ڕیزی ${kd(sel.r + 1)}، ستوونی ${kd(sel.c + 1)}`
            : `خشتە: ${kd(element.rows)} ڕیز × ${kd(element.cols)} ستوون`}
        </Text>
        <TouchableOpacity
          style={[styles.editTextBtn, !sel && styles.disabled]}
          disabled={!sel}
          onPress={() => sel && openCellEditor(sel.r, sel.c)}
        >
          <Ionicons name="create-outline" size={15} color="#ffffff" />
          <Text style={styles.editTextBtnText}>دەق</Text>
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
        style={{ maxHeight: Math.round(windowH * 0.36) }}
        contentContainerStyle={styles.tabContentBox}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {/* ---------------- دیزاین ---------------- */}
        {activeTab === 'design' && (
          <View>
            <SectionTitle>هەڵبژاردنەکانی ستایل:</SectionTitle>
            <View style={styles.checkGrid}>
              {OPTIONS.map((o) => (
                <CheckBox
                  key={o.key}
                  label={o.label}
                  value={!!element[o.key]}
                  onToggle={() => update(T.setTableOption(element, o.key, !element[o.key]))}
                />
              ))}
            </View>
            {T.TABLE_STYLE_GROUPS.map((g) => (
              <View key={g.key}>
                <SectionTitle>{g.label}</SectionTitle>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
                  {gallery.filter((s) => s.group === g.key).map((s) => (
                    <StyleCard
                      key={s.key}
                      style={s}
                      options={options}
                      active={element.styleKey === s.key}
                      onPress={() => update(T.applyTableStyle(element, s))}
                    />
                  ))}
                </ScrollView>
              </View>
            ))}
          </View>
        )}

        {/* ---------------- خانە ---------------- */}
        {activeTab === 'cell' && (
          <View>
            {needCell}
            <View style={styles.actionGrid}>
              <ActionBtn
                icon="scan-outline"
                label={sel && sel.rangeMode ? 'هەڵوەشاندنەوەی ناوچە' : 'هەڵبژاردنی ناوچە'}
                onPress={() => sel && onSelectCell(sel.rangeMode ? { r: sel.r, c: sel.c } : { r: sel.r, c: sel.c, rangeMode: true })}
                disabled={!sel}
                active={!!sel && !!sel.rangeMode}
              />
              <ActionBtn
                icon="contract-outline"
                label="تێکەڵکردنی خانەکان"
                onPress={() => {
                  const r = T.getTargetRect(element, sel, 'cell');
                  update(T.mergeCells(element, r));
                  onSelectCell({ r: r.r1, c: r.c1 });
                }}
                disabled={!isRange}
              />
              <ActionBtn
                icon="expand-outline"
                label="جیاکردنەوەی خانە"
                onPress={() => update(T.splitCell(element, sel.r, sel.c))}
                disabled={!merged}
              />
            </View>

            <View style={[!sel && styles.disabled]} pointerEvents={sel ? 'auto' : 'none'}>
              {scopeRow}

              <SectionTitle>ڕەنگی خانە:</SectionTitle>
              <ColorRow
                value={selStyle?.fill}
                onPick={(hex) => setCells({ fill: hex, fill2: selStyle?.fill2 ? selStyle.fill2 : undefined })}
                extra={
                  <>
                    <SmallChip label="ستایل" onPress={() => resetCells(['fill', 'fill2', 'fillAlpha'])} />
                    <SmallChip label="بێ ڕەنگ" onPress={() => setCells({ fill: 'none', fill2: undefined })} />
                  </>
                }
              />
              <View style={styles.toggleRow}>
                <ActionBtn
                  icon={selStyle?.fill2 ? 'checkbox-outline' : 'square-outline'}
                  label="پلەبەندی (دوو ڕەنگ)"
                  active={!!selStyle?.fill2}
                  onPress={() =>
                    setCells(selStyle?.fill2
                      ? { fill: selStyle.fill, fill2: undefined } // also turns off a style's gradient header
                      : { fill: selStyle?.fill || '#4472c4', fill2: '#ffffff' })
                  }
                />
              </View>
              {!!selStyle?.fill2 && (
                <View>
                  <SectionTitle>ڕەنگی دووەمی پلەبەندی:</SectionTitle>
                  <ColorRow value={selStyle.fill2} onPick={(hex) => setCells({ fill: selStyle.fill, fill2: hex })} />
                </View>
              )}
              <PptValueCard
                title="ڕوونی ڕەنگ"
                valueText={`${selStyle ? selStyle.fillAlpha : 100}%`}
                min={0}
                max={100}
                step={5}
                stepAmount={10}
                value={selStyle ? selStyle.fillAlpha : 100}
                onChange={(v) => setCells({ fillAlpha: v })}
                chips={chips([25, 50, 75, 100], '%')}
                style={{ marginTop: 8 }}
              />

              <SectionTitle>ڕەنگی دەق:</SectionTitle>
              <ColorRow
                value={selStyle?.color}
                onPick={(hex) => setCells({ color: hex })}
                extra={<SmallChip label="ستایل" onPress={() => resetCells(['color'])} />}
              />

              <PptValueCard
                title="قەبارەی فۆنت"
                valueText={`${selStyle ? selStyle.fontSize : element.fontSize || 14}`}
                min={8}
                max={40}
                value={selStyle ? selStyle.fontSize : element.fontSize || 14}
                onChange={(v) => setCells({ fontSize: v })}
                chips={chips([10, 12, 14, 18, 24])}
                style={{ marginTop: 8 }}
              />
              <View style={styles.toggleRow}>
                <ActionBtn icon="text" label="ئەستوور" active={!!selStyle?.bold} onPress={() => setCells({ bold: !selStyle?.bold })} />
                <ActionBtn icon="text-outline" label="لار" active={!!selStyle?.italic} onPress={() => setCells({ italic: !selStyle?.italic })} />
              </View>

              <SectionTitle>ڕیزکردنی ئاسۆیی:</SectionTitle>
              <ChipRow items={ALIGNS} value={selStyle?.align} onPick={(v) => setCells({ align: v })} />
              <SectionTitle>ڕیزکردنی ستوونی:</SectionTitle>
              <ChipRow items={VALIGNS} value={selStyle?.valign} onPick={(v) => setCells({ valign: v })} />
              <SectionTitle>ئاراستەی دەق:</SectionTitle>
              <ChipRow items={DIRS} value={selStyle?.dir} onPick={(v) => setCells({ dir: v })} />

              <PptValueCard
                title="بۆشایی ناو خانە"
                valueText={`${selStyle ? selStyle.pad : T.TABLE_CELL_PAD_PT}`}
                min={0}
                max={20}
                value={selStyle ? selStyle.pad : T.TABLE_CELL_PAD_PT}
                onChange={(v) => setCells({ pad: v })}
                chips={chips([0, 2, 4, 8, 12])}
                style={{ marginTop: 8 }}
              />
            </View>
          </View>
        )}

        {/* ---------------- هێڵ ---------------- */}
        {activeTab === 'border' && (
          <View>
            {sel ? scopeRow : <Text style={styles.hint}>بێ هەڵبژاردنی خانە، لەسەر هەموو خشتە جێبەجێ دەکرێت.</Text>}
            <SectionTitle>ڕەنگی هێڵ:</SectionTitle>
            <ColorRow value={pen.color} onPick={(hex) => setPen((p) => ({ ...p, color: hex }))} />
            <PptValueCard
              title="ئەستووری هێڵ"
              valueText={`${pen.width}`}
              min={0.5}
              max={6}
              step={0.5}
              stepAmount={0.5}
              value={pen.width}
              onChange={(v) => setPen((p) => ({ ...p, width: v }))}
              chips={chips([0.5, 1, 2, 3, 4])}
              style={{ marginTop: 8 }}
            />
            <SectionTitle>شێوەی هێڵ:</SectionTitle>
            <ChipRow items={DASHES} value={pen.dash} onPick={(v) => setPen((p) => ({ ...p, dash: v }))} />
            <SectionTitle>دانانی هێڵ:</SectionTitle>
            <View style={styles.actionGrid}>
              {BORDER_PRESETS.map((b) => (
                <ActionBtn
                  key={b.key}
                  icon={b.icon}
                  label={b.label}
                  danger={b.key === 'none'}
                  onPress={() => update(T.applyBorderPreset(element, rect, b.key, pen))}
                />
              ))}
            </View>
          </View>
        )}

        {/* ---------------- قەبارە ---------------- */}
        {activeTab === 'size' && (
          <View>
            {needCell}
            {sel && (
              <View>
                <PptValueCard
                  title={`بەرزی ڕیزی ${kd(sel.r + 1)} (پۆینت)`}
                  valueText={`${rowPt}`}
                  min={10}
                  max={200}
                  value={rowPt}
                  onChange={(v) => update(T.setRowHeightPt(element, sel.r, v, slideHeightPt))}
                  chips={chips([20, 30, 40, 60, 80])}
                />
                <PptValueCard
                  title={`پانی ستوونی ${kd(sel.c + 1)} (پۆینت)`}
                  valueText={`${colPt}`}
                  min={20}
                  max={600}
                  step={5}
                  stepAmount={5}
                  value={colPt}
                  onChange={(v) => update(T.setColWidthPt(element, sel.c, v))}
                  chips={chips([60, 100, 150, 200, 300])}
                />
              </View>
            )}
            <View style={styles.actionGrid}>
              <ActionBtn icon="reorder-four-outline" label="یەکسانکردنی ڕیزەکان" onPress={() => update(T.distributeRows(element))} />
              <ActionBtn icon="swap-horizontal-outline" label="یەکسانکردنی ستوونەکان" onPress={() => update(T.equalizeColumns(element))} />
              <ActionBtn icon="resize-outline" label="گونجاندن لەگەڵ دەق" onPress={() => update(T.autoFitRows(element, slideHeightPt))} />
              <ActionBtn
                icon={element.lockAspect ? 'lock-closed' : 'lock-open-outline'}
                label="قفڵی ڕێژەی قەبارە"
                active={!!element.lockAspect}
                onPress={() => update({ ...element, lockAspect: !element.lockAspect })}
              />
            </View>
          </View>
        )}

        {/* ---------------- ڕیز و ستوون ---------------- */}
        {activeTab === 'rowcol' && (
          <View>
            <SectionTitle>زیادکردن:</SectionTitle>
            <View style={styles.actionGrid}>
              <ActionBtn icon="arrow-up-outline" label="ڕیز لە سەرەوە" onPress={() => addRow(false)} disabled={element.rows >= T.TABLE_LIMITS.maxRows} />
              <ActionBtn icon="arrow-down-outline" label="ڕیز لە خوارەوە" onPress={() => addRow(true)} disabled={element.rows >= T.TABLE_LIMITS.maxRows} />
              <ActionBtn icon="arrow-forward-outline" label="ستوون لە ڕاست" onPress={() => addCol(false)} disabled={element.cols >= T.TABLE_LIMITS.maxCols} />
              <ActionBtn icon="arrow-back-outline" label="ستوون لە چەپ" onPress={() => addCol(true)} disabled={element.cols >= T.TABLE_LIMITS.maxCols} />
            </View>
            <SectionTitle>سڕینەوە:</SectionTitle>
            <View style={styles.actionGrid}>
              <ActionBtn icon="trash-outline" label="سڕینەوەی ڕیز" onPress={removeRow} disabled={element.rows <= 1} danger />
              <ActionBtn icon="trash-outline" label="سڕینەوەی ستوون" onPress={removeCol} disabled={element.cols <= 1} danger />
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

        {/* ---------------- کاریگەری ---------------- */}
        {activeTab === 'effects' && (
          <View>
            <View style={styles.toggleRow}>
              <ActionBtn
                icon={shadow ? 'checkbox-outline' : 'square-outline'}
                label="سێبەری خشتە"
                active={!!shadow}
                onPress={() => update({ ...element, shadow: shadow ? null : { offset: 3, blur: 6, opacity: 0.35, color: '#000000' } })}
              />
            </View>
            {!!shadow && (
              <View>
                <PptValueCard
                  title="دووری"
                  valueText={`${shadow.offset}`}
                  min={0}
                  max={10}
                  value={shadow.offset}
                  onChange={(v) => setShadow({ offset: v })}
                  chips={chips([0, 2, 4, 6, 10])}
                  style={{ marginTop: 8 }}
                />
                <PptValueCard
                  title="نەرمی"
                  valueText={`${shadow.blur}`}
                  min={0}
                  max={15}
                  value={shadow.blur}
                  onChange={(v) => setShadow({ blur: v })}
                  chips={chips([0, 3, 6, 10, 15])}
                />
                <PptValueCard
                  title="تۆخی"
                  valueText={`${Math.round(shadow.opacity * 100)}%`}
                  min={10}
                  max={100}
                  step={10}
                  stepAmount={10}
                  value={Math.round(shadow.opacity * 100)}
                  onChange={(v) => setShadow({ opacity: v / 100 })}
                  chips={chips([20, 40, 60, 80, 100], '%')}
                />
                <SectionTitle>ڕەنگی سێبەر:</SectionTitle>
                <ColorRow value={shadow.color} onPick={(hex) => setShadow({ color: hex })} />
              </View>
            )}
            <SectionTitle>ڕەنگی پشتەوەی خشتە:</SectionTitle>
            <ColorRow
              value={element.bgFill}
              onPick={(hex) => update({ ...element, bgFill: hex })}
              extra={<SmallChip label="بێ ڕەنگ" onPress={() => update({ ...element, bgFill: null })} />}
            />
            <View style={[styles.actionGrid, { marginTop: 12 }]}>
              <ActionBtn icon="refresh-outline" label="پاککردنەوەی شێوازی خشتە" onPress={confirmClear} danger />
            </View>
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
    paddingHorizontal: 12,
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
    paddingBottom: 18,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 6,
  },
  hint: {
    color: '#8e8e93',
    fontSize: 11,
    textAlign: 'right',
    marginVertical: 6,
  },
  checkGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
  },
  checkRow: {
    width: '50%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
  },
  checkText: {
    color: '#ffffff',
    fontSize: 12,
  },
  galleryRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    paddingBottom: 2,
  },
  styleCard: {
    width: 84,
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 5,
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
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  stylePreviewRow: {
    flexDirection: 'row-reverse',
  },
  stylePreviewCell: {
    flex: 1,
    height: 11,
    borderWidth: 0.5,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 2,
  },
  stylePreviewBar: {
    width: '70%',
    height: 2.5,
    borderRadius: 1,
  },
  styleCardText: {
    color: '#aaaaaa',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
  },
  actionGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
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
  toggleRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 12,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  chipActive: {
    backgroundColor: '#8B3A2B',
    borderColor: '#8B3A2B',
  },
  chipText: {
    color: '#aaaaaa',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chipTextActive: {
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
  smallChip: {
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#3a3a3c',
    justifyContent: 'center',
  },
  smallChipText: {
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
