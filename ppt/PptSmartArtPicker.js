// "هەڵبژاردنی نەخشەی زانیاری" (like PowerPoint's "Choose a SmartArt Graphic"): categories on the
// right (RTL), a lazy grid of thumbnails drawn by the real layout engine, and the selected layout's
// name + description with an insert / change button.
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PptSafeAreaRoot, useEditorInsets } from './useEditorInsets';
import { PptSmartArtView } from './PptSmartArtView';
import { SMARTART_CATEGORIES, SMARTART_LAYOUTS, SAMPLE_ITEMS, DEFAULT_ACCENTS } from './smartart/engine';

const THUMB_BOX = { width: 90, height: 60 }; // element % used for thumbnails
const THUMB_W_PT = (THUMB_BOX.width / 100) * 720;
const THUMB_H_PT = (THUMB_BOX.height / 100) * 405;

// One thumbnail; memoized so selecting a layout does not redraw every preview
const LayoutThumb = React.memo(({ layout, width, selected, onPick, items, accents }) => {
  const elem = useMemo(() => ({
    layoutId: layout.id,
    items: items || layout.sample || SAMPLE_ITEMS,
    colorScheme: 'colorful1',
    style: 'simple',
    accents: accents || DEFAULT_ACCENTS,
    kurdishFont: 'Tahoma',
    fontSize: 20,
    width: THUMB_BOX.width,
    height: THUMB_BOX.height,
  }), [layout.id, items, accents]);
  const scale = (width - 12) / THUMB_W_PT;
  return (
    <TouchableOpacity style={[styles.thumb, { width }, selected && styles.thumbActive]} onPress={() => onPick(layout.id)}>
      <View style={[styles.thumbCanvas, { width: width - 12, height: THUMB_H_PT * scale }]}>
        <PptSmartArtView elem={elem} W={THUMB_W_PT} H={THUMB_H_PT} scale={scale} />
      </View>
      <Text style={[styles.thumbName, selected && styles.thumbNameActive]} numberOfLines={2}>{layout.name}</Text>
    </TouchableOpacity>
  );
});

export const PptSmartArtPicker = ({ visible, mode = 'insert', currentLayoutId, items, accents, onClose, onPick }) => {
  const insets = useEditorInsets();
  const { width: winW } = useWindowDimensions();
  const [category, setCategory] = useState('all');
  const [selectedId, setSelectedId] = useState(currentLayoutId || SMARTART_LAYOUTS[0].id);
  // The picker stays mounted: start from the current layout every time it opens
  useEffect(() => {
    if (visible) setSelectedId(currentLayoutId || SMARTART_LAYOUTS[0].id);
  }, [visible, currentLayoutId]);

  const cat = SMARTART_CATEGORIES.find((c) => c.key === category) || SMARTART_CATEGORIES[0];
  const layouts = useMemo(
    () => (category === 'all' ? SMARTART_LAYOUTS : SMARTART_LAYOUTS.filter((l) => l.category === category)),
    [category]
  );
  const selected = SMARTART_LAYOUTS.find((l) => l.id === selectedId) || SMARTART_LAYOUTS[0];

  const catW = 96;
  const gridW = winW - catW - insets.left - insets.right - 12;
  const thumbW = Math.floor((gridW - 18) / 2);
  const thumbItems = mode === 'change' && items && items.length ? items : null;

  const onPickThumb = useCallback((id) => setSelectedId(id), []);
  const renderItem = useCallback(
    ({ item }) => (
      <LayoutThumb
        layout={item}
        width={thumbW}
        selected={item.id === selectedId}
        onPick={onPickThumb}
        items={thumbItems}
        accents={accents}
      />
    ),
    [thumbW, selectedId, onPickThumb, thumbItems, accents]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <PptSafeAreaRoot style={styles.overlay}>
        <View style={[styles.sheet, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 8, paddingLeft: insets.left, paddingRight: insets.right }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.title}>{mode === 'change' ? 'گۆڕینی شێوەی نەخشە' : 'هەڵبژاردنی نەخشەی زانیاری'}</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.body}>
            {/* Categories (right side in RTL) */}
            <View style={[styles.catColumn, { width: catW }]}>
              {SMARTART_CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.catBtn, category === c.key && styles.catBtnActive]}
                  onPress={() => setCategory(c.key)}
                >
                  <Text style={[styles.catText, category === c.key && styles.catTextActive, !c.ready && styles.catSoon]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Thumbnails */}
            <View style={styles.gridArea}>
              {cat.ready ? (
                <FlatList
                  key={category}
                  data={layouts}
                  keyExtractor={(l) => l.id}
                  renderItem={renderItem}
                  numColumns={2}
                  columnWrapperStyle={styles.gridRow}
                  contentContainerStyle={{ paddingBottom: 12 }}
                  initialNumToRender={6}
                  maxToRenderPerBatch={6}
                  windowSize={5}
                  removeClippedSubviews
                />
              ) : (
                <View style={styles.soonBox}>
                  <Ionicons name="time-outline" size={36} color="#8e8e93" />
                  <Text style={styles.soonText}>بەم زووانە</Text>
                  <Text style={styles.soonSub}>ئەم جۆرە لە وەشانی داهاتوودا زیاد دەکرێت.</Text>
                </View>
              )}
            </View>
          </View>

          {/* Selected layout */}
          <View style={styles.infoBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoName}>{selected.name}</Text>
              <Text style={styles.infoDesc} numberOfLines={2}>{selected.desc}</Text>
            </View>
            <TouchableOpacity style={styles.insertBtn} onPress={() => onPick(selected.id)}>
              <Ionicons name={mode === 'change' ? 'swap-horizontal-outline' : 'add-circle-outline'} size={18} color="#ffffff" />
              <Text style={styles.insertText}>{mode === 'change' ? 'گۆڕین' : 'دانان'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </PptSafeAreaRoot>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  body: {
    flex: 1,
    flexDirection: 'row-reverse',
  },
  catColumn: {
    borderLeftWidth: 1,
    borderLeftColor: '#2c2c2e',
    paddingTop: 6,
  },
  catBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRightWidth: 3,
    borderRightColor: 'transparent',
  },
  catBtnActive: {
    backgroundColor: '#2c2c2e',
    borderRightColor: '#8B3A2B',
  },
  catText: {
    color: '#aaaaaa',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  catTextActive: {
    color: '#ffffff',
  },
  catSoon: {
    opacity: 0.55,
  },
  gridArea: {
    flex: 1,
    padding: 6,
  },
  gridRow: {
    justifyContent: 'space-between',
    flexDirection: 'row-reverse',
    marginBottom: 8,
  },
  thumb: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 6,
    borderWidth: 1.5,
    borderColor: '#3a3a3c',
    alignItems: 'center',
  },
  thumbActive: {
    borderColor: '#30d158',
  },
  thumbCanvas: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
    overflow: 'hidden',
  },
  thumbName: {
    color: '#cccccc',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 5,
  },
  thumbNameActive: {
    color: '#ffffff',
  },
  soonBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  soonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  soonSub: {
    color: '#8e8e93',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  infoBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2c2c2e',
  },
  infoName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  infoDesc: {
    color: '#aaaaaa',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
  },
  insertBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2e7d32',
    paddingHorizontal: 16,
    minHeight: 46,
    borderRadius: 10,
  },
  insertText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
