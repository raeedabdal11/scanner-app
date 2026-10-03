import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
} from 'react-native';

// 1. PowerPoint Theme Colors Matrix (10 columns x 5 rows = 50 shades)
const THEME_COLORS_GRID = [
  ['#000000', '#ffffff', '#1f497d', '#eeece1', '#4f81bd', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646'],
  ['#7f7f7f', '#f2f2f2', '#c6d9f1', '#d8d8d8', '#dce6f1', '#f2dcdb', '#eaf1dd', '#e5e0ec', '#d1eef4', '#fde9d9'],
  ['#595959', '#d9d9d9', '#8db4e2', '#bfbfbf', '#b8cce4', '#e5b9b7', '#d7e3bc', '#ccc1d9', '#a6d9e8', '#fbd5b5'],
  ['#3f3f3f', '#bfbfbf', '#548dd4', '#a6a6a6', '#95b3d7', '#d99694', '#c3d69b', '#b2a1c7', '#63c0dc', '#fac090'],
  ['#262626', '#a6a6a6', '#17365d', '#7f7f7f', '#366092', '#953735', '#76923c', '#5f497a', '#1f497d', '#e36c09'],
];

// 2. PowerPoint Standard Colors (10 colors)
const STANDARD_COLORS = [
  '#c00000',
  '#ff0000',
  '#ffc000',
  '#ffff00',
  '#92d050',
  '#00b0f0',
  '#0070c0',
  '#002060',
  '#7030a0',
  '#808080',
];

// 3. Neon & Pastel Highlight Colors
const PASTEL_HIGHLIGHT_COLORS = [
  '#ffff00',
  '#ff69b4',
  '#00ffff',
  '#32cd32',
  '#ff4500',
  '#ba55d3',
  '#ffd700',
  '#ff1493',
  '#00fa9a',
  '#1e90ff',
];

// 4. Full Color Spectrum Matrix (10 columns x 3 rows = 30 extra rich shades)
const SPECTRUM_COLORS_GRID = [
  ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#30b0c7', '#32ade6', '#007aff', '#5856d6', '#af52de'],
  ['#ff2d55', '#a2845e', '#8e8e93', '#aeaeb2', '#c7c7cc', '#d1d1d6', '#e5e5ea', '#f2f2f7', '#8b3a2b', '#5c2217'],
  ['#b02a1e', '#d97706', '#b45309', '#15803d', '#0f766e', '#0369a1', '#1d4ed8', '#4338ca', '#6b21a8', '#831843'],
];

export const PptTextToolbar = ({ element, onChangeElement, onClose }) => {
  const [editTextModal, setEditTextModal] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState(null); // 'text' | 'highlight' | null
  const [tempText, setTempText] = useState(element?.text || '');

  if (!element || element.type !== 'text') return null;

  const updateProp = (key, value) => {
    onChangeElement({ ...element, [key]: value });
  };

  const toggleBold = () => {
    updateProp('fontWeight', element.fontWeight === 'bold' ? 'normal' : 'bold');
  };

  const toggleItalic = () => {
    updateProp('fontStyle', element.fontStyle === 'italic' ? 'normal' : 'italic');
  };

  const toggleUnderline = () => {
    updateProp(
      'textDecorationLine',
      element.textDecorationLine === 'underline' ? 'none' : 'underline'
    );
  };

  const toggleDirection = () => {
    const isRtl = element.writingDirection !== 'ltr';
    const newDir = isRtl ? 'ltr' : 'rtl';
    const newAlign = isRtl ? 'left' : 'right';
    onChangeElement({
      ...element,
      writingDirection: newDir,
      textAlign: newAlign,
    });
  };

  const setAlignRight = () => {
    onChangeElement({
      ...element,
      textAlign: 'right',
      writingDirection: 'rtl',
    });
  };

  const setAlignCenter = () => {
    onChangeElement({
      ...element,
      textAlign: 'center',
    });
  };

  const setAlignLeft = () => {
    onChangeElement({
      ...element,
      textAlign: 'left',
      writingDirection: 'ltr',
    });
  };

  const isAutoMode = !element.fontMode || element.fontMode === 'auto';
  const currentFontSize = element.fontSize || element.computedFontSize || 18;

  // Manual step +/- 2pt
  const changeFontSizeStep = (delta) => {
    const nextSize = Math.max(10, Math.min(72, currentFontSize + delta));
    onChangeElement({
      ...element,
      fontMode: 'manual',
      fontSize: nextSize,
    });
  };

  const setAutoMode = () => {
    onChangeElement({
      ...element,
      fontMode: 'auto',
      autoFit: 'grow',
    });
  };

  const applyBulletList = () => {
    const lines = (element.text || '').split('\n');
    const hasBullets = lines.every((l) => l.trim().startsWith('•') || l.trim() === '');
    const newLines = lines.map((line) => {
      if (hasBullets) {
        return line.replace(/^•\s*/, '');
      } else {
        return line.trim().startsWith('•') ? line : `• ${line}`;
      }
    });
    updateProp('text', newLines.join('\n'));
  };

  const applyNumberedList = () => {
    const lines = (element.text || '').split('\n');
    let count = 1;
    const newLines = lines.map((line) => {
      const clean = line.replace(/^[0-9١-٩]+\.\s*/, '');
      const formatted = `${count}. ${clean}`;
      count++;
      return formatted;
    });
    updateProp('text', newLines.join('\n'));
  };

  const selectColor = (hexColor) => {
    if (colorPickerTarget === 'text') {
      updateProp('color', hexColor);
    } else if (colorPickerTarget === 'highlight') {
      updateProp('highlightColor', hexColor);
    }
    setColorPickerTarget(null);
  };

  const align = element.textAlign || 'right';
  const currentColor = element.color || '#1c1c1e';
  const currentHighlight = element.highlightColor || 'transparent';

  return (
    <View style={styles.toolbarContainer}>

      {/* ROW 1: Edit, Colors Popup, Highlights Popup, Font Size (A-, size, A+, Auto) */}
      <View style={styles.toolbarRow}>
        {/* 1. Edit Text */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            setTempText(element.text || '');
            setEditTextModal(true);
          }}
        >
          <Text style={styles.actionBtnText}>✏️ دەستکاری</Text>
        </TouchableOpacity>

        {/* 2. Text Color Button */}
        <TouchableOpacity
          style={styles.colorPickerBtn}
          onPress={() => setColorPickerTarget('text')}
        >
          <Text style={styles.colorPickerBtnText}>🎨 ڕەنگ</Text>
          <View style={[styles.colorPreviewDot, { backgroundColor: currentColor }]} />
        </TouchableOpacity>

        {/* 3. Highlight Color Button */}
        <TouchableOpacity
          style={styles.colorPickerBtn}
          onPress={() => setColorPickerTarget('highlight')}
        >
          <Text style={styles.colorPickerBtnText}>✨ سێبەر</Text>
          <View
            style={[
              styles.colorPreviewDot,
              { backgroundColor: currentHighlight === 'transparent' ? '#333' : currentHighlight },
            ]}
          >
            {currentHighlight === 'transparent' && <Text style={{ color: '#fff', fontSize: 8 }}>✕</Text>}
          </View>
        </TouchableOpacity>

        {/* 4. Font Size & Auto Mode Controls */}
        <View style={styles.fontControlsRow}>
          <TouchableOpacity style={styles.sizeBtn} onPress={() => changeFontSizeStep(-2)}>
            <Text style={styles.sizeBtnText}>A-</Text>
          </TouchableOpacity>

          <Text style={styles.fontSizeText}>
            {isAutoMode ? `خۆکار (${currentFontSize}pt)` : `${currentFontSize}pt`}
          </Text>

          <TouchableOpacity style={styles.sizeBtn} onPress={() => changeFontSizeStep(2)}>
            <Text style={styles.sizeBtnText}>A+</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.autoModeBtn, isAutoMode && styles.autoModeBtnActive]}
            onPress={setAutoMode}
          >
            <Text style={[styles.autoModeText, isAutoMode && styles.autoModeTextActive]}>
              خۆکار
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ROW 2: Alignments (Right, Center, Left), Style (B, I, U), Lists */}
      <View style={[styles.toolbarRow, { marginTop: 6 }]}>
        {/* 5. Alignments Group (Right, Center, Left) */}
        <View style={styles.alignGroup}>
          <TouchableOpacity
            style={[styles.alignBtn, align === 'right' && styles.alignBtnActive]}
            onPress={setAlignRight}
          >
            <Text style={[styles.alignBtnText, align === 'right' && styles.alignBtnTextActive]}>
              ▶️ ڕاست
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.alignBtn, align === 'center' && styles.alignBtnActive]}
            onPress={setAlignCenter}
          >
            <Text style={[styles.alignBtnText, align === 'center' && styles.alignBtnTextActive]}>
              ⏺️ ناوەڕاست
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.alignBtn, align === 'left' && styles.alignBtnActive]}
            onPress={setAlignLeft}
          >
            <Text style={[styles.alignBtnText, align === 'left' && styles.alignBtnTextActive]}>
              ◀️ چەپ
            </Text>
          </TouchableOpacity>
        </View>

        {/* 6. Style Group (B / I / U) */}
        <View style={styles.styleGroup}>
          <TouchableOpacity
            style={[styles.styleBtn, element.fontWeight === 'bold' && styles.styleBtnActive]}
            onPress={toggleBold}
          >
            <Text style={[styles.styleBtnText, { fontWeight: 'bold' }]}>B</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.styleBtn, element.fontStyle === 'italic' && styles.styleBtnActive]}
            onPress={toggleItalic}
          >
            <Text style={[styles.styleBtnText, { fontStyle: 'italic' }]}>I</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.styleBtn, element.textDecorationLine === 'underline' && styles.styleBtnActive]}
            onPress={toggleUnderline}
          >
            <Text style={[styles.styleBtnText, { textDecorationLine: 'underline' }]}>U</Text>
          </TouchableOpacity>
        </View>

        {/* 7. Lists */}
        <TouchableOpacity style={styles.iconBtn} onPress={applyBulletList}>
          <Text style={styles.iconBtnText}>• خاڵبەندی</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={applyNumberedList}>
          <Text style={styles.iconBtnText}>١. ڕیزبەندی</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Text Modal */}
      <Modal visible={editTextModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>نوسینی دەق ✍️</Text>
            <TextInput
              style={styles.modalInput}
              multiline
              value={tempText}
              onChangeText={setTempText}
              placeholder="دەقەکەت لێرە بنووسە..."
              placeholderTextColor="#777"
              textAlign={element.writingDirection === 'ltr' ? 'left' : 'right'}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditTextModal(false)}
              >
                <Text style={styles.modalBtnText}>پاشگەزبوونەوە</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={() => {
                  updateProp('text', tempText);
                  setEditTextModal(false);
                }}
              >
                <Text style={styles.modalBtnText}>جێگیرکردن</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Professional PowerPoint Style Color Picker Modal */}
      <Modal visible={colorPickerTarget !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.colorPickerModalBox}>
            {/* Modal Header */}
            <View style={styles.colorPickerHeader}>
              <Text style={styles.colorPickerTitle}>
                {colorPickerTarget === 'text'
                  ? 'پالیتی پرۆفیشناڵی ڕەنگەکانی دەق 🎨'
                  : 'پالیتی پرۆفیشناڵی سێبەر و هاینایت ✨'}
              </Text>
              <TouchableOpacity onPress={() => setColorPickerTarget(null)}>
                <Text style={{ color: '#aaa', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Clear Highlight Option */}
              {colorPickerTarget === 'highlight' && (
                <TouchableOpacity
                  style={styles.noHighlightBtn}
                  onPress={() => selectColor('transparent')}
                >
                  <Text style={styles.noHighlightText}>✕ بێ سێبەر (No Highlight / Transparent)</Text>
                </TouchableOpacity>
              )}

              {/* 1. PowerPoint Theme Colors Section */}
              <Text style={styles.colorGroupTitle}>ڕەنگەکانی تێمی پاوەرپۆینت (Theme Colors)</Text>
              <View style={styles.gridBox}>
                {THEME_COLORS_GRID.map((row, rIdx) => (
                  <View key={`row_theme_${rIdx}`} style={styles.gridRow}>
                    {row.map((hex, cIdx) => {
                      const isSelected =
                        (colorPickerTarget === 'text' && currentColor === hex) ||
                        (colorPickerTarget === 'highlight' && currentHighlight === hex);
                      return (
                        <TouchableOpacity
                          key={`theme_${rIdx}_${cIdx}`}
                          style={[
                            styles.colorSquare,
                            { backgroundColor: hex },
                            isSelected && styles.colorSquareSelected,
                          ]}
                          onPress={() => selectColor(hex)}
                        >
                          {isSelected && (
                            <Text
                              style={{
                                color: hex === '#ffffff' || hex === '#eeece1' || hex === '#f2f2f2' ? '#000' : '#fff',
                                fontSize: 10,
                                fontWeight: 'bold',
                              }}
                            >
                              ✓
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* 2. Standard Colors Section */}
              <Text style={styles.colorGroupTitle}>ڕەنگە ستانداردەکان (Standard Colors)</Text>
              <View style={styles.standardRow}>
                {STANDARD_COLORS.map((hex) => {
                  const isSelected =
                    (colorPickerTarget === 'text' && currentColor === hex) ||
                    (colorPickerTarget === 'highlight' && currentHighlight === hex);
                  return (
                    <TouchableOpacity
                      key={`std_${hex}`}
                      style={[
                        styles.colorSquare,
                        { backgroundColor: hex },
                        isSelected && styles.colorSquareSelected,
                      ]}
                      onPress={() => selectColor(hex)}
                    >
                      {isSelected && <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 3. Neon & Pastel Highlight Colors */}
              <Text style={styles.colorGroupTitle}>ڕەنگە ڕووناک و هاینایتەکان (Pastels & Highlights)</Text>
              <View style={styles.standardRow}>
                {PASTEL_HIGHLIGHT_COLORS.map((hex) => {
                  const isSelected =
                    (colorPickerTarget === 'text' && currentColor === hex) ||
                    (colorPickerTarget === 'highlight' && currentHighlight === hex);
                  return (
                    <TouchableOpacity
                      key={`pastel_${hex}`}
                      style={[
                        styles.colorSquare,
                        { backgroundColor: hex },
                        isSelected && styles.colorSquareSelected,
                      ]}
                      onPress={() => selectColor(hex)}
                    >
                      {isSelected && <Text style={{ color: '#000', fontSize: 10, fontWeight: 'bold' }}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 4. Full Color Spectrum Grid */}
              <Text style={styles.colorGroupTitle}>پانیی ڕەنگە پرۆفیشناڵەکان (Full Color Spectrum)</Text>
              <View style={styles.gridBox}>
                {SPECTRUM_COLORS_GRID.map((row, rIdx) => (
                  <View key={`row_spec_${rIdx}`} style={styles.gridRow}>
                    {row.map((hex, cIdx) => {
                      const isSelected =
                        (colorPickerTarget === 'text' && currentColor === hex) ||
                        (colorPickerTarget === 'highlight' && currentHighlight === hex);
                      return (
                        <TouchableOpacity
                          key={`spec_${rIdx}_${cIdx}`}
                          style={[
                            styles.colorSquare,
                            { backgroundColor: hex },
                            isSelected && styles.colorSquareSelected,
                          ]}
                          onPress={() => selectColor(hex)}
                        >
                          {isSelected && <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✓</Text>}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>

            </ScrollView>

            <TouchableOpacity
              style={[styles.modalCancelBtn, { marginTop: 12 }]}
              onPress={() => setColorPickerTarget(null)}
            >
              <Text style={styles.modalBtnText}>داخستن</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  toolbarContainer: {
    backgroundColor: '#1c1c1e',
    borderTopWidth: 1,
    borderTopColor: '#2c2c2e',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  toolbarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  actionBtn: {
    backgroundColor: '#8B3A2B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
  },
  colorPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  colorPickerBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 11,
  },
  colorPreviewDot: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtn: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  iconBtnText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 11,
  },
  alignGroup: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  alignBtn: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#3a3a3c',
  },
  alignBtnActive: {
    backgroundColor: '#8B3A2B',
  },
  alignBtnText: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: 'bold',
  },
  alignBtnTextActive: {
    color: '#ffffff',
  },
  styleGroup: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  fontControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 4,
  },
  sizeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: '#3a3a3c',
    borderRadius: 6,
  },
  sizeBtnText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fontSizeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 2,
  },
  autoModeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#3a3a3c',
  },
  autoModeBtnActive: {
    backgroundColor: '#8B3A2B',
  },
  autoModeText: {
    color: '#aaa',
    fontSize: 10,
    fontWeight: 'bold',
  },
  autoModeTextActive: {
    color: '#ffffff',
  },
  styleBtn: {
    width: 28,
    height: 28,
    backgroundColor: '#3a3a3c',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  styleBtnActive: {
    backgroundColor: '#007AFF',
  },
  styleBtnText: {
    color: '#fff',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#1c1c1e',
    width: '90%',
    borderRadius: 20,
    padding: 18,
  },
  modalTitle: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'right',
  },
  modalInput: {
    backgroundColor: '#2c2c2e',
    color: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    height: 140,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#3a3a3c',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#8B3A2B',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  colorPickerModalBox: {
    backgroundColor: '#1c1c1e',
    width: '92%',
    maxHeight: '85%',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  colorPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  colorPickerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  colorGroupTitle: {
    color: '#8B3A2B',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'right',
  },
  gridBox: {
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    padding: 8,
    gap: 6,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  standardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    padding: 8,
  },
  colorSquare: {
    width: 25,
    height: 25,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSquareSelected: {
    borderWidth: 2.5,
    borderColor: '#30d158',
  },
  noHighlightBtn: {
    backgroundColor: '#2c2c2e',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  noHighlightText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
