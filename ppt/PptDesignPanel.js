import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Keyboard,
  Platform,
  ToastAndroid,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ExpoImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import PptSlider from './PptSlider';
import { PptSlideBackground, getSlideBaseColor } from './PptSlideBackground';
import { PptCleanSlide } from './PptCleanSlide';
import {
  getSlideBackground,
  makeSlideBackgroundPatch,
  normalizeHexColor,
  GRADIENT_ANGLES,
  MAX_BG_OVERLAY,
} from './slideBackground';
import { PPT_THEMES, buildThemeSampleSlide } from './pptThemes';

const BG_PALETTE = [
  '#ffffff', '#f8f9fa', '#fff8e7', '#f5f5f7', '#eef9ef', '#fef2f2', '#f3f0ff', '#f0f9ff',
  '#e5e5ea', '#c6d9f1', '#fde9d9', '#eaf1dd', '#ffc000', '#f79646', '#c0504d', '#c00000',
  '#9bbb59', '#2e7d32', '#4bacc6', '#0070c0', '#1f497d', '#002060', '#8064a2', '#7030a0',
  '#8B3A2B', '#7f7f7f', '#3a3a3c', '#1f2937', '#1c1c1e', '#111827', '#0f172a', '#000000',
];

const BG_TYPES = [
  { key: 'solid', label: 'ڕەنگی تاک', icon: 'color-fill-outline' },
  { key: 'gradient', label: 'دوو ڕەنگی تێکەڵ', icon: 'contrast-outline' },
  { key: 'image', label: 'وێنە', icon: 'image-outline' },
];

// Share of the window the scrollable panel body may use, so the slide preview
// above it always stays visible.
const PANEL_HEIGHT_RATIO = 0.42;
const PANEL_KEYBOARD_RATIO = 0.38;
const PANEL_MIN_HEIGHT = 110;
const HEX_RE = /^([0-9a-f]{3}|[0-9a-f]{6})$/i;

const showShortMessage = (msg) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('', msg);
  }
};
const PREVIEW_W = 128;
const THUMB_W = 150;

export const PptDesignPanel = ({
  targetSlide,
  targetIndex,
  totalSlides,
  aspectRatio,
  onPrevSlide,
  onNextSlide,
  onApplyBackground,
  onApplyTheme,
  fontFamily,
}) => {
  const [section, setSection] = useState('background'); // 'background' | 'themes'
  const [draft, setDraft] = useState(() => getSlideBackground(targetSlide));
  const [gradTarget, setGradTarget] = useState(1); // 1 | 2
  const [hexText, setHexText] = useState('');
  const [picking, setPicking] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const insets = useSafeAreaInsets();
  const { height: windowH } = useWindowDimensions();
  const scrollRef = useRef(null);
  const colorBlockYRef = useRef(0);
  const hexRowYRef = useRef(0);
  const hexFocusedRef = useRef(false);

  const scrollHexIntoView = () => {
    const y = colorBlockYRef.current + hexRowYRef.current;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 60), animated: true });
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e?.endCoordinates?.height || 0);
      // Wait for the panel to re-size above the keyboard, then reveal the hex row
      if (hexFocusedRef.current) setTimeout(scrollHexIntoView, 150);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Never taller than the space left under the slides (shrinks while the keyboard is open)
  const panelMaxHeight = keyboardHeight > 0
    ? Math.max(PANEL_MIN_HEIGHT, Math.round((windowH - keyboardHeight) * PANEL_KEYBOARD_RATIO))
    : Math.max(PANEL_MIN_HEIGHT, Math.round(windowH * PANEL_HEIGHT_RATIO));
  // Keep the last row above the Android navigation bar / gesture line
  const scrollBottomPad = (keyboardHeight > 0 ? 0 : insets.bottom || 0) + 24;

  const is43 = aspectRatio === '4:3';
  const slideAspect = is43 ? 4 / 3 : 16 / 9;
  const previewH = Math.round(PREVIEW_W / slideAspect);
  const thumbH = Math.round(THUMB_W / slideAspect);

  // Re-read the background whenever the target slide changes
  useEffect(() => {
    const bg = getSlideBackground(targetSlide);
    setDraft(bg);
    setHexText(bg.type === 'image' ? '' : (bg.color || '').replace('#', ''));
  }, [targetSlide?.id]);

  const themeSamples = useMemo(
    () => PPT_THEMES.map((theme) => ({ theme, slide: buildThemeSampleSlide(theme) })),
    []
  );

  const activeColor =
    draft.type === 'gradient' && gradTarget === 2 ? draft.color2 : draft.color;

  // Applies a color to the selected slot right away (solid color, or gradient color 1/2)
  const setActiveColor = (hex) => {
    const color = normalizeHexColor(hex);
    setDraft((d) => {
      if (d.type === 'gradient') {
        return gradTarget === 2 ? { ...d, color2: color } : { ...d, color };
      }
      return { type: 'solid', color };
    });
    setHexText(color.replace('#', ''));
  };

  // "دانان" / keyboard Enter: only a valid 3 or 6 digit hex code changes the color
  const commitHexText = () => {
    const raw = hexText.trim().replace(/^#/, '');
    if (!HEX_RE.test(raw)) {
      showShortMessage('کۆدی ڕەنگ هەڵەیە');
      return;
    }
    setActiveColor(`#${raw}`);
  };

  const switchType = (type) => {
    if (type === draft.type) return;
    const base = draft.type === 'image' ? '#ffffff' : (draft.color || '#ffffff');
    if (type === 'solid') {
      setDraft({ type: 'solid', color: base });
      setHexText(base.replace('#', ''));
    } else if (type === 'gradient') {
      setDraft({ type: 'gradient', color: base, color2: draft.color2 || '#1f497d', angle: draft.angle ?? 90 });
      setGradTarget(1);
      setHexText(base.replace('#', ''));
    } else {
      setDraft({ type: 'image', uri: draft.uri || null, overlay: draft.overlay || 0, color: base });
    }
  };

  const switchGradTarget = (n) => {
    setGradTarget(n);
    setHexText(((n === 2 ? draft.color2 : draft.color) || '').replace('#', ''));
  };

  // Gallery image → cover-crop to the slide aspect → JPEG, long side max 2000
  const pickBackgroundImage = async () => {
    try {
      const res = await ExpoImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 1.0,
      });
      if (res.canceled || !res.assets || res.assets.length === 0) return;
      setPicking(true);
      const asset = res.assets[0];
      const w = asset.width || 0;
      const h = asset.height || 0;
      const actions = [];
      let outW = w;
      let outH = h;
      if (w > 0 && h > 0) {
        if (w / h > slideAspect) {
          const cropW = Math.round(h * slideAspect);
          actions.push({ crop: { originX: Math.round((w - cropW) / 2), originY: 0, width: cropW, height: h } });
          outW = cropW;
        } else {
          const cropH = Math.round(w / slideAspect);
          actions.push({ crop: { originX: 0, originY: Math.round((h - cropH) / 2), width: w, height: cropH } });
          outH = cropH;
        }
        if (outW > 2000 || outH > 2000) {
          actions.push(outW >= outH ? { resize: { width: 2000 } } : { resize: { height: 2000 } });
        }
      }
      const manipulated = await manipulateAsync(asset.uri, actions, {
        compress: 0.85,
        format: SaveFormat.JPEG,
      });
      setDraft({ type: 'image', uri: manipulated.uri, overlay: draft.type === 'image' ? draft.overlay || 0 : 0, color: '#000000' });
    } catch (err) {
      console.log('[PPT Design] Background image pick error:', err);
      Alert.alert('هەڵە', 'کێشەیەک ڕوویدا لە هەڵبژاردنی وێنە.');
    } finally {
      setPicking(false);
    }
  };

  const applyBackground = (scope) => {
    if (draft.type === 'image' && !draft.uri) {
      Alert.alert('ئاگاداری', 'سەرەتا وێنەیەک لە گەلەری هەڵبژێرە.');
      return;
    }
    onApplyBackground(draft, scope);
  };

  const draftPreviewSlide = useMemo(
    () => ({ id: 'design_draft', ...makeSlideBackgroundPatch(draft) }),
    [draft]
  );

  return (
    <View style={styles.panel}>
      {/* Target slide selector */}
      <View style={styles.targetRow}>
        <TouchableOpacity
          style={[styles.targetArrow, targetIndex <= 0 && styles.disabled]}
          disabled={targetIndex <= 0}
          onPress={onPrevSlide}
        >
          <Ionicons name="chevron-forward" size={16} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.targetText}>{`سلایدی ${targetIndex + 1} لە ${totalSlides}`}</Text>
        <TouchableOpacity
          style={[styles.targetArrow, targetIndex >= totalSlides - 1 && styles.disabled]}
          disabled={targetIndex >= totalSlides - 1}
          onPress={onNextSlide}
        >
          <Ionicons name="chevron-back" size={16} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.sectionSwitch}>
          <TouchableOpacity
            style={[styles.sectionBtn, section === 'background' && styles.sectionBtnActive]}
            onPress={() => setSection('background')}
          >
            <Text style={[styles.sectionBtnText, section === 'background' && styles.sectionBtnTextActive]}>پشتەوە</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sectionBtn, section === 'themes' && styles.sectionBtnActive]}
            onPress={() => setSection('themes')}
          >
            <Text style={[styles.sectionBtnText, section === 'themes' && styles.sectionBtnTextActive]}>تێمەکان</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ maxHeight: panelMaxHeight }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        {section === 'background' ? (
          <View>
            {/* Background type */}
            <View style={styles.typeRow}>
              {BG_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeBtn, draft.type === t.key && styles.typeBtnActive]}
                  onPress={() => switchType(t.key)}
                >
                  <Ionicons name={t.icon} size={15} color={draft.type === t.key ? '#ffffff' : '#aaaaaa'} />
                  <Text style={[styles.typeBtnText, draft.type === t.key && styles.typeBtnTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Live preview of the draft background */}
            <View style={styles.previewRow}>
              <View
                style={[
                  styles.previewBox,
                  { width: PREVIEW_W, height: previewH, backgroundColor: getSlideBaseColor(draftPreviewSlide) },
                ]}
              >
                <PptSlideBackground slide={draftPreviewSlide} width={PREVIEW_W} height={previewH} />
              </View>
              <Text style={styles.previewHint}>پێشبینینی پشتەوە</Text>
            </View>

            {draft.type !== 'image' && (
              <View onLayout={(e) => { colorBlockYRef.current = e.nativeEvent.layout.y; }}>
                {draft.type === 'gradient' && (
                  <View>
                    <Text style={styles.label}>ڕەنگەکان:</Text>
                    <View style={styles.chipRow}>
                      {[1, 2].map((n) => {
                        const c = n === 1 ? draft.color : draft.color2;
                        const selected = gradTarget === n;
                        return (
                          <TouchableOpacity
                            key={`gt_${n}`}
                            style={[styles.slotBtn, selected && styles.slotBtnActive]}
                            onPress={() => switchGradTarget(n)}
                          >
                            <View style={[styles.slotDot, { backgroundColor: c }]} />
                            <View style={styles.slotTextBox}>
                              <Text style={[styles.slotText, selected && styles.slotTextActive]}>
                                {n === 1 ? 'ڕەنگی یەکەم' : 'ڕەنگی دووەم'}
                              </Text>
                              <Text style={styles.slotHex}>{(c || '').toUpperCase()}</Text>
                            </View>
                            {selected && <Ionicons name="checkmark-circle" size={16} color="#30d158" />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={styles.label}>ئاراستە:</Text>
                    <View style={styles.chipRow}>
                      {GRADIENT_ANGLES.map((ang) => (
                        <TouchableOpacity
                          key={`ang_${ang}`}
                          style={[styles.chip, draft.angle === ang && styles.chipActive]}
                          onPress={() => setDraft({ ...draft, angle: ang })}
                        >
                          <Ionicons
                            name="arrow-forward"
                            size={13}
                            color="#ffffff"
                            style={{ transform: [{ rotate: `${ang}deg` }] }}
                          />
                          <Text style={styles.chipText}>{`${ang}°`}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <Text style={styles.label}>
                  {draft.type === 'gradient'
                    ? `ڕەنگ هەڵبژێرە بۆ ${gradTarget === 2 ? 'ڕەنگی دووەم' : 'ڕەنگی یەکەم'}:`
                    : 'ڕەنگ هەڵبژێرە:'}
                </Text>
                <View style={styles.paletteGrid}>
                  {BG_PALETTE.map((hex) => {
                    const active = (activeColor || '').toLowerCase() === hex.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={`bgp_${hex}`}
                        style={[styles.swatch, { backgroundColor: hex }, active && styles.swatchActive]}
                        onPress={() => setActiveColor(hex)}
                      />
                    );
                  })}
                </View>

                <View style={styles.hexRow} onLayout={(e) => { hexRowYRef.current = e.nativeEvent.layout.y; }}>
                  <View style={[styles.hexSwatch, { backgroundColor: activeColor }]} />
                  <Text style={styles.hexHash}>#</Text>
                  <TextInput
                    style={styles.hexInput}
                    value={hexText}
                    onChangeText={(t) => setHexText(t.replace(/[^0-9a-fA-F]/g, '').slice(0, 6))}
                    onSubmitEditing={commitHexText}
                    onFocus={() => {
                      hexFocusedRef.current = true;
                      if (keyboardHeight > 0) setTimeout(scrollHexIntoView, 50);
                    }}
                    onBlur={() => { hexFocusedRef.current = false; }}
                    returnKeyType="done"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={7}
                    placeholder="ffffff"
                    placeholderTextColor="#666"
                  />
                  <TouchableOpacity style={styles.hexApplyBtn} onPress={commitHexText}>
                    <Text style={styles.hexApplyText}>دانان</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {draft.type === 'image' && (
              <View>
                <TouchableOpacity style={styles.pickBtn} onPress={pickBackgroundImage} disabled={picking}>
                  {picking ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="images-outline" size={17} color="#ffffff" />
                  )}
                  <Text style={styles.pickBtnText}>
                    {draft.uri ? 'گۆڕینی وێنە لە گەلەری' : 'هەڵبژاردنی وێنە لە گەلەری'}
                  </Text>
                </TouchableOpacity>
                {!!draft.uri && (
                  <Image source={{ uri: draft.uri }} style={styles.pickedThumb} resizeMode="cover" />
                )}
                <PptSlider
                  label="تاریککردنی وێنە"
                  unit="%"
                  min={0}
                  max={MAX_BG_OVERLAY}
                  step={1}
                  value={Math.round(draft.overlay || 0)}
                  onChange={(v) => setDraft((d) => ({ ...d, overlay: v }))}
                  style={{ marginTop: 6 }}
                />
              </View>
            )}

            <View style={styles.applyRow}>
              <TouchableOpacity style={styles.applyBtn} onPress={() => applyBackground('one')}>
                <Ionicons name="checkmark-outline" size={15} color="#ffffff" />
                <Text style={styles.applyText}>بۆ ئەم سلایدە</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.applyBtn, styles.applyAllBtn]} onPress={() => applyBackground('all')}>
                <Ionicons name="copy-outline" size={15} color="#ffffff" />
                <Text style={styles.applyText}>بۆ هەموو سلایدەکان</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.label}>تێمێک هەڵبژێرە، پاشان جێبەجێی بکە:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
              {themeSamples.map(({ theme, slide }) => {
                const isCurrent = targetSlide?.themeKey === theme.key;
                return (
                  <View key={theme.key} style={[styles.themeCard, isCurrent && styles.themeCardActive]}>
                    <View style={[styles.themeThumb, { width: THUMB_W, height: thumbH }]} pointerEvents="none">
                      <PptCleanSlide
                        slide={slide}
                        aspectRatio={aspectRatio}
                        width={THUMB_W}
                        height={thumbH}
                        fontFamily={fontFamily}
                      />
                    </View>
                    <Text style={styles.themeName} numberOfLines={1}>{theme.name}</Text>
                    <View style={styles.themeBtnRow}>
                      <TouchableOpacity style={styles.themeBtn} onPress={() => onApplyTheme(theme.key, 'one')}>
                        <Text style={styles.themeBtnText}>بۆ ئەم سلایدە</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.themeBtn, styles.themeBtnAll]}
                        onPress={() => onApplyTheme(theme.key, 'all')}
                      >
                        <Text style={styles.themeBtnText}>بۆ هەموو سلایدەکان</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  targetRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  targetArrow: {
    backgroundColor: '#2c2c2e',
    padding: 5,
    borderRadius: 6,
  },
  disabled: {
    opacity: 0.3,
  },
  targetText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionSwitch: {
    flexDirection: 'row-reverse',
    marginRight: 'auto',
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    padding: 2,
  },
  sectionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  sectionBtnActive: {
    backgroundColor: '#8B3A2B',
  },
  sectionBtnText: {
    color: '#aaaaaa',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionBtnTextActive: {
    color: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  typeRow: {
    flexDirection: 'row-reverse',
    gap: 6,
    marginBottom: 8,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  typeBtnActive: {
    backgroundColor: '#8B3A2B',
    borderColor: '#8B3A2B',
  },
  typeBtnText: {
    color: '#aaaaaa',
    fontSize: 11,
    fontWeight: 'bold',
  },
  typeBtnTextActive: {
    color: '#ffffff',
  },
  previewRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  previewBox: {
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  previewHint: {
    color: '#888888',
    fontSize: 11,
  },
  label: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 6,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  chip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  chipActive: {
    borderColor: '#30d158',
    backgroundColor: '#3a3a3c',
  },
  chipDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  slotBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3a3a3c',
  },
  slotBtnActive: {
    borderColor: '#30d158',
    backgroundColor: '#24382a',
  },
  slotDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  slotTextBox: {
    flex: 1,
    alignItems: 'flex-end',
  },
  slotText: {
    color: '#aaaaaa',
    fontSize: 11,
    fontWeight: 'bold',
  },
  slotTextActive: {
    color: '#ffffff',
  },
  slotHex: {
    color: '#888888',
    fontSize: 10,
    marginTop: 1,
  },
  chipText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  paletteGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 8,
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  swatchActive: {
    borderWidth: 2.5,
    borderColor: '#30d158',
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  hexSwatch: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffffff55',
  },
  hexHash: {
    color: '#aaaaaa',
    fontSize: 14,
    fontWeight: 'bold',
  },
  hexInput: {
    flex: 1,
    backgroundColor: '#2c2c2e',
    color: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  hexApplyBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  hexApplyText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  pickBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1f497d',
    paddingVertical: 10,
    borderRadius: 10,
  },
  pickBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pickedThumb: {
    width: 96,
    height: 54,
    borderRadius: 6,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  applyRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 10,
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#8B3A2B',
    paddingVertical: 10,
    borderRadius: 10,
  },
  applyAllBtn: {
    backgroundColor: '#2e7d32',
  },
  applyText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  themeCard: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 6,
    borderWidth: 1.5,
    borderColor: '#3a3a3c',
    alignItems: 'center',
  },
  themeCardActive: {
    borderColor: '#30d158',
  },
  themeThumb: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  themeName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 6,
    maxWidth: THUMB_W,
  },
  themeBtnRow: {
    flexDirection: 'row-reverse',
    gap: 4,
    marginTop: 6,
  },
  themeBtn: {
    backgroundColor: '#8B3A2B',
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 6,
  },
  themeBtnAll: {
    backgroundColor: '#2e7d32',
  },
  themeBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
