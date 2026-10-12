// Toolbar for a selected SmartArt ("نەخشەی زانیاری"). Tabs: دەق (text pane), شێوە (layout),
// ڕەنگ (color schemes), ستایل (SmartArt styles), فۆنت, ڕێک (arrange / convert to shapes).
// Item text is edited in a sheet with ONE TextInput at a time (nothing on the canvas is an input).
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
import { PptSmartArtView } from './PptSmartArtView';
import { KURDISH_FONTS } from './fonts';
import { makeId } from './makeId';
import {
  SMARTART_LAYOUTS,
  SMARTART_CATEGORIES,
  COLOR_SCHEMES,
  SMARTART_STYLES,
  SMARTART_MAX_ITEMS,
  getSmartArtLayout,
  getThemeAccents,
  toGroups,
} from './smartart/engine';

const TABS = [
  { key: 'text', label: 'دەق', icon: 'list-outline' },
  { key: 'layout', label: 'شێوە', icon: 'git-network-outline' },
  { key: 'color', label: 'ڕەنگ', icon: 'color-palette-outline' },
  { key: 'style', label: 'ستایل', icon: 'sparkles-outline' },
  { key: 'font', label: 'فۆنت', icon: 'text-outline' },
  { key: 'arrange', label: 'ڕێک', icon: 'options-outline' },
];

const TEXT_COLORS = ['#ffffff', '#1c1c1e', '#404040', '#1f497d', '#c00000', '#2e7d32', '#7030a0', '#ffc000'];
const SCHEME_GROUPS = [
  { key: 'colorful', label: 'ڕەنگاوڕەنگ' },
  { key: 'accent', label: 'یەک ڕەنگ' },
  { key: 'range', label: 'پلەبەندی ڕەنگ' },
  { key: 'other', label: 'تر' },
];
const STYLE_PREVIEW_ITEMS = [{ text: '١', level: 0 }, { text: '٢', level: 0 }, { text: '٣', level: 0 }];
const MAX_TOTAL_ITEMS = 40;

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

const SectionTitle = ({ children }) => <Text style={styles.sectionTitle}>{children}</Text>;

// Small live preview of a style (3 boxes of "Basic Process")
const StylePreview = ({ elem, styleKey, active, onPress, label }) => {
  const preview = useMemo(
    () => ({ ...elem, layoutId: 'basicProcess', items: STYLE_PREVIEW_ITEMS, style: styleKey, width: 40, height: 14, fontSize: 14 }),
    [elem.colorScheme, elem.accents, styleKey]
  );
  return (
    <TouchableOpacity style={[styles.styleCard, active && styles.cardActive]} onPress={onPress}>
      <View style={styles.styleCanvas}>
        <PptSmartArtView elem={preview} W={288} H={56.7} scale={92 / 288} />
      </View>
      <Text style={[styles.cardText, active && styles.cardTextActive]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
};

export const PptSmartArtToolbar = forwardRef(({
  element,
  onChangeElement,
  theme = null,
  onOpenLayoutPicker,
  onDuplicate,
  onDelete,
  onConvertToShapes,
}, ref) => {
  const [activeTab, setActiveTab] = useState('text');
  const [selIdx, setSelIdx] = useState(0);
  const [editor, setEditor] = useState(null); // { index, text } while the item sheet is open
  const insets = useEditorInsets();
  const { height: windowH } = useWindowDimensions();

  const items = element.items || [];
  const sel = Math.min(selIdx, Math.max(0, items.length - 1));
  const mainCount = toGroups(items).length;
  const accentsNow = useMemo(() => getThemeAccents(theme), [theme]);

  useImperativeHandle(ref, () => ({
    // Back order: item sheet -> tab -> (editor deselects the SmartArt)
    closeSubModal: () => {
      if (editor) {
        setEditor(null);
        return 'smartart item editor';
      }
      return null;
    },
    closeTabPanel: () => {
      if (activeTab !== 'text') {
        setActiveTab('text');
        return 'smartart toolbar tab';
      }
      return null;
    },
  }), [editor, activeTab]);

  const update = (patch) => onChangeElement({ ...element, ...patch });
  const setItems = (next) => update({ items: next });

  // ---- text pane
  const moveItem = (d) => {
    const j = sel + d;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[sel], next[j]] = [next[j], next[sel]];
    setItems(next);
    setSelIdx(j);
  };
  const setLevel = (lvl) => {
    if (sel === 0 && lvl > 0) return; // the first item is always a main item
    setItems(items.map((it, i) => (i === sel ? { ...it, level: lvl } : it)));
  };
  // Indent one step at a time: at most one level deeper than the item above (hierarchies, max 4)
  const curLevel = items[sel] ? items[sel].level || 0 : 0;
  const prevLevel = sel > 0 && items[sel - 1] ? items[sel - 1].level || 0 : -1;
  const canDemote = sel > 0 && curLevel <= prevLevel && curLevel < 4;
  const canPromote = curLevel > 0;
  const deleteItem = () => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== sel));
    setSelIdx(Math.max(0, sel - 1));
  };
  const addItem = () => {
    if (items.length >= MAX_TOTAL_ITEMS) return;
    const level = items[sel] ? items[sel].level || 0 : 0;
    if (level === 0 && mainCount >= SMARTART_MAX_ITEMS) {
      Alert.alert('ئاگاداری', `زۆرترین ژمارەی خاڵی سەرەکی ${SMARTART_MAX_ITEMS}ـە.`);
      return;
    }
    const next = items.slice();
    const at = items.length ? sel + 1 : 0;
    next.splice(at, 0, { id: makeId('item'), text: '', level });
    setItems(next);
    setSelIdx(at);
    setEditor({ index: at, text: '' });
  };
  const saveItemText = () => {
    if (editor) setItems(items.map((it, i) => (i === editor.index ? { ...it, text: editor.text } : it)));
    setEditor(null);
  };

  const layout = getSmartArtLayout(element.layoutId);
  const sameCategory = SMARTART_LAYOUTS.filter((l) => l.category === layout.category);

  const confirmConvert = () => {
    Alert.alert('گۆڕین بۆ شێوە', 'نەخشەکە دەبێتە چەند شێوەیەکی سەربەخۆ و ئیتر وەک نەخشە دەستکاری ناکرێت.', [
      { text: 'نەخێر', style: 'cancel' },
      { text: 'بەڵێ', onPress: onConvertToShapes },
    ]);
  };

  return (
    <View style={styles.toolbarContainer}>
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
        {/* ---------------- دەق ---------------- */}
        {activeTab === 'text' && (
          <View>
            <View style={styles.itemList}>
              {items.map((it, i) => (
                <TouchableOpacity
                  key={it.id || `item_${i}`}
                  style={[styles.itemRow, i === sel && styles.itemRowActive, { marginRight: Math.min(4, it.level || 0) * 18 }]}
                  onPress={() => setSelIdx(i)}
                  onLongPress={() => setEditor({ index: i, text: it.text || '' })}
                >
                  <Text style={styles.itemBullet}>{(it.level || 0) > 0 ? '◦' : '●'}</Text>
                  <Text style={[styles.itemText, !it.text && styles.itemEmpty]} numberOfLines={1}>
                    {it.text || 'دەق بنووسە...'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.actionGrid}>
              <ActionBtn icon="create-outline" label="دەستکاری" onPress={() => items[sel] && setEditor({ index: sel, text: items[sel].text || '' })} disabled={!items[sel]} />
              <ActionBtn icon="add-circle-outline" label="زیادکردن" onPress={addItem} />
              <ActionBtn icon="arrow-up-outline" label="سەرەوە" onPress={() => moveItem(-1)} disabled={sel <= 0} />
              <ActionBtn icon="arrow-down-outline" label="خوارەوە" onPress={() => moveItem(1)} disabled={sel >= items.length - 1} />
              <ActionBtn icon="return-down-back-outline" label="خاڵی لاوەکی" onPress={() => setLevel(curLevel + 1)} disabled={!canDemote} />
              <ActionBtn icon="return-up-forward-outline" label="پلە بەرزکردنەوە" onPress={() => setLevel(curLevel - 1)} disabled={!canPromote} />
              <ActionBtn icon="trash-outline" label="سڕینەوە" onPress={deleteItem} disabled={items.length <= 1} danger />
            </View>
            <Text style={styles.hint}>کرتە بۆ هەڵبژاردن، کرتەی درێژ بۆ دەستکاریکردنی دەق.</Text>
          </View>
        )}

        {/* ---------------- شێوە ---------------- */}
        {activeTab === 'layout' && (
          <View>
            <ActionBtn icon="apps-outline" label="هەموو شێوەکان..." onPress={onOpenLayoutPicker} />
            <SectionTitle>{`شێوەکانی هەمان جۆر (${(SMARTART_CATEGORIES.find((c) => c.key === layout.category) || {}).label || ''}):`}</SectionTitle>
            <View style={styles.chipRow}>
              {sameCategory.map((l) => (
                <TouchableOpacity
                  key={l.id}
                  style={[styles.chip, l.id === element.layoutId && styles.chipActive]}
                  onPress={() => update({ layoutId: l.id })}
                >
                  <Text style={[styles.chipText, l.id === element.layoutId && styles.chipTextActive]}>{l.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ---------------- ڕەنگ ---------------- */}
        {activeTab === 'color' && (
          <View>
            {SCHEME_GROUPS.map((g) => (
              <View key={g.key}>
                <SectionTitle>{g.label}</SectionTitle>
                <View style={styles.schemeGrid}>
                  {COLOR_SCHEMES.filter((s) => s.group === g.key).map((s) => {
                    const fill = s.fill(accentsNow);
                    const active = element.colorScheme === s.key;
                    return (
                      <TouchableOpacity
                        key={s.key}
                        style={[styles.schemeCard, active && styles.cardActive]}
                        onPress={() => update({ colorScheme: s.key, accents: accentsNow })}
                      >
                        <View style={styles.schemeSwatches}>
                          {[0, 1, 2, 3, 4].map((i) => (
                            <View key={i} style={[styles.schemeSwatch, { backgroundColor: fill(i, 5) }]} />
                          ))}
                        </View>
                        <Text style={[styles.cardText, active && styles.cardTextActive]} numberOfLines={1}>{s.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
            <Text style={styles.hint}>ڕەنگەکان لە ڕەنگەکانی تێمی سلایدەکەوە دێن.</Text>
          </View>
        )}

        {/* ---------------- ستایل ---------------- */}
        {activeTab === 'style' && (
          <View style={styles.schemeGrid}>
            {SMARTART_STYLES.map((s) => (
              <StylePreview
                key={s.key}
                elem={element}
                styleKey={s.key}
                label={s.label}
                active={element.style === s.key}
                onPress={() => update({ style: s.key })}
              />
            ))}
          </View>
        )}

        {/* ---------------- فۆنت ---------------- */}
        {activeTab === 'font' && (
          <View>
            <SectionTitle>جۆری فۆنت:</SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fontRow}>
              {KURDISH_FONTS.map((f) => (
                <TouchableOpacity
                  key={f.name}
                  style={[styles.chip, element.kurdishFont === f.name && styles.chipActive]}
                  onPress={() => update({ kurdishFont: f.name })}
                >
                  <Text style={[styles.chipText, element.kurdishFont === f.name && styles.chipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <PptValueCard
              title="گەورەترین قەبارە"
              valueText={`${element.fontSize || 20}`}
              min={8}
              max={40}
              value={element.fontSize || 20}
              onChange={(v) => update({ fontSize: v })}
              chips={[12, 16, 20, 24, 32].map((v) => ({ value: v, label: `${v}` }))}
              style={{ marginTop: 10 }}
            />
            <Text style={styles.hint}>دەق خۆکار بچووک دەبێتەوە تا لەناو هەر شێوەیەکدا جێی ببێتەوە.</Text>
            <View style={styles.actionGrid}>
              <ActionBtn icon="text" label="ئەستوور" active={!!element.bold} onPress={() => update({ bold: !element.bold })} />
            </View>
            <SectionTitle>ڕەنگی دەق:</SectionTitle>
            <View style={styles.swatchRow}>
              <TouchableOpacity style={[styles.autoChip, !element.textColor && styles.chipActive]} onPress={() => update({ textColor: null })}>
                <Text style={styles.autoChipText}>خۆکار</Text>
              </TouchableOpacity>
              {TEXT_COLORS.map((hex) => (
                <TouchableOpacity
                  key={hex}
                  style={[styles.swatch, { backgroundColor: hex }, element.textColor === hex && styles.swatchActive]}
                  onPress={() => update({ textColor: hex })}
                />
              ))}
            </View>
          </View>
        )}

        {/* ---------------- ڕێک ---------------- */}
        {activeTab === 'arrange' && (
          <View>
            <Text style={styles.hint}>بۆ جووڵاندن ڕایبکێشە، و بۆ گۆڕینی قەبارە دەسکەکانی دەوروبەری بەکاربهێنە.</Text>
            <View style={styles.actionGrid}>
              <ActionBtn icon="copy-outline" label="کۆپی" onPress={onDuplicate} />
              <ActionBtn icon="arrow-up-circle-outline" label="هێنانە پێشەوە" onPress={() => update({ zIndex: (element.zIndex || 1) + 1 })} />
              <ActionBtn icon="arrow-down-circle-outline" label="بردنە دواوە" onPress={() => update({ zIndex: Math.max(0, (element.zIndex || 1) - 1) })} />
              <ActionBtn
                icon={element.locked ? 'lock-closed' : 'lock-open-outline'}
                label={element.locked ? 'کردنەوەی قفڵ' : 'قفڵکردن'}
                active={!!element.locked}
                onPress={() => update({ locked: !element.locked })}
              />
              <ActionBtn icon="shapes-outline" label="گۆڕین بۆ شێوە" onPress={confirmConvert} />
              <ActionBtn icon="trash-outline" label="سڕینەوە" onPress={onDelete} danger />
            </View>
          </View>
        )}
      </ScrollView>

      {/* One item editor sheet */}
      <Modal visible={!!editor} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setEditor(null)}>
        <PptSafeAreaRoot style={styles.sheetOverlay}>
          <View style={[styles.sheetBox, { marginTop: insets.top + 24 }]}>
            <Text style={styles.sheetTitle}>دەقی خاڵ</Text>
            <TextInput
              style={styles.sheetInput}
              value={editor ? editor.text : ''}
              onChangeText={(t) => setEditor((e) => (e ? { ...e, text: t } : e))}
              multiline
              autoFocus
              textAlign="right"
              textAlignVertical="top"
              placeholder="دەقەکە بنووسە..."
              placeholderTextColor="#777777"
            />
            <View style={styles.sheetBtnRow}>
              <TouchableOpacity style={[styles.sheetBtn, styles.sheetBtnPrimary]} onPress={saveItemText}>
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
    marginTop: 10,
    marginBottom: 6,
  },
  hint: {
    color: '#8e8e93',
    fontSize: 11,
    textAlign: 'right',
    marginVertical: 6,
  },
  itemList: {
    gap: 4,
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    paddingHorizontal: 10,
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  itemRowActive: {
    borderColor: '#30d158',
    backgroundColor: '#24382a',
  },
  itemBullet: {
    color: '#8e8e93',
    fontSize: 12,
  },
  itemText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    textAlign: 'right',
  },
  itemEmpty: {
    color: '#777777',
  },
  actionGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
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
  chipRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
  },
  fontRow: {
    flexDirection: 'row-reverse',
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
  schemeGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  schemeCard: {
    width: 100,
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 6,
    borderWidth: 1.5,
    borderColor: '#3a3a3c',
    alignItems: 'center',
  },
  schemeSwatches: {
    flexDirection: 'row-reverse',
    gap: 2,
  },
  schemeSwatch: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  styleCard: {
    width: 104,
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 6,
    borderWidth: 1.5,
    borderColor: '#3a3a3c',
    alignItems: 'center',
  },
  styleCanvas: {
    width: 92,
    height: 22,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  cardActive: {
    borderColor: '#30d158',
  },
  cardText: {
    color: '#aaaaaa',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
  },
  cardTextActive: {
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
  autoChip: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#3a3a3c',
    justifyContent: 'center',
  },
  autoChipText: {
    color: '#ffffff',
    fontSize: 11,
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
    minHeight: 80,
    maxHeight: 160,
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
