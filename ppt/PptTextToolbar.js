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
import { KURDISH_FONTS, ENGLISH_FONTS } from './fonts';
import {
  applyStyleToElement,
  updateElementText,
  getSelectionStyle,
} from './formattedText';

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

export const PptTextToolbar = ({ element, onChangeElement, onClose }) => {
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'font' | 'color'
  const [colorTarget, setColorTarget] = useState('text'); // 'text' | 'shadow' | 'highlight'
  const [editTextModal, setEditTextModal] = useState(false);
  const [tempText, setTempText] = useState(element?.text || '');
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [forceWhole, setForceWhole] = useState(false);

  // Font Sheet Modal State
  const [fontModalVisible, setFontModalVisible] = useState(false);
  const [fontModalCategory, setFontModalCategory] = useState('kurdish'); // 'kurdish' | 'english'
  const [fontSearchQuery, setFontSearchQuery] = useState('');

  if (!element || element.type !== 'text') return null;

  // Active selection/word style query
  const currentStyle = getSelectionStyle(element, selection);

  // Applies property change to selected range, word under cursor, or whole box
  const updateProp = (key, value) => {
    const updated = applyStyleToElement(element, key, value, selection, forceWhole);
    onChangeElement(updated);
  };

  const toggleBold = () => {
    updateProp('bold', !currentStyle.bold);
  };

  const toggleItalic = () => {
    updateProp('italic', !currentStyle.italic);
  };

  const toggleUnderline = () => {
    updateProp('underline', !currentStyle.underline);
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
  const baseFontSize = element.fontSize || element.computedFontSize || 18;

  // Manual step +/- 2pt relative scale delta on selection
  const changeFontSizeStep = (delta) => {
    const scaleDelta = delta / baseFontSize;
    updateProp('sizeScaleDelta', scaleDelta);
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
    const updatedText = newLines.join('\n');
    const updatedElem = updateElementText(element, updatedText, selection);
    onChangeElement(updatedElem);
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
    const updatedText = newLines.join('\n');
    const updatedElem = updateElementText(element, updatedText, selection);
    onChangeElement(updatedElem);
  };

  const align = element.textAlign || 'right';
  const currentColor = currentStyle.color || element.color || '#1c1c1e';
  const currentShadow = currentStyle.shadow || element.shadowColor || 'transparent';
  const currentHighlight = currentStyle.highlight || element.highlightColor || 'transparent';
  const currentKurdishFont = currentStyle.kuFont || element.kurdishFont || 'Tahoma';
  const currentEnglishFont = currentStyle.enFont || element.englishFont || 'Calibri';

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

  // Filter font list for Bottom Sheet based on active category & search query
  const rawFontList = fontModalCategory === 'kurdish' ? KURDISH_FONTS : ENGLISH_FONTS;
  const filteredFontList = rawFontList.filter((f) => {
    if (!fontSearchQuery.trim()) return true;
    const q = fontSearchQuery.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.label.toLowerCase().includes(q) ||
      (f.exportName && f.exportName.toLowerCase().includes(q))
    );
  });

  // Find active font labels for display
  const activeKurdishObj = KURDISH_FONTS.find((f) => f.name === currentKurdishFont) || KURDISH_FONTS[0];
  const activeEnglishObj = ENGLISH_FONTS.find((f) => f.name === currentEnglishFont) || ENGLISH_FONTS[0];

  const hasRangeSelection = selection.start !== selection.end;

  return (
    <View style={styles.toolbarContainer}>

      {/* Selection / Whole Text Box Status Banner */}
      <View style={styles.selectionBanner}>
        {forceWhole ? (
          <Text style={styles.selectionBannerText}>
            🔲 گۆڕانکاری بەسەر تەواوی دەقەکەدا جێبەجێ دەبێت
          </Text>
        ) : hasRangeSelection ? (
          <Text style={styles.selectionBannerText}>
            {`تەحدیدکراوە (${selection.end - selection.start} پیت) - گۆڕانکاری تەنها بەسەر ئەم شوێنەدا دێت`}
          </Text>
        ) : (
          <Text style={styles.selectionBannerText}>
            💡 وشەیەک تەحدید بکە یان دوگمەی هەمووی داگرە بۆ گۆڕینی هەموو دەقەکە
          </Text>
        )}

        <TouchableOpacity
          style={[styles.wholeBoxBtn, forceWhole && styles.wholeBoxBtnActive]}
          onPress={() => setForceWhole(!forceWhole)}
        >
          <Text style={[styles.wholeBoxBtnText, forceWhole && styles.wholeBoxBtnTextActive]}>
            {forceWhole ? '✓ هەمووی' : '🔲 هەمووی'}
          </Text>
        </TouchableOpacity>
      </View>

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
            {`فۆنت 🔤 (${activeKurdishObj.name})`}
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

            {/* Size Controls displaying selection size */}
            <View style={styles.fontControlsRow}>
              <TouchableOpacity style={styles.sizeBtn} onPress={() => changeFontSizeStep(-2)}>
                <Text style={styles.sizeBtnText}>A-</Text>
              </TouchableOpacity>

              <Text style={styles.fontSizeText}>
                {isAutoMode ? `خۆکار (${currentStyle.sizePt}pt)` : `${currentStyle.sizePt}pt`}
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

            {/* Style Toggles (B, I, U) showing current selection style */}
            <View style={styles.styleGroup}>
              <TouchableOpacity
                style={[styles.styleBtn, currentStyle.bold && styles.styleBtnActive]}
                onPress={toggleBold}
              >
                <Text style={[styles.styleBtnText, { fontWeight: 'bold' }]}>B</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.styleBtn, currentStyle.italic && styles.styleBtnActive]}
                onPress={toggleItalic}
              >
                <Text style={[styles.styleBtnText, { fontStyle: 'italic' }]}>I</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.styleBtn, currentStyle.underline && styles.styleBtnActive]}
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

      {/* TAB 2: "فۆنت" (PowerPoint-style Font Picker Controls) */}
      {activeTab === 'font' && (
        <View style={styles.tabContentBox}>
          {/* Main Selected Font Selector Cards */}
          <View style={styles.fontSelectorCardsRow}>
            <TouchableOpacity
              style={styles.fontSelectCard}
              onPress={() => {
                setFontModalCategory('kurdish');
                setFontSearchQuery('');
                setFontModalVisible(true);
              }}
            >
              <Text style={styles.fontCardSub}>فۆنتی کوردی (Kurdish)</Text>
              <Text style={[styles.fontCardTitle, { fontFamily: currentKurdishFont }]}>
                {activeKurdishObj.label}
              </Text>
              <Text style={styles.fontCardAction}>گۆڕین و بینینی ڕاستەوخۆ 🔤 〉</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fontSelectCard}
              onPress={() => {
                setFontModalCategory('english');
                setFontSearchQuery('');
                setFontModalVisible(true);
              }}
            >
              <Text style={styles.fontCardSub}>فۆنتی ئینگلیزی (English)</Text>
              <Text style={[styles.fontCardTitle, { fontFamily: currentEnglishFont }]}>
                {activeEnglishObj.label}
              </Text>
              <Text style={styles.fontCardAction}>گۆڕین و بینینی ڕاستەوخۆ 🔤 〉</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Fonts Scroll Strip */}
          <Text style={[styles.sectionTitle, { marginTop: 6 }]}>فۆنتە خێرا و باوەکان (Quick Pick):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {KURDISH_FONTS.slice(0, 10).map((font) => {
              const isSelected = currentKurdishFont === font.name;
              return (
                <TouchableOpacity
                  key={`quick_ku_${font.name}`}
                  style={[styles.fontChip, isSelected && styles.fontChipActive]}
                  onPress={() => updateProp('kuFont', font.name)}
                >
                  <Text style={[styles.fontChipText, { fontFamily: font.name }, isSelected && styles.fontChipTextActive]}>
                    {isSelected ? `✓ ${font.name}` : font.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
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

      {/* Edit Text & Selection Formatting Modal */}
      <Modal visible={editTextModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>نوسینی دەق و تەحدیدکردن ✍️</Text>

            {/* Selection Format Toolbar for Highlighted Word/Text inside Modal */}
            <View style={styles.modalFormatBar}>
              <TouchableOpacity
                style={[styles.modalFormatBtn, forceWhole && styles.modalFormatBtnActive]}
                onPress={() => setForceWhole(!forceWhole)}
              >
                <Text style={styles.modalFormatBtnText}>{forceWhole ? '✓ هەمووی' : '🔲 هەمووی'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalFormatBtn}
                onPress={() => toggleBold()}
              >
                <Text style={[styles.modalFormatBtnText, currentStyle.bold && { color: '#30d158' }]}>B</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalFormatBtn}
                onPress={() => toggleItalic()}
              >
                <Text style={[styles.modalFormatBtnText, { fontStyle: 'italic' }, currentStyle.italic && { color: '#30d158' }]}>I</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalFormatBtn}
                onPress={() => toggleUnderline()}
              >
                <Text style={[styles.modalFormatBtnText, { textDecorationLine: 'underline' }, currentStyle.underline && { color: '#30d158' }]}>U</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalFormatBtn}
                onPress={() => changeFontSizeStep(2)}
              >
                <Text style={styles.modalFormatBtnText}>A+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalFormatBtn}
                onPress={() => changeFontSizeStep(-2)}
              >
                <Text style={styles.modalFormatBtnText}>A-</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Color Palette for Highlighted Word */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10 }}>
              {['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#007aff', '#5856d6', '#af52de', '#ffffff', '#000000'].map((hex) => (
                <TouchableOpacity
                  key={`modal_color_${hex}`}
                  style={[styles.colorSquare, { backgroundColor: hex, width: 22, height: 22 }]}
                  onPress={() => updateProp('color', hex)}
                />
              ))}
            </ScrollView>

            <TextInput
              style={styles.modalInput}
              multiline
              value={tempText}
              onChangeText={(text) => {
                setTempText(text);
                const updated = updateElementText(element, text, selection);
                onChangeElement(updated);
              }}
              onSelectionChange={(e) => {
                setSelection(e.nativeEvent.selection);
              }}
              placeholder="دەقەکەت لێرە بنووسە..."
              placeholderTextColor="#777"
              textAlign={element.writingDirection === 'ltr' ? 'left' : 'right'}
            />

            <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 10, textAlign: 'right' }}>
              💡 وشەیەک یان بەشێک لە دەقەکە تحدید بکە و دوگمەکانی سەرەوە لێبدە تا تەنها ئەو شوێنە ڕەنگ یان فۆنتەکەی بگوڕێت.
            </Text>

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
                  const updated = updateElementText(element, tempText, selection);
                  onChangeElement(updated);
                  setEditTextModal(false);
                }}
              >
                <Text style={styles.modalBtnText}>جێگیرکردن</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* POWERPOINT-STYLE FONT SELECTOR BOTTOM SHEET MODAL WITH LIVE PREVIEW */}
      <Modal visible={fontModalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={() => setFontModalVisible(false)}
        >
          <TouchableOpacity style={styles.bottomSheetBox} activeOpacity={1}>
            {/* Drag Handle */}
            <View style={styles.bottomSheetHandle} />

            {/* Header */}
            <View style={styles.fontModalHeader}>
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => setFontModalVisible(false)}
              >
                <Text style={styles.doneBtnText}>تەواو (Done) ✓</Text>
              </TouchableOpacity>

              <Text style={styles.fontModalTitle}>هەڵبژاردنی فۆنت 🔤</Text>

              <TouchableOpacity onPress={() => setFontModalVisible(false)}>
                <Text style={styles.fontModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Live Text Preview Box displaying actual element.text */}
            <View style={styles.livePreviewBox}>
              <Text style={styles.livePreviewLabel}>پێشاندانی ڕاستەوخۆی دەقەکەت (Live Canvas Text):</Text>
              <Text
                style={[
                  styles.livePreviewText,
                  {
                    fontFamily:
                      fontModalCategory === 'kurdish'
                        ? currentKurdishFont
                        : currentEnglishFont,
                    color: currentColor !== 'transparent' ? currentColor : '#ffffff',
                  },
                ]}
                numberOfLines={2}
              >
                {element.text && element.text.trim()
                  ? element.text
                  : fontModalCategory === 'kurdish'
                  ? 'ئەبجەد هەوز (دەقەکەت لێرەیە)'
                  : 'Abc 123 (Your Text Here)'}
              </Text>
            </View>

            {/* Search Box */}
            <View style={styles.fontSearchBox}>
              <TextInput
                style={styles.fontSearchInput}
                placeholder="گەڕان لە فۆنتەکان... / Search fonts..."
                placeholderTextColor="#777"
                value={fontSearchQuery}
                onChangeText={setFontSearchQuery}
              />
              {fontSearchQuery !== '' && (
                <TouchableOpacity onPress={() => setFontSearchQuery('')}>
                  <Text style={{ color: '#aaa', fontSize: 14 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Language Category Switcher */}
            <View style={styles.fontTabRow}>
              <TouchableOpacity
                style={[
                  styles.fontTabBtn,
                  fontModalCategory === 'kurdish' && styles.fontTabBtnActive,
                ]}
                onPress={() => setFontModalCategory('kurdish')}
              >
                <Text
                  style={[
                    styles.fontTabText,
                    fontModalCategory === 'kurdish' && styles.fontTabTextActive,
                  ]}
                >
                  فۆنتی کوردی (Kurdish)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.fontTabBtn,
                  fontModalCategory === 'english' && styles.fontTabBtnActive,
                ]}
                onPress={() => setFontModalCategory('english')}
              >
                <Text
                  style={[
                    styles.fontTabText,
                    fontModalCategory === 'english' && styles.fontTabTextActive,
                  ]}
                >
                  فۆنتی ئینگلیزی (English)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Vertical Font List */}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
              {filteredFontList.map((font) => {
                const isKurdishTab = fontModalCategory === 'kurdish';
                const currentSelected = isKurdishTab ? currentKurdishFont : currentEnglishFont;
                const isSelected = currentSelected === font.name;
                const sampleText = isKurdishTab ? 'ئەبجەد هەوز' : 'Abc 123';

                return (
                  <TouchableOpacity
                    key={font.name}
                    style={[
                      styles.fontRowItem,
                      isSelected && styles.fontRowItemActive,
                    ]}
                    onPress={() => {
                      if (isKurdishTab) {
                        updateProp('kuFont', font.name);
                      } else {
                        updateProp('enFont', font.name);
                      }
                      // Keep sheet open so user can preview and compare multiple fonts live on canvas!
                    }}
                  >
                    {/* Checkmark Column */}
                    <View style={styles.fontCheckCol}>
                      {isSelected && <Text style={styles.checkmarkText}>✓</Text>}
                    </View>

                    {/* Font Details & Sample Column */}
                    <View style={styles.fontInfoCol}>
                      <View style={styles.fontNameRow}>
                        <Text style={styles.fontLabelText}>{font.label}</Text>
                        {font.pptOnly && (
                          <View style={styles.pptOnlyBadge}>
                            <Text style={styles.pptOnlyText}>PowerPoint only</Text>
                          </View>
                        )}
                      </View>

                      {/* Sample rendered in that specific font */}
                      <Text
                        style={[
                          styles.fontSampleText,
                          { fontFamily: font.name },
                        ]}
                      >
                        {sampleText}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

          </TouchableOpacity>
        </TouchableOpacity>
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
  selectionBanner: {
    backgroundColor: '#2c2c2e',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  selectionBannerText: {
    color: '#aaaaaa',
    fontSize: 11,
    fontWeight: 'bold',
    flex: 1,
  },
  wholeBoxBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 6,
  },
  wholeBoxBtnActive: {
    backgroundColor: '#8B3A2B',
  },
  wholeBoxBtnText: {
    color: '#aaaaaa',
    fontSize: 11,
    fontWeight: 'bold',
  },
  wholeBoxBtnTextActive: {
    color: '#ffffff',
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
  fontSelectorCardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  fontSelectCard: {
    flex: 1,
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  fontCardSub: {
    color: '#8B3A2B',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  fontCardTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  fontCardAction: {
    color: '#007AFF',
    fontSize: 11,
    fontWeight: 'bold',
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
  modalFormatBar: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 4,
    marginBottom: 8,
    gap: 6,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  modalFormatBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  modalFormatBtnActive: {
    backgroundColor: '#8B3A2B',
  },
  modalFormatBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  modalInput: {
    backgroundColor: '#2c2c2e',
    color: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    height: 140,
    textAlignVertical: 'top',
    marginBottom: 10,
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

  /* Bottom Sheet Styles */
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)', // Lightweight dim overlay so canvas & text above are clearly visible
    justifyContent: 'flex-end',
  },
  bottomSheetBox: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    height: '52%', // 52% height so top 48% of screen (showing the slide canvas and text) is completely uncovered!
    borderTopWidth: 2,
    borderTopColor: '#8B3A2B',
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#555',
    alignSelf: 'center',
    marginBottom: 8,
  },
  fontModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fontModalTitle: {
    color: '#8B3A2B',
    fontSize: 15,
    fontWeight: 'bold',
  },
  fontModalClose: {
    color: '#aaaaaa',
    fontSize: 18,
    fontWeight: 'bold',
    padding: 4,
  },
  doneBtn: {
    backgroundColor: '#8B3A2B',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  livePreviewBox: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  livePreviewLabel: {
    color: '#8B3A2B',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
    textAlign: 'right',
  },
  livePreviewText: {
    fontSize: 18,
    textAlign: 'right',
    color: '#ffffff',
  },
  fontSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  fontSearchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    padding: 0,
    textAlign: 'right',
  },
  fontTabRow: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 3,
    marginBottom: 8,
  },
  fontTabBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  fontTabBtnActive: {
    backgroundColor: '#8B3A2B',
  },
  fontTabText: {
    color: '#aaaaaa',
    fontSize: 11,
    fontWeight: 'bold',
  },
  fontTabTextActive: {
    color: '#ffffff',
  },
  fontRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  fontRowItemActive: {
    borderColor: '#30d158',
    backgroundColor: '#253528',
  },
  fontCheckCol: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#30d158',
    fontSize: 18,
    fontWeight: 'bold',
  },
  fontInfoCol: {
    flex: 1,
  },
  fontNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fontLabelText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  pptOnlyBadge: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pptOnlyText: {
    color: '#ff9500',
    fontSize: 10,
    fontWeight: 'bold',
  },
  fontSampleText: {
    color: '#dddddd',
    fontSize: 18,
    textAlign: 'right',
  },
});
