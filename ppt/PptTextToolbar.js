import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
  ToastAndroid,
  Platform,
} from 'react-native';
import { KURDISH_FONTS, ENGLISH_FONTS } from './fonts';
import {
  getElementRuns,
  updateElementText,
  getSelectionStyle,
  isWordChar,
} from './formattedText';
import { applyStyle, wordRangeAt } from './richText';

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

export const PptTextToolbar = ({
  element,
  onChangeElement,
  onClose,
  selRef: externalSelRef,
  pendingSelRef: externalPendingSelRef,
  pressingRef: externalPressingRef,
  selState: externalSelState,
  setSelState: externalSetSelState,
}) => {
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'font' | 'color'
  const [colorTarget, setColorTarget] = useState('text'); // 'text' | 'shadow' | 'highlight'
  const [editTextModal, setEditTextModal] = useState(false);
  const [tempText, setTempText] = useState(element?.text || '');
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const localSelRef = useRef(null);
  const localPendingSelRef = useRef(null);
  const localPressingRef = useRef(false);
  const [localSelState, setLocalSelState] = useState(undefined);

  const selRef = externalSelRef || localSelRef;
  const pendingSelRef = externalPendingSelRef || localPendingSelRef;
  const pressingRef = externalPressingRef || localPressingRef;
  const selState = externalSelState !== undefined ? externalSelState : localSelState;
  const setSelState = externalSetSelState || setLocalSelState;

  // Font Sheet Modal State
  const [fontModalVisible, setFontModalVisible] = useState(false);
  const [fontModalCategory, setFontModalCategory] = useState('kurdish'); // 'kurdish' | 'english'
  const [fontSearchQuery, setFontSearchQuery] = useState('');

  if (!element || element.type !== 'text') return null;

  const runs = getElementRuns(element);

  const setRuns = (newRuns) => {
    const plain = newRuns.map((r) => r.text).join('');
    const { color: _c, ...elemWithoutColor } = element;
    onChangeElement({
      ...elemWithoutColor,
      runs: newRuns,
      formattedRuns: newRuns,
      text: plain,
    });
  };

  const showNoSelectionToast = () => {
    if (Platform.OS === 'android') {
      ToastAndroid.show('سەرەتا وشەیەک دیاری بکە', ToastAndroid.SHORT);
    }
  };

  const handlePressIn = () => {
    pressingRef.current = true;
    if (selRef.current) {
      pendingSelRef.current = { ...selRef.current };
    }
  };

  // ONE function for ALL formatting
  function applyRunStyle(patch) {
    const plain = runs.map((r) => r.text).join('');
    if (!plain) {
      showNoSelectionToast();
      pressingRef.current = false;
      pendingSelRef.current = null;
      return;
    }

    const currentSel = pendingSelRef.current || selRef.current;
    if (!currentSel || currentSel.start === undefined || currentSel.start === null) {
      showNoSelectionToast();
      pressingRef.current = false;
      pendingSelRef.current = null;
      return;
    }

    let start = Math.max(0, Math.min(plain.length, currentSel.start));
    let end = Math.max(0, Math.min(plain.length, currentSel.end));

    if (start > end) {
      [start, end] = [end, start];
    }

    // Range rules:
    // a) Real selection (start !== end): apply ONLY to start..end.
    // b) No selection, cursor inside a word: apply ONLY to that word (wordRangeAt).
    // c) Otherwise (cursor on a space, or input never focused): do NOTHING and show small toast.
    if (start === end) {
      let isWord = false;
      if (start < plain.length && isWordChar(plain[start])) {
        isWord = true;
      } else if (start > 0 && start === plain.length && isWordChar(plain[start - 1])) {
        isWord = true;
      }

      if (isWord) {
        const idxToSearch = start < plain.length ? start : start - 1;
        const wRange = wordRangeAt(plain, idxToSearch);
        if (wRange.start !== wRange.end) {
          start = wRange.start;
          end = wRange.end;
        }
      }
    }

    if (start === end) {
      showNoSelectionToast();
      pressingRef.current = false;
      pendingSelRef.current = null;
      return;
    }

    console.log('[STYLE]', patch, start, end);

    const newRuns = applyStyle(runs, start, end, patch);

    const targetSel = { start, end };
    selRef.current = targetSel;
    if (setSelState) setSelState(targetSel);

    setRuns(newRuns);

    setTimeout(() => {
      pressingRef.current = false;
      pendingSelRef.current = null;
    }, 100);
  }

  // Active selection/word style query
  const currentSel = pendingSelRef.current || selRef.current || selection;
  const currentStyle = getSelectionStyle(element, currentSel);

  const setAlignRight = () => {
    const { color: _c, ...elemWithoutColor } = element;
    onChangeElement({
      ...elemWithoutColor,
      textAlign: 'right',
      writingDirection: 'rtl',
    });
  };

  const setAlignCenter = () => {
    const { color: _c, ...elemWithoutColor } = element;
    onChangeElement({
      ...elemWithoutColor,
      textAlign: 'center',
    });
  };

  const setAlignLeft = () => {
    const { color: _c, ...elemWithoutColor } = element;
    onChangeElement({
      ...elemWithoutColor,
      textAlign: 'left',
      writingDirection: 'ltr',
    });
  };

  const isAutoMode = !element.fontMode || element.fontMode === 'auto';

  const setAutoMode = () => {
    const { color: _c, ...elemWithoutColor } = element;
    onChangeElement({
      ...elemWithoutColor,
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
  const currentColor = currentStyle.color || '#1c1c1e';
  const currentShadow = currentStyle.shadowColor || 'transparent';
  const currentHighlight = currentStyle.highlight || 'transparent';
  const currentKurdishFont = currentStyle.kuFont || element.kurdishFont || 'Tahoma';
  const currentEnglishFont = currentStyle.enFont || element.englishFont || 'Calibri';

  const activeSelectedColor =
    colorTarget === 'text'
      ? currentColor
      : colorTarget === 'shadow'
      ? currentShadow
      : currentHighlight;

  const handleColorSelect = (hexColor) => {
    if (colorTarget === 'text') {
      applyRunStyle({ color: hexColor });
    } else if (colorTarget === 'shadow') {
      applyRunStyle({ shadowColor: hexColor === 'transparent' ? null : hexColor });
    } else if (colorTarget === 'highlight') {
      applyRunStyle({ highlight: hexColor === 'transparent' ? null : hexColor });
    }
  };

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

  const activeKurdishObj = KURDISH_FONTS.find((f) => f.name === currentKurdishFont) || KURDISH_FONTS[0];
  const activeEnglishObj = ENGLISH_FONTS.find((f) => f.name === currentEnglishFont) || ENGLISH_FONTS[0];

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

      {/* TAB 1: "نووسین" */}
      {activeTab === 'text' && (
        <View style={styles.tabContentBox}>
          <View style={styles.wrappedRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setTempText(element.text || '');
                setEditTextModal(true);
              }}
            >
              <Text style={styles.actionBtnText}>✏️ دەستکاری دەق</Text>
            </TouchableOpacity>

            <View style={styles.fontControlsRow}>
              <TouchableOpacity
                style={styles.sizeBtn}
                onPressIn={handlePressIn}
                onPress={() => applyRunStyle({ sizeScaleDelta: -0.1 })}
              >
                <Text style={styles.sizeBtnText}>A-</Text>
              </TouchableOpacity>

              <Text style={styles.fontSizeText}>
                {isAutoMode ? `خۆکار (${currentStyle.sizePt}pt)` : `${currentStyle.sizePt}pt`}
              </Text>

              <TouchableOpacity
                style={styles.sizeBtn}
                onPressIn={handlePressIn}
                onPress={() => applyRunStyle({ sizeScaleDelta: 0.1 })}
              >
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

            <View style={styles.styleGroup}>
              <TouchableOpacity
                style={[styles.styleBtn, currentStyle.bold && styles.styleBtnActive]}
                onPressIn={handlePressIn}
                onPress={() => applyRunStyle({ bold: !currentStyle.bold })}
              >
                <Text style={[styles.styleBtnText, { fontWeight: 'bold' }]}>B</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.styleBtn, currentStyle.italic && styles.styleBtnActive]}
                onPressIn={handlePressIn}
                onPress={() => applyRunStyle({ italic: !currentStyle.italic })}
              >
                <Text style={[styles.styleBtnText, { fontStyle: 'italic' }]}>I</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.styleBtn, currentStyle.underline && styles.styleBtnActive]}
                onPressIn={handlePressIn}
                onPress={() => applyRunStyle({ underline: !currentStyle.underline })}
              >
                <Text style={[styles.styleBtnText, { textDecorationLine: 'underline' }]}>U</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.iconBtn} onPress={applyBulletList}>
              <Text style={styles.iconBtnText}>• خاڵبەندی</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={applyNumberedList}>
              <Text style={styles.iconBtnText}>١. ڕیزبەندی</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* TAB 2: "فۆنت" */}
      {activeTab === 'font' && (
        <View style={styles.tabContentBox}>
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

          <Text style={[styles.sectionTitle, { marginTop: 6 }]}>فۆنتە خێرا و باوەکان (Quick Pick):</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 6 }}
          >
            {KURDISH_FONTS.slice(0, 10).map((font) => {
              const isSelected = currentKurdishFont === font.name;
              return (
                <TouchableOpacity
                  key={`quick_ku_${font.name}`}
                  style={[styles.fontChip, isSelected && styles.fontChipActive]}
                  onPressIn={handlePressIn}
                  onPress={() => applyRunStyle({ kuFont: font.name })}
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

      {/* TAB 3: "ڕەنگ" */}
      {activeTab === 'color' && (
        <View style={styles.tabContentBox}>
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

          <ScrollView
            style={{ maxHeight: 220 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {colorTarget === 'shadow' && (
              <TouchableOpacity
                style={styles.noHighlightBtn}
                onPressIn={handlePressIn}
                onPress={() => handleColorSelect('transparent')}
              >
                <Text style={styles.noHighlightText}>
                  {currentShadow === 'transparent'
                    ? '✓ بێ سێبەر (No Shadow / Transparent)'
                    : '⊗ لابردنی سێبەر (Clear Shadow)'}
                </Text>
              </TouchableOpacity>
            )}

            {colorTarget === 'highlight' && (
              <TouchableOpacity
                style={styles.noHighlightBtn}
                onPressIn={handlePressIn}
                onPress={() => handleColorSelect('transparent')}
              >
                <Text style={styles.noHighlightText}>
                  {currentHighlight === 'transparent'
                    ? '✓ بێ هاینایت (No Highlight / Transparent)'
                    : '⊗ لابردنی هاینایت (Clear Highlight)'}
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
                      onPressIn={handlePressIn}
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
                  onPressIn={handlePressIn}
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
                  onPressIn={handlePressIn}
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
                      onPressIn={handlePressIn}
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
            <Text style={styles.modalTitle}>نوسینی دەق و تەحدیدکردن ✍️</Text>

            <View style={styles.modalFormatBar}>
              <TouchableOpacity
                style={styles.modalFormatBtn}
                onPressIn={handlePressIn}
                onPress={() => applyRunStyle({ bold: !currentStyle.bold })}
              >
                <Text style={[styles.modalFormatBtnText, currentStyle.bold && { color: '#30d158' }]}>B</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalFormatBtn}
                onPressIn={handlePressIn}
                onPress={() => applyRunStyle({ italic: !currentStyle.italic })}
              >
                <Text style={[styles.modalFormatBtnText, { fontStyle: 'italic' }, currentStyle.italic && { color: '#30d158' }]}>I</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalFormatBtn}
                onPressIn={handlePressIn}
                onPress={() => applyRunStyle({ underline: !currentStyle.underline })}
              >
                <Text style={[styles.modalFormatBtnText, { textDecorationLine: 'underline' }, currentStyle.underline && { color: '#30d158' }]}>U</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalFormatBtn}
                onPressIn={handlePressIn}
                onPress={() => applyRunStyle({ sizeScaleDelta: 0.1 })}
              >
                <Text style={styles.modalFormatBtnText}>A+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalFormatBtn}
                onPressIn={handlePressIn}
                onPress={() => applyRunStyle({ sizeScaleDelta: -0.1 })}
              >
                <Text style={styles.modalFormatBtnText}>A-</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Color Palette for Highlighted Word */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 6, marginBottom: 10 }}
            >
              {['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#007aff', '#5856d6', '#af52de', '#ffffff', '#000000'].map((hex) => (
                <TouchableOpacity
                  key={`modal_color_${hex}`}
                  style={[styles.colorSquare, { backgroundColor: hex, width: 22, height: 22 }]}
                  onPressIn={handlePressIn}
                  onPress={() => applyRunStyle({ color: hex })}
                />
              ))}
            </ScrollView>

            <TextInput
              style={[styles.modalInput, { color: undefined }]}
              multiline
              selection={selState}
              onSelectionChange={(e) => {
                const sel = e.nativeEvent.selection;
                console.log('[SEL]', sel);
                if (!pressingRef.current) {
                  setSelection(sel);
                  if (selRef) selRef.current = sel;
                  if (setSelState) setSelState(sel);
                }
              }}
              onChangeText={(text) => {
                if (text === tempText) return;
                setTempText(text);
                const updated = updateElementText(element, text, selection);
                onChangeElement(updated);
              }}
              placeholder="دەقەکەت لێرە بنووسە..."
              placeholderTextColor="#777"
              textAlign={element.writingDirection === 'ltr' ? 'left' : 'right'}
            >
              {runs.map((r, i) => (
                <Text key={i} style={{ color: r.color || '#1c1c1e' }}>
                  {r.text}
                </Text>
              ))}
            </TextInput>

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

      {/* Font Selector Bottom Sheet */}
      <Modal visible={fontModalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={() => setFontModalVisible(false)}
        >
          <TouchableOpacity style={styles.bottomSheetBox} activeOpacity={1}>
            <View style={styles.bottomSheetHandle} />

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

            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {filteredFontList.map((font) => {
                const isKurdishTab = fontModalCategory === 'kurdish';
                const currentSelected = isKurdishTab ? currentKurdishFont : currentEnglishFont;
                const isSelected = currentSelected === font.name;
                const sampleText = isKurdishTab ? 'ئەبجەد هەوز' : 'Abc 123';

                return (
                  <TouchableOpacity
                    key={font.name}
                    style={[styles.fontRowItem, isSelected && styles.fontRowItemActive]}
                    onPressIn={handlePressIn}
                    onPress={() => {
                      if (isKurdishTab) {
                        applyRunStyle({ kuFont: font.name });
                      } else {
                        applyRunStyle({ enFont: font.name });
                      }
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fontRowLabel, { fontFamily: font.name }, isSelected && styles.fontRowLabelActive]}>
                        {font.label}
                      </Text>
                      <Text style={styles.fontRowSample}>{sampleText}</Text>
                    </View>
                    {isSelected && <Text style={styles.checkIcon}>✓</Text>}
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
    paddingBottom: 10,
  },
  tabHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1e',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  tabHeaderBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabHeaderBtnActive: {
    borderBottomColor: '#8B3A2B',
  },
  tabHeaderBtnText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabHeaderBtnTextActive: {
    color: '#fff',
  },
  tabContentBox: {
    padding: 10,
  },
  wrappedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fontControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  sizeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sizeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  fontSizeText: {
    color: '#aaa',
    fontSize: 12,
    marginHorizontal: 4,
  },
  autoModeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 4,
  },
  autoModeBtnActive: {
    backgroundColor: '#8B3A2B',
  },
  autoModeText: {
    color: '#888',
    fontSize: 11,
  },
  autoModeTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  alignGroup: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    padding: 2,
  },
  alignBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  alignBtnActive: {
    backgroundColor: '#3a3a3c',
  },
  alignBtnText: {
    color: '#aaa',
    fontSize: 11,
  },
  alignBtnTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  styleGroup: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    padding: 2,
  },
  styleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  styleBtnActive: {
    backgroundColor: '#8B3A2B',
  },
  styleBtnText: {
    color: '#fff',
    fontSize: 13,
  },
  iconBtn: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  iconBtnText: {
    color: '#fff',
    fontSize: 12,
  },
  fontSelectorCardsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  fontSelectCard: {
    flex: 1,
    backgroundColor: '#2c2c2e',
    padding: 10,
    borderRadius: 8,
  },
  fontCardSub: {
    color: '#888',
    fontSize: 10,
  },
  fontCardTitle: {
    color: '#fff',
    fontSize: 14,
    marginVertical: 4,
  },
  fontCardAction: {
    color: '#8B3A2B',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  fontChip: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  fontChipActive: {
    backgroundColor: '#8B3A2B',
  },
  fontChipText: {
    color: '#ccc',
    fontSize: 12,
  },
  fontChipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  colorTargetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  colorTargetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2c2c2e',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  colorTargetBtnActive: {
    backgroundColor: '#3a3a3c',
    borderWidth: 1,
    borderColor: '#8B3A2B',
  },
  colorTargetText: {
    color: '#aaa',
    fontSize: 11,
  },
  colorTargetTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  miniDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noHighlightBtn: {
    backgroundColor: '#2c2c2e',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  noHighlightText: {
    color: '#ff453a',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gridBox: {
    gap: 4,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  standardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  colorSquare: {
    width: 28,
    height: 28,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSquareSelected: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'right',
  },
  modalFormatBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  modalFormatBtn: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modalFormatBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalInput: {
    backgroundColor: '#2c2c2e',
    color: '#fff',
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    maxHeight: 150,
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalSaveBtn: {
    backgroundColor: '#8B3A2B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetBox: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#3a3a3c',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  fontModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  doneBtn: {
    backgroundColor: '#8B3A2B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fontModalTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  fontModalClose: {
    color: '#aaa',
    fontSize: 18,
  },
  livePreviewBox: {
    backgroundColor: '#2c2c2e',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  livePreviewLabel: {
    color: '#888',
    fontSize: 10,
    marginBottom: 4,
  },
  livePreviewText: {
    fontSize: 16,
  },
  fontSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  fontSearchInput: {
    flex: 1,
    color: '#fff',
    paddingVertical: 8,
    fontSize: 13,
  },
  fontTabRow: {
    flexDirection: 'row',
    marginBottom: 10,
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    padding: 2,
  },
  fontTabBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  fontTabBtnActive: {
    backgroundColor: '#3a3a3c',
  },
  fontTabText: {
    color: '#aaa',
    fontSize: 12,
  },
  fontTabTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  fontRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  fontRowItemActive: {
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
  },
  fontRowLabel: {
    color: '#fff',
    fontSize: 15,
  },
  fontRowLabelActive: {
    color: '#30d158',
    fontWeight: 'bold',
  },
  fontRowSample: {
    color: '#777',
    fontSize: 11,
    marginTop: 2,
  },
  checkIcon: {
    color: '#30d158',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
