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

// 3. Neon & Pastel Highlight Colors (10 colors)
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

// 5. Kurdish Fonts List (Safe & Arabic-script supported)
const KURDISH_FONTS = [
  { name: 'Tahoma', label: 'تەهۆما (Tahoma - Safe)' },
  { name: 'Arial', label: 'ئاریال (Arial - Safe)' },
  { name: 'Noto Naskh Arabic', label: 'نووسخ (Noto Naskh Arabic)' },
  { name: 'Noto Sans Arabic', label: 'نووسخ سانس (Noto Sans Arabic)' },
  { name: 'Segoe UI', label: 'سیگۆی (Segoe UI)' },
  { name: 'Traditional Arabic', label: 'تڕادیشناڵ عەرەبیک (Traditional Arabic)' },
  { name: 'Dubai', label: 'دوبەی (Dubai)' },
];

// 6. English Fonts List (PowerPoint Standard)
const ENGLISH_FONTS = [
  { name: 'Calibri', label: 'Calibri (PowerPoint Default)' },
  { name: 'Arial', label: 'Arial' },
  { name: 'Times New Roman', label: 'Times New Roman' },
  { name: 'Courier New', label: 'Courier New' },
  { name: 'Georgia', label: 'Georgia' },
  { name: 'Trebuchet MS', label: 'Trebuchet MS' },
  { name: 'Verdana', label: 'Verdana' },
  { name: 'Inter', label: 'Inter' },
  { name: 'Roboto', label: 'Roboto' },
];

export const PptTextToolbar = ({ element, onChangeElement, onClose }) => {
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'font' | 'color'
  const [colorTarget, setColorTarget] = useState('text'); // 'text' | 'shadow' | 'highlight'
  const [editTextModal, setEditTextModal] = useState(false);
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

  // Manual step +/- 2pt (Clamped min 14pt to max 40pt)
  const changeFontSizeStep = (delta) => {
    const isTitle = element.fontWeight === 'bold' || (element.y || 0) < 20 || currentFontSize >= 24;
    const maxPt = isTitle ? 36 : 40;
    const minPt = 14;

    const nextSize = Math.max(minPt, Math.min(maxPt, currentFontSize + delta));
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

  const align = element.textAlign || 'right';
  const currentColor = element.color || '#1c1c1e';
  const currentShadow = element.shadowColor || 'transparent';
  const currentHighlight = element.highlightColor || 'transparent';
  const currentKurdishFont = element.kurdishFont || 'Tahoma';
  const currentEnglishFont = element.englishFont || 'Calibri';

  // Determine active selected color depending on colorTarget
  const activeSelectedColor =
    colorTarget === 'text'
      ? currentColor
      : colorTarget === 'shadow'
      ? currentShadow
      : currentHighlight;

  const handleColorSelect = (hexColor) => {
    if (colorTarget === 'text') {
      updateProp('color', hexColor);
    } else if (colorTarget === 'shadow') {
      updateProp('shadowColor', hexColor);
    } else if (colorTarget === 'highlight') {
      updateProp('highlightColor', hexColor);
    }
  };

  return (
    <View style={styles.toolbarContainer}>

      {/* 3 Top Tabs: "نووسین", "فۆنت", "ڕەنگ" */}
      <View style={styles.tabHeaderRow}>
        <TouchableOpacity
          style={[styles.tabHeaderBtn, activeTab === 'text' && styles.tabHeaderBtnActive]}
          onPress={() => setActiveTab('text')}
        >
          <Text style={[styles.tabHeaderBtnText, activeTab === 'text' && styles.tabHeaderBtnTextActive]}>
            نووسین ✏️
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabHeaderBtn, activeTab === 'font' && styles.tabHeaderBtnActive]}
          onPress={() => setActiveTab('font')}
        >
          <Text style={[styles.tabHeaderBtnText, activeTab === 'font' && styles.tabHeaderBtnTextActive]}>
            {`فۆنت 🔤 (${currentKurdishFont})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabHeaderBtn, activeTab === 'color' && styles.tabHeaderBtnActive]}
          onPress={() => setActiveTab('color')}
        >
          <Text style={[styles.tabHeaderBtnText, activeTab === 'color' && styles.tabHeaderBtnTextActive]}>
            ڕەنگ 🎨
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: "نووسین" (Size A-/A+/خۆکار, B/I/U, Alignment, Lists) */}
      {activeTab === 'text' && (
        <View style={styles.tabContentBox}>
          <View style={styles.wrappedRow}>
            {/* Edit Text Button */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setTempText(element.text || '');
                setEditTextModal(true);
              }}
            >
              <Text style={styles.actionBtnText}>✏️ دەستکاری دەق</Text>
            </TouchableOpacity>

            {/* Size Controls */}
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

            {/* Alignment Controls (RTL order: ڕاست | ناوەڕاست | چەپ) */}
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

            {/* Style Toggles (B, I, U) */}
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

            {/* Lists */}
            <TouchableOpacity style={styles.iconBtn} onPress={applyBulletList}>
              <Text style={styles.iconBtnText}>• خاڵبەندی</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={applyNumberedList}>
              <Text style={styles.iconBtnText}>١. ڕیزبەندی</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* TAB 2: "فۆنت" (Kurdish + English Pickers) */}
      {activeTab === 'font' && (
        <View style={styles.tabContentBox}>
          <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
            {/* Kurdish Font Picker */}
            <Text style={styles.sectionTitle}>فۆنتی کوردی (Kurdish Font)</Text>
            <View style={styles.fontChipRow}>
              {KURDISH_FONTS.map((font) => {
                const isSelected = currentKurdishFont === font.name;
                return (
                  <TouchableOpacity
                    key={`ku_${font.name}`}
                    style={[styles.fontChip, isSelected && styles.fontChipActive]}
                    onPress={() => updateProp('kurdishFont', font.name)}
                  >
                    <Text style={[styles.fontChipText, isSelected && styles.fontChipTextActive]}>
                      {isSelected ? `✓ ${font.label}` : font.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* English Font Picker */}
            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>فۆنتی ئینگلیزی (English Font)</Text>
            <View style={styles.fontChipRow}>
              {ENGLISH_FONTS.map((font) => {
                const isSelected = currentEnglishFont === font.name;
                return (
                  <TouchableOpacity
                    key={`en_${font.name}`}
                    style={[styles.fontChip, isSelected && styles.fontChipActive]}
                    onPress={() => updateProp('englishFont', font.name)}
                  >
                    <Text style={[styles.fontChipText, isSelected && styles.fontChipTextActive]}>
                      {isSelected ? `✓ ${font.label}` : font.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* TAB 3: "ڕەنگ" (Text Color / Shadow / Box Background Matrix) */}
      {activeTab === 'color' && (
        <View style={styles.tabContentBox}>
          {/* Sub-selector for Target: Text Color | Text Shadow | Box Highlight */}
          <View style={styles.colorTargetRow}>
            <TouchableOpacity
              style={[
                styles.colorTargetBtn,
                colorTarget === 'text' && styles.colorTargetBtnActive,
              ]}
              onPress={() => setColorTarget('text')}
            >
              <Text
                style={[
                  styles.colorTargetText,
                  colorTarget === 'text' && styles.colorTargetTextActive,
                ]}
              >
                🎨 ڕەنگی دەق
              </Text>
              <View style={[styles.miniDot, { backgroundColor: currentColor }]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.colorTargetBtn,
                colorTarget === 'shadow' && styles.colorTargetBtnActive,
              ]}
              onPress={() => setColorTarget('shadow')}
            >
              <Text
                style={[
                  styles.colorTargetText,
                  colorTarget === 'shadow' && styles.colorTargetTextActive,
                ]}
              >
                ✨ سێبەر
              </Text>
              <View
                style={[
                  styles.miniDot,
                  { backgroundColor: currentShadow === 'transparent' ? '#333' : currentShadow },
                ]}
              >
                {currentShadow === 'transparent' && (
                  <Text style={{ color: '#fff', fontSize: 7, textAlign: 'center' }}>✕</Text>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.colorTargetBtn,
                colorTarget === 'highlight' && styles.colorTargetBtnActive,
              ]}
              onPress={() => setColorTarget('highlight')}
            >
              <Text
                style={[
                  styles.colorTargetText,
                  colorTarget === 'highlight' && styles.colorTargetTextActive,
                ]}
              >
                🖍️ هاینایت
              </Text>
              <View
                style={[
                  styles.miniDot,
                  { backgroundColor: currentHighlight === 'transparent' ? '#333' : currentHighlight },
                ]}
              >
                {currentHighlight === 'transparent' && (
                  <Text style={{ color: '#fff', fontSize: 7, textAlign: 'center' }}>✕</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
            {/* Clear option if target is Shadow or Highlight */}
            {colorTarget === 'shadow' && (
              <TouchableOpacity
                style={styles.noHighlightBtn}
                onPress={() => handleColorSelect('transparent')}
              >
                <Text style={styles.noHighlightText}>
                  {currentShadow === 'transparent'
                    ? '✓ بێ سێبەر (No Shadow / Transparent)'
                    : '✕ لابردنی سێبەر (Clear Shadow)'}
                </Text>
              </TouchableOpacity>
            )}

            {colorTarget === 'highlight' && (
              <TouchableOpacity
                style={styles.noHighlightBtn}
                onPress={() => handleColorSelect('transparent')}
              >
                <Text style={styles.noHighlightText}>
                  {currentHighlight === 'transparent'
                    ? '✓ بێ هاینایت (No Highlight / Transparent)'
                    : '✕ لابردنی هاینایت (Clear Highlight)'}
                </Text>
              </TouchableOpacity>
            )}

            {/* 1. PowerPoint Theme Colors */}
            <Text style={styles.sectionTitle}>ڕەنگەکانی تێمی پاوەرپۆینت (Theme Colors)</Text>
            <View style={styles.gridBox}>
              {THEME_COLORS_GRID.map((row, rIdx) => (
                <View key={`theme_${rIdx}`} style={styles.gridRow}>
                  {row.map((hex, cIdx) => (
                    <TouchableOpacity
                      key={`theme_${rIdx}_${cIdx}`}
                      style={[
                        styles.colorSquare,
                        { backgroundColor: hex },
                        activeSelectedColor === hex && styles.colorSquareSelected,
                      ]}
                      onPress={() => handleColorSelect(hex)}
                    >
                      {activeSelectedColor === hex && (
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
                  ))}
                </View>
              ))}
            </View>

            {/* 2. Standard Colors */}
            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>ڕەنگە ستانداردەکان (Standard Colors)</Text>
            <View style={styles.standardRow}>
              {STANDARD_COLORS.map((hex) => (
                <TouchableOpacity
                  key={`std_${hex}`}
                  style={[
                    styles.colorSquare,
                    { backgroundColor: hex },
                    activeSelectedColor === hex && styles.colorSquareSelected,
                  ]}
                  onPress={() => handleColorSelect(hex)}
                >
                  {activeSelectedColor === hex && (
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* 3. Neon & Pastel Highlight Colors */}
            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>ڕەنگە ڕووناک و هاینایتەکان (Pastels & Highlights)</Text>
            <View style={styles.standardRow}>
              {PASTEL_HIGHLIGHT_COLORS.map((hex) => (
                <TouchableOpacity
                  key={`pastel_${hex}`}
                  style={[
                    styles.colorSquare,
                    { backgroundColor: hex },
                    activeSelectedColor === hex && styles.colorSquareSelected,
                  ]}
                  onPress={() => handleColorSelect(hex)}
                >
                  {activeSelectedColor === hex && (
                    <Text style={{ color: '#000', fontSize: 10, fontWeight: 'bold' }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* 4. Full Color Spectrum Matrix */}
            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>پانیی ڕەنگە پرۆفیشناڵەکان (Full Color Spectrum)</Text>
            <View style={styles.gridBox}>
              {SPECTRUM_COLORS_GRID.map((row, rIdx) => (
                <View key={`spec_${rIdx}`} style={styles.gridRow}>
                  {row.map((hex, cIdx) => (
                    <TouchableOpacity
                      key={`spec_${rIdx}_${cIdx}`}
                      style={[
                        styles.colorSquare,
                        { backgroundColor: hex },
                        activeSelectedColor === hex && styles.colorSquareSelected,
                      ]}
                      onPress={() => handleColorSelect(hex)}
                    >
                      {activeSelectedColor === hex && (
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

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
  tabHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  tabHeaderBtn: {
    flex: 1,
    backgroundColor: '#2c2c2e',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 3,
    minHeight: 40,
    justifyContent: 'center',
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
    paddingVertical: 4,
  },
  wrappedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  actionBtn: {
    backgroundColor: '#8B3A2B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  fontControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    paddingHorizontal: 4,
    minHeight: 40,
    gap: 4,
  },
  sizeBtn: {
    minWidth: 40,
    minHeight: 32,
    backgroundColor: '#3a3a3c',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizeBtnText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  fontSizeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  autoModeBtn: {
    minWidth: 40,
    minHeight: 32,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#3a3a3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoModeBtnActive: {
    backgroundColor: '#8B3A2B',
  },
  autoModeText: {
    color: '#aaaaaa',
    fontSize: 11,
    fontWeight: 'bold',
  },
  autoModeTextActive: {
    color: '#ffffff',
  },
  alignGroup: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    padding: 2,
    gap: 4,
    minHeight: 40,
    alignItems: 'center',
  },
  alignBtn: {
    minWidth: 40,
    minHeight: 34,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#3a3a3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alignBtnActive: {
    backgroundColor: '#8B3A2B',
  },
  alignBtnText: {
    color: '#aaaaaa',
    fontSize: 11,
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
    gap: 4,
    minHeight: 40,
    alignItems: 'center',
  },
  styleBtn: {
    minWidth: 40,
    minHeight: 34,
    backgroundColor: '#3a3a3c',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  styleBtnActive: {
    backgroundColor: '#8B3A2B',
  },
  styleBtnText: {
    color: '#ffffff',
    fontSize: 13,
  },
  iconBtn: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 10,
    minWidth: 40,
    minHeight: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 11,
  },
  sectionTitle: {
    color: '#8B3A2B',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'right',
  },
  fontChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fontChip: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    minHeight: 38,
    justifyContent: 'center',
  },
  fontChipActive: {
    backgroundColor: '#8B3A2B',
    borderColor: '#8B3A2B',
  },
  fontChipText: {
    color: '#aaaaaa',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fontChipTextActive: {
    color: '#ffffff',
  },
  colorTargetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 4,
  },
  colorTargetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2c2c2e',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 4,
    minHeight: 36,
  },
  colorTargetBtnActive: {
    backgroundColor: '#8B3A2B',
  },
  colorTargetText: {
    color: '#aaaaaa',
    fontSize: 11,
    fontWeight: 'bold',
  },
  colorTargetTextActive: {
    color: '#ffffff',
  },
  miniDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
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
});
