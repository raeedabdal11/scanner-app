import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Keyboard,
} from 'react-native';
import { KURDISH_FONTS, ENGLISH_FONTS } from './fonts';
import {
  getElementRuns,
  updateElementText,
  getSelectionStyle,
  isWordChar,
  getDisplayRunsWithSelection,
} from './formattedText';
import { applyStyle, wordRangeAt } from './richText';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function useRenderWhy(name, props) {
  const prevRef = useRef(null);
  useEffect(() => {
    if (prevRef.current) {
      const changed = [];
      for (const key in props) {
        if (prevRef.current[key] !== props[key]) {
          changed.push(key);
        }
      }
      if (changed.length > 0) {
        console.log(`[RENDER-WHY] ${name} changed: ${changed.join(', ')}`);
      } else {
        console.log(`[RENDER-WHY] ${name} re-rendered with identical props`);
      }
    } else {
      console.log(`[RENDER-WHY] ${name} mounted`);
    }
    prevRef.current = props;
  });
}

function renderStyledModalTextChildren(runs) {
  const safeRuns = runs ?? [];
  return safeRuns.map((r, i) => {
    const hasOwnHighlight = (r.highlight || r.highlightColor) && (r.highlight || r.highlightColor) !== 'transparent';
    const runHighlight = hasOwnHighlight ? (r.highlight || r.highlightColor) : undefined;

    return (
      <Text
        key={`modal_trun_${i}`}
        style={{
          fontWeight: r.bold ? 'bold' : 'normal',
          fontStyle: r.italic ? 'italic' : 'normal',
          textDecorationLine: r.underline ? 'underline' : 'none',
          color: r.color || '#1c1c1e',
          backgroundColor: runHighlight,
        }}
      >
        {r.text}
      </Text>
    );
  });
}

function parseShadowColor(shadowColorStr) {
  if (!shadowColorStr || shadowColorStr === 'transparent' || shadowColorStr === 'none') {
    return { baseColor: '#000000', opacity: 0.6 };
  }
  const rgbaMatch = shadowColorStr.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10) || 0;
    const g = parseInt(rgbaMatch[2], 10) || 0;
    const b = parseInt(rgbaMatch[3], 10) || 0;
    const opacity = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
    const hex = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
    return { baseColor: hex, opacity: isNaN(opacity) ? 0.6 : opacity };
  }
  let hex = shadowColorStr.replace('#', '');
  if (hex.length === 8) {
    const alphaHex = hex.slice(6, 8);
    const opacity = parseInt(alphaHex, 16) / 255;
    const baseHex = '#' + hex.slice(0, 6);
    return { baseColor: baseHex, opacity: isNaN(opacity) ? 0.6 : opacity };
  }
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length === 6) {
    return { baseColor: '#' + hex, opacity: 1.0 };
  }
  return { baseColor: '#000000', opacity: 0.6 };
}

function hexToRgba(hexInput, opacity = 1) {
  if (!hexInput || hexInput === 'transparent') return 'transparent';
  let clean = hexInput.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  if (clean.length >= 6) {
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    const op = Math.min(1, Math.max(0, opacity));
    return `rgba(${r}, ${g}, ${b}, ${Math.round(op * 100) / 100})`;
  }
  return hexInput;
}

function getShadowParams(style) {
  const shadowColorStr = style?.shadowColor;
  const hasShadow = !!(shadowColorStr && shadowColorStr !== 'transparent' && shadowColorStr !== 'none');

  const offsetObj = style?.textShadowOffset || style?.shadowOffset || { width: 2, height: 2 };
  const currOffset = hasShadow
    ? (typeof offsetObj.width === 'number' ? offsetObj.width : 2)
    : 2;

  const currBlur = hasShadow
    ? (style?.textShadowRadius !== undefined ? style.textShadowRadius : (style?.shadowRadius !== undefined ? style.shadowRadius : 3))
    : 3;

  const parsed = parseShadowColor(shadowColorStr);
  const currBaseColor = hasShadow ? parsed.baseColor : '#000000';
  const currOpacity = hasShadow ? parsed.opacity : 0.6;

  return {
    hasShadow,
    offset: Math.min(10, Math.max(0, Math.round(currOffset))),
    blur: Math.min(15, Math.max(0, Math.round(currBlur))),
    opacity: Math.min(1.0, Math.max(0.1, Math.round(currOpacity * 10) / 10)),
    baseColor: currBaseColor,
  };
}

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
  stickyRangeRef: externalStickyRangeRef,
  userTouchRef: externalUserTouchRef,
  ignoreSelectionRef: externalIgnoreSelectionRef,
  inputRef: externalInputRef,
  isApplyingStyleRef: externalIsApplyingStyleRef,
  controlledSelection: externalControlledSelection,
  setControlledSelection: externalSetControlledSelection,
  setShowSoftInputOnFocus,
}) => {
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'font' | 'color'
  const [colorTarget, setColorTarget] = useState('text'); // 'text' | 'shadow' | 'highlight'
  const [editTextModal, setEditTextModal] = useState(false);
  const [tempText, setTempText] = useState(element?.text || '');
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const localSelRef = useRef(null);
  const localPendingSelRef = useRef(null);
  const localPressingRef = useRef(false);
  const localStickyRangeRef = useRef({ start: 0, end: 0 });
  const localUserTouchRef = useRef(false);
  const localIgnoreSelectionRef = useRef(false);
  const localInputRef = useRef(null);
  const localIsApplyingStyleRef = useRef(false);
  const [localControlledSelection, setLocalControlledSelection] = useState(undefined);
  const touchTimeoutRef = useRef(null);

  const selRef = externalSelRef || localSelRef;
  const pendingSelRef = externalPendingSelRef || localPendingSelRef;
  const pressingRef = externalPressingRef || localPressingRef;
  const stickyRangeRef = externalStickyRangeRef || localStickyRangeRef;
  const userTouchRef = externalUserTouchRef || localUserTouchRef;
  const ignoreSelectionRef = externalIgnoreSelectionRef || localIgnoreSelectionRef;
  const inputRef = externalInputRef || localInputRef;
  const isApplyingStyleRef = externalIsApplyingStyleRef || localIsApplyingStyleRef;
  const controlledSelection = externalControlledSelection !== undefined ? externalControlledSelection : localControlledSelection;
  const setControlledSelection = externalSetControlledSelection || setLocalControlledSelection;

  const modalInputRef = useRef(null);
  const guardTimerRef = useRef(null);
  const hardGuardTimerRef = useRef(null);

  const turnOffGuard = (reason) => {
    if (guardTimerRef.current) {
      clearTimeout(guardTimerRef.current);
      guardTimerRef.current = null;
    }
    if (hardGuardTimerRef.current) {
      clearTimeout(hardGuardTimerRef.current);
      hardGuardTimerRef.current = null;
    }
    if (isApplyingStyleRef.current) {
      isApplyingStyleRef.current = false;
      console.log(`[GUARD] off (${reason})`);
    }
    if (setControlledSelection) {
      setControlledSelection(undefined);
    }
  };

  const turnOnGuard = (savedRange) => {
    isApplyingStyleRef.current = true;
    console.log('[GUARD] on', savedRange);

    if (guardTimerRef.current) clearTimeout(guardTimerRef.current);
    if (hardGuardTimerRef.current) clearTimeout(hardGuardTimerRef.current);

    guardTimerRef.current = setTimeout(() => {
      turnOffGuard('soft timeout');
    }, 350);

    // HARD maximum: ALWAYS turns off at most 600 ms after style was applied
    hardGuardTimerRef.current = setTimeout(() => {
      turnOffGuard('hard max 600ms');
    }, 600);
  };

  const restoreSelection = (savedRange) => {
    if (!savedRange) return;
    console.log('[STICKY] restore', savedRange);
    const activeTargetInput = editTextModal ? modalInputRef.current : inputRef.current;
    if (activeTargetInput) {
      if (activeTargetInput.focus) activeTargetInput.focus();
      if (typeof activeTargetInput.setSelection === 'function') {
        activeTargetInput.setSelection(savedRange.start, savedRange.end);
      } else if (activeTargetInput.setNativeProps) {
        activeTargetInput.setNativeProps({ selection: savedRange });
      }
    }
  };

  useEffect(() => {
    if (isApplyingStyleRef.current && stickyRangeRef.current) {
      const saved = stickyRangeRef.current;

      if (setControlledSelection) {
        setControlledSelection({ ...saved });
      }

      restoreSelection(saved);

      if (guardTimerRef.current) clearTimeout(guardTimerRef.current);
      guardTimerRef.current = setTimeout(() => {
        turnOffGuard('soft timeout');
      }, 350);
    }
  }, [element]);

  useEffect(() => {
    return () => {
      turnOffGuard('unmount');
    };
  }, []);

  // Font Sheet Modal State
  const [fontModalVisible, setFontModalVisible] = useState(false);
  const [fontModalCategory, setFontModalCategory] = useState('kurdish'); // 'kurdish' | 'english'
  const [fontSearchQuery, setFontSearchQuery] = useState('');

  if (!element || element.type !== 'text') return null;

  const runs = getElementRuns(element) || [];
  const baseSize = Math.round(element.computedFontSize || element.fontSize || 18);

  const setRuns = (newRuns) => {
    const plain = newRuns.map((r) => r.text).join('');
    const { color: _c, highlight: _h, highlightColor: _hc, shadowColor: _sc, shadow: _s, ...elemClean } = element;
    onChangeElement({
      ...elemClean,
      runs: newRuns,
      formattedRuns: newRuns,
      text: plain,
    });
  };

  const showNoSelectionToast = () => {
    if (Platform.OS === 'android') {
      ToastAndroid.show('سەرەتا دەقێک دیاری بکە', ToastAndroid.SHORT);
    }
  };

  const handlePressIn = () => {
    pressingRef.current = true;
    if (stickyRangeRef.current) {
      pendingSelRef.current = { ...stickyRangeRef.current };
    } else if (selRef.current) {
      pendingSelRef.current = { ...selRef.current };
    }

    if (setShowSoftInputOnFocus) {
      setShowSoftInputOnFocus(false);
    }
    Keyboard.dismiss();

    const saved = stickyRangeRef.current;
    if (saved && inputRef?.current) {
      if (inputRef.current.focus) inputRef.current.focus();
      if (typeof inputRef.current.setSelection === 'function') {
        inputRef.current.setSelection(saved.start, saved.end);
      } else if (inputRef.current.setNativeProps) {
        inputRef.current.setNativeProps({ selection: saved });
      }
    }
  };

  // ONE function for ALL formatting
  function applyRunStyle(patch, patchName = 'style') {
    const plain = runs.map((r) => r.text).join('');
    if (!plain) {
      showNoSelectionToast();
      return;
    }

    const curSticky = stickyRangeRef.current;
    if (
      !curSticky ||
      curSticky.start === undefined ||
      curSticky.end === undefined ||
      curSticky.start === curSticky.end
    ) {
      showNoSelectionToast();
      return;
    }

    let start = Math.max(0, Math.min(plain.length, curSticky.start));
    let end = Math.max(0, Math.min(plain.length, curSticky.end));
    if (start > end) [start, end] = [end, start];

    if (start === end) {
      showNoSelectionToast();
      return;
    }

    const savedRange = { start, end };
    stickyRangeRef.current = savedRange;

    turnOnGuard(savedRange);

    const newRuns = applyStyle(runs, start, end, patch);
    setRuns(newRuns);

    if (setControlledSelection) {
      setControlledSelection({ ...savedRange });
    }

    restoreSelection(savedRange);
  }

  // Active selection/word style query
  const currentSel = stickyRangeRef.current || pendingSelRef.current || selRef.current || selection;
  const currentStyle = getSelectionStyle(element, currentSel);
  const effectiveWordSize = Math.round(baseSize * (currentStyle.sizeScale ?? 1));

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
    });
  };

  const changeBaseSize = (delta) => {
    const currentBase = Math.round(element.computedFontSize || element.fontSize || 18);
    const newBase = clamp(currentBase + delta, 14, 40);
    const { color: _c, ...elemWithoutColor } = element;
    onChangeElement({
      ...elemWithoutColor,
      fontSize: newBase,
      fontMode: 'manual',
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

  const shadowParams = getShadowParams(currentStyle);

  const applyShadowPatch = (newOffset, newBlur, newOpacity, newBaseColor) => {
    const finalOffset = clamp(newOffset, 0, 10);
    const finalBlur = clamp(newBlur, 0, 15);
    const finalOpacity = clamp(Math.round(newOpacity * 10) / 10, 0.1, 1.0);
    const finalColor = hexToRgba(newBaseColor || shadowParams.baseColor, finalOpacity);

    applyRunStyle(
      {
        shadowColor: finalColor,
        textShadowColor: finalColor,
        shadow: finalColor,
        textShadowOffset: { width: finalOffset, height: finalOffset },
        shadowOffset: { width: finalOffset, height: finalOffset },
        textShadowRadius: finalBlur,
        shadowRadius: finalBlur,
      },
      'shadow'
    );
  };

  const changeShadowOffset = (delta) => {
    applyShadowPatch(shadowParams.offset + delta, shadowParams.blur, shadowParams.opacity, shadowParams.baseColor);
  };

  const changeShadowBlur = (delta) => {
    applyShadowPatch(shadowParams.offset, shadowParams.blur + delta, shadowParams.opacity, shadowParams.baseColor);
  };

  const changeShadowOpacity = (delta) => {
    applyShadowPatch(shadowParams.offset, shadowParams.blur, shadowParams.opacity + delta, shadowParams.baseColor);
  };

  const applyShadowPreset = (type) => {
    if (type === 'light') {
      applyShadowPatch(1, 2, 0.4, shadowParams.baseColor);
    } else if (type === 'medium') {
      applyShadowPatch(2, 3, 0.6, shadowParams.baseColor);
    } else if (type === 'strong') {
      applyShadowPatch(4, 6, 0.9, shadowParams.baseColor);
    }
  };

  const clearShadow = () => {
    applyRunStyle(
      {
        shadowColor: null,
        textShadowColor: null,
        shadow: null,
        textShadowOffset: { width: 0, height: 0 },
        shadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0,
        shadowRadius: 0,
      },
      'shadow'
    );
  };

  const activeSelectedColor =
    colorTarget === 'text'
      ? currentColor
      : colorTarget === 'shadow'
      ? shadowParams.baseColor
      : currentHighlight;

  const handleColorSelect = (hexColor) => {
    if (colorTarget === 'text') {
      applyRunStyle({ color: hexColor }, 'color');
    } else if (colorTarget === 'shadow') {
      if (hexColor === 'transparent') {
        clearShadow();
      } else {
        applyShadowPatch(shadowParams.offset, shadowParams.blur, shadowParams.opacity, hexColor);
      }
    } else if (colorTarget === 'highlight') {
      applyRunStyle({ highlight: hexColor === 'transparent' ? null : hexColor }, 'highlight');
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

  const handleCloseFontModal = () => {
    setFontModalVisible(false);
    if (setControlledSelection && stickyRangeRef.current) {
      const cur = { ...stickyRangeRef.current };
      setControlledSelection(cur);
      setTimeout(() => {
        if (inputRef.current?.focus) inputRef.current.focus();
        if (inputRef.current?.setNativeProps) {
          inputRef.current.setNativeProps({ selection: cur });
        }
        setControlledSelection(undefined);
      }, 50);
    }
  };

  return (
    <View style={styles.toolbarContainer}>
      {/* 3 Top Tabs: "نووسین", "فۆنت", "ڕەنگ" */}
      <View style={styles.tabHeaderRow}>
        <TouchableOpacity
          style={[styles.tabHeaderBtn, activeTab === 'text' && styles.tabHeaderBtnActive]}
          onPressIn={handlePressIn}
          onPress={() => setActiveTab('text')}
        >
          <Text style={[styles.tabHeaderBtnText, activeTab === 'text' && styles.tabHeaderBtnTextActive]}>
            نووسین ✏️
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabHeaderBtn, activeTab === 'font' && styles.tabHeaderBtnActive]}
          onPressIn={handlePressIn}
          onPress={() => setActiveTab('font')}
        >
          <Text style={[styles.tabHeaderBtnText, activeTab === 'font' && styles.tabHeaderBtnTextActive]}>
            {`فۆنت 🔤 (${activeKurdishObj.name})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabHeaderBtn, activeTab === 'color' && styles.tabHeaderBtnActive]}
          onPressIn={handlePressIn}
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

            {/* Word Size Controls (A- / A+) */}
            <View style={styles.fontControlsRow}>
              <TouchableOpacity
                style={styles.sizeBtn}
                onPressIn={handlePressIn}
                onPress={() =>
                  applyRunStyle((r) => ({ sizeScale: clamp((r.sizeScale ?? 1) - 0.15, 0.5, 3) }), 'A-')
                }
              >
                <Text style={styles.sizeBtnText}>A-</Text>
              </TouchableOpacity>

              <Text style={styles.fontSizeText}>
                {`${effectiveWordSize}pt`}
              </Text>

              <TouchableOpacity
                style={styles.sizeBtn}
                onPressIn={handlePressIn}
                onPress={() =>
                  applyRunStyle((r) => ({ sizeScale: clamp((r.sizeScale ?? 1) + 0.15, 0.5, 3) }), 'A+')
                }
              >
                <Text style={styles.sizeBtnText}>A+</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.autoModeBtn, isAutoMode && styles.autoModeBtnActive]}
                onPress={setAutoMode}
              >
                <Text style={[styles.autoModeText, isAutoMode && styles.autoModeTextActive]}>
                  {`خۆکار ${baseSize}pt`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Global Box Base Size Control ("قەبارەی گشتی") */}
            <View style={styles.boxSizeRow}>
              <Text style={styles.boxSizeLabel}>قەبارەی گشتی:</Text>

              <TouchableOpacity style={styles.sizeBtn} onPress={() => changeBaseSize(-2)}>
                <Text style={styles.sizeBtnText}>−</Text>
              </TouchableOpacity>

              <Text style={styles.fontSizeText}>{`${baseSize}pt`}</Text>

              <TouchableOpacity style={styles.sizeBtn} onPress={() => changeBaseSize(2)}>
                <Text style={styles.sizeBtnText}>+</Text>
              </TouchableOpacity>

              {!isAutoMode && (
                <Text style={styles.manualBadge}>دەستی</Text>
              )}
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
                onPress={() => applyRunStyle({ bold: !currentStyle.bold }, 'bold')}
              >
                <Text style={[styles.styleBtnText, { fontWeight: 'bold' }]}>B</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.styleBtn, currentStyle.italic && styles.styleBtnActive]}
                onPressIn={handlePressIn}
                onPress={() => applyRunStyle({ italic: !currentStyle.italic }, 'italic')}
              >
                <Text style={[styles.styleBtnText, { fontStyle: 'italic' }]}>I</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.styleBtn, currentStyle.underline && styles.styleBtnActive]}
                onPressIn={handlePressIn}
                onPress={() => applyRunStyle({ underline: !currentStyle.underline }, 'underline')}
              >
                <Text style={[styles.styleBtnText, { textDecorationLine: 'underline' }]}>U</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.styleBtn, shadowParams.hasShadow && styles.styleBtnActive]}
                onPressIn={handlePressIn}
                onPress={() => {
                  if (shadowParams.hasShadow) {
                    clearShadow();
                  } else {
                    applyShadowPatch(2, 3, 0.6, '#000000');
                  }
                }}
              >
                <Text style={[styles.styleBtnText, { fontWeight: 'bold' }]}>S</Text>
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
            keyboardShouldPersistTaps="always"
            contentContainerStyle={{ gap: 6 }}
          >
            {KURDISH_FONTS.slice(0, 10).map((font) => {
              const isSelected = currentKurdishFont === font.name;
              return (
                <TouchableOpacity
                  key={`quick_ku_${font.name}`}
                  style={[styles.fontChip, isSelected && styles.fontChipActive]}
                  onPressIn={handlePressIn}
                  onPress={() => applyRunStyle({ kuFont: font.name }, 'kuFont')}
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
              onPressIn={handlePressIn}
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
              onPressIn={handlePressIn}
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
              onPressIn={handlePressIn}
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
            style={{ maxHeight: 280 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
          >
            {colorTarget === 'shadow' && (
              <View style={styles.shadowControlPanel}>
                {/* Quick Presets */}
                <Text style={styles.sectionTitle}>پێشەنگە خێراکان (Quick Presets):</Text>
                <View style={styles.presetRow}>
                  <TouchableOpacity
                    style={styles.presetBtn}
                    onPressIn={handlePressIn}
                    onPress={() => applyShadowPreset('light')}
                  >
                    <Text style={styles.presetBtnText}>سووک</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetBtn}
                    onPressIn={handlePressIn}
                    onPress={() => applyShadowPreset('medium')}
                  >
                    <Text style={styles.presetBtnText}>مامناوەند</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetBtn}
                    onPressIn={handlePressIn}
                    onPress={() => applyShadowPreset('strong')}
                  >
                    <Text style={styles.presetBtnText}>بەهێز</Text>
                  </TouchableOpacity>
                </View>

                {/* Controls: Size, Blur, Opacity */}
                <View style={styles.shadowControlsBox}>
                  {/* 1. Size / Offset */}
                  <View style={styles.shadowControlRow}>
                    <Text style={styles.shadowControlLabel}>قەبارە / دووری (Size):</Text>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPressIn={handlePressIn}
                        onPress={() => changeShadowOffset(-1)}
                      >
                        <Text style={styles.stepperBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.stepperValText}>{shadowParams.offset}</Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPressIn={handlePressIn}
                        onPress={() => changeShadowOffset(1)}
                      >
                        <Text style={styles.stepperBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 2. Blur / Softness */}
                  <View style={styles.shadowControlRow}>
                    <Text style={styles.shadowControlLabel}>لێڵی / نەرمی (Blur):</Text>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPressIn={handlePressIn}
                        onPress={() => changeShadowBlur(-1)}
                      >
                        <Text style={styles.stepperBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.stepperValText}>{shadowParams.blur}</Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPressIn={handlePressIn}
                        onPress={() => changeShadowBlur(1)}
                      >
                        <Text style={styles.stepperBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 3. Darkness / Opacity */}
                  <View style={styles.shadowControlRow}>
                    <Text style={styles.shadowControlLabel}>تۆخی / ڕووناکی (Darkness):</Text>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPressIn={handlePressIn}
                        onPress={() => changeShadowOpacity(-0.1)}
                      >
                        <Text style={styles.stepperBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.stepperValText}>{`${Math.round(shadowParams.opacity * 100)}%`}</Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPressIn={handlePressIn}
                        onPress={() => changeShadowOpacity(0.1)}
                      >
                        <Text style={styles.stepperBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Remove shadow button */}
                <TouchableOpacity
                  style={styles.noHighlightBtn}
                  onPressIn={handlePressIn}
                  onPress={clearShadow}
                >
                  <Text style={styles.noHighlightText}>
                    {shadowParams.hasShadow
                      ? '⊗ لابردنی سێبەر (Clear Shadow)'
                      : '✓ بێ سێبەر (No Shadow / Transparent)'}
                  </Text>
                </TouchableOpacity>
              </View>
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
            <Text style={styles.sectionTitle}>
              {colorTarget === 'shadow'
                ? 'ڕەنگی سێبەر (Shadow Color)'
                : colorTarget === 'highlight'
                ? 'ڕەنگی هاینایت (Highlight Color)'
                : 'ڕەنگەکانی تێمی پاوەرپۆینت (Theme Colors)'}
            </Text>
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
                onPress={() => applyRunStyle({ bold: !currentStyle.bold }, 'bold')}
              >
                <Text style={[styles.modalFormatBtnText, currentStyle.bold && { color: '#30d158' }]}>B</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalFormatBtn}
                onPressIn={handlePressIn}
                onPress={() => applyRunStyle({ italic: !currentStyle.italic }, 'italic')}
              >
                <Text style={[styles.modalFormatBtnText, { fontStyle: 'italic' }, currentStyle.italic && { color: '#30d158' }]}>I</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalFormatBtn}
                onPressIn={handlePressIn}
                onPress={() => applyRunStyle({ underline: !currentStyle.underline }, 'underline')}
              >
                <Text style={[styles.modalFormatBtnText, { textDecorationLine: 'underline' }, currentStyle.underline && { color: '#30d158' }]}>U</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalFormatBtn}
                onPressIn={handlePressIn}
                onPress={() =>
                  applyRunStyle((r) => ({ sizeScale: clamp((r.sizeScale ?? 1) + 0.15, 0.5, 3) }), 'A+')
                }
              >
                <Text style={styles.modalFormatBtnText}>A+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalFormatBtn}
                onPressIn={handlePressIn}
                onPress={() =>
                  applyRunStyle((r) => ({ sizeScale: clamp((r.sizeScale ?? 1) - 0.15, 0.5, 3) }), 'A-')
                }
              >
                <Text style={styles.modalFormatBtnText}>A-</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Color Palette for Highlighted Word */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={{ gap: 6, marginBottom: 10 }}
            >
              {['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#007aff', '#5856d6', '#af52de', '#ffffff', '#000000'].map((hex) => (
                <TouchableOpacity
                  key={`modal_color_${hex}`}
                  style={[styles.colorSquare, { backgroundColor: hex, width: 22, height: 22 }]}
                  onPressIn={handlePressIn}
                  onPress={() => applyRunStyle({ color: hex }, 'color')}
                />
              ))}
            </ScrollView>

            <TextInput
              key={`modal_input_${element?.id}`}
              ref={modalInputRef}
              selection={controlledSelection}
              style={[styles.modalInput, { color: undefined }]}
              multiline
              onTouchStart={() => {
                if (userTouchRef) userTouchRef.current = true;
                if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
                touchTimeoutRef.current = setTimeout(() => {
                  if (userTouchRef) userTouchRef.current = false;
                }, 500);

                if (isApplyingStyleRef?.current) {
                  turnOffGuard('user touch');
                }
              }}
              onSelectionChange={(e) => {
                const sel = e.nativeEvent.selection;
                const isGuardActive = isApplyingStyleRef?.current;
                const saved = stickyRangeRef?.current;

                if (isGuardActive) {
                  const textLen = (element?.text || tempText || '').length;
                  const isCollapsedAtEnd = sel.start === sel.end && sel.start === textLen;
                  const matchesSaved = saved && sel.start === saved.start && sel.end === saved.end;

                  if (!userTouchRef?.current && (matchesSaved || isCollapsedAtEnd)) {
                    console.log('[SEL] ignored', sel);
                    return;
                  }

                  turnOffGuard('user selection');
                }

                console.log('[SEL] user', sel);
                if (stickyRangeRef) stickyRangeRef.current = sel;
              }}
              onChangeText={(text) => {
                if (isApplyingStyleRef?.current) return;
                const cursorPos = stickyRangeRef?.current?.start ?? text.length;
                if (stickyRangeRef) stickyRangeRef.current = { start: cursorPos, end: cursorPos };
                if (text === tempText) return;
                setTempText(text);
                const updated = updateElementText(element, text, stickyRangeRef.current);
                onChangeElement(updated);
              }}
              placeholder="دەقەکەت لێرە بنووسە..."
              placeholderTextColor="#777"
              textAlign={element.writingDirection === 'ltr' ? 'left' : 'right'}
            >
              {renderStyledModalTextChildren(runs)}
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
                  if (stickyRangeRef) stickyRangeRef.current = { start: 0, end: 0 };
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
          onPress={handleCloseFontModal}
        >
          <TouchableOpacity style={styles.bottomSheetBox} activeOpacity={1}>
            <View style={styles.bottomSheetHandle} />

            <View style={styles.fontModalHeader}>
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={handleCloseFontModal}
              >
                <Text style={styles.doneBtnText}>تەواو (Done) ✓</Text>
              </TouchableOpacity>

              <Text style={styles.fontModalTitle}>هەڵبژاردنی فۆنت 🔤</Text>

              <TouchableOpacity onPress={handleCloseFontModal}>
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
              keyboardShouldPersistTaps="always"
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
                        applyRunStyle({ kuFont: font.name }, 'kuFont');
                      } else {
                        applyRunStyle({ enFont: font.name }, 'enFont');
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
  boxSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  boxSizeLabel: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: 'bold',
  },
  manualBadge: {
    color: '#ff9500',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
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
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  shadowControlPanel: {
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: '#2c2c2e',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  presetBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  shadowControlsBox: {
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  shadowControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shadowControlLabel: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '500',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepperBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stepperBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepperValText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    minWidth: 36,
    textAlign: 'center',
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
