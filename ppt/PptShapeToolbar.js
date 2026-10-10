import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Platform,
  ToastAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PptSlider from './PptSlider';
import { SHAPE_STYLE_PRESETS, renderSvgShape } from './shapeCatalog';

const COLOR_PALETTE = [
  '#ffffff', '#000000', '#1f497d', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646',
  '#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b0f0', '#0070c0', '#7030a0',
  '#ff3b30', '#ff9500', '#34c759', '#007aff', '#5856d6', '#af52de', '#8e8e93', '#3a3a3c',
];

export const PptShapeToolbar = forwardRef(({
  selectedElement,
  onChangeElement,
  onDuplicateElement,
  onDeleteElement,
  onOpenShapePicker,
  onClose,
}, ref) => {
  const [activeSubTab, setActiveSubTab] = useState('style_presets'); // 'style_presets' | 'size' | 'fill' | 'text' | 'outline' | 'style' | 'tools'
  const [keepAspect, setKeepAspect] = useState(false);
  const textInputRef = useRef(null);

  useEffect(() => {
    if (selectedElement) {
      const isAspectLocked = selectedElement.lockAspect ?? selectedElement.keepAspect ?? false;
      setKeepAspect(!!isAspectLocked);
    }
  }, [selectedElement?.id, selectedElement?.lockAspect, selectedElement?.keepAspect]);

  // Expose back navigation and openTextTabAndFocus handlers via ref
  useImperativeHandle(ref, () => ({
    closeSubModal: () => null,
    closeTabPanel: () => {
      if (activeSubTab !== 'size') {
        setActiveSubTab('size');
        return 'shape toolbar tab (' + activeSubTab + ')';
      }
      return null;
    },
    openTextTabAndFocus: () => {
      setActiveSubTab('text');
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    },
  }), [activeSubTab]);

  if (!selectedElement || selectedElement.type !== 'shape') {
    return null;
  }

  const updateShape = (patch) => {
    onChangeElement({
      ...selectedElement,
      ...patch,
    });
  };

  const shapeType = selectedElement.shapeType || 'rect';
  const isLineOrArrow = shapeType === 'line' || shapeType === 'arrow';

  const currentWidth = Math.round(selectedElement.width || 30);
  const currentHeight = Math.round(selectedElement.height || 20);
  const currentX = Math.round(selectedElement.x || 35);
  const currentY = Math.round(selectedElement.y || 40);

  const currentFill = selectedElement.fill || 'none';
  const currentOpacity = selectedElement.opacity !== undefined ? selectedElement.opacity : 1.0;
  const currentRotation = selectedElement.rotation || 0;
  const currentCornerRadius = selectedElement.cornerRadius !== undefined ? selectedElement.cornerRadius : 20;

  const outline = selectedElement.outline || { color: '#000000', width: 2 };
  const currentOutlineColor = outline.color || '#000000';
  const currentOutlineWidth = outline.width !== undefined ? outline.width : 2;

  const isLocked = !!selectedElement.locked;

  // Toggle Aspect Ratio Lock
  const toggleAspectLock = () => {
    const nextVal = !keepAspect;
    setKeepAspect(nextVal);
    const aspect = (currentWidth && currentHeight && currentHeight > 0)
      ? (currentWidth / currentHeight)
      : (selectedElement?.aspectRatio || 1);
    updateShape({
      lockAspect: nextVal,
      keepAspect: nextVal,
      aspectRatio: aspect,
    });
  };

  // --- Size Handlers ---
  const changeWidth = (newW) => {
    const clampedW = Math.max(5, Math.min(100, Math.round(newW)));
    const isAspectLocked = selectedElement?.lockAspect ?? selectedElement?.keepAspect ?? keepAspect;
    const aspect = selectedElement?.aspectRatio || (currentWidth / Math.max(1, currentHeight)) || 1;
    if (isAspectLocked) {
      const newH = Math.max(3, Math.min(100, Math.round(clampedW / aspect)));
      updateShape({
        width: clampedW,
        height: newH,
        lockAspect: true,
        keepAspect: true,
        aspectRatio: aspect,
      });
    } else {
      const newAspect = clampedW / Math.max(1, currentHeight);
      updateShape({
        width: clampedW,
        aspectRatio: newAspect,
        lockAspect: false,
        keepAspect: false,
      });
    }
  };

  const changeHeight = (newH) => {
    const clampedH = Math.max(3, Math.min(100, Math.round(newH)));
    const isAspectLocked = selectedElement?.lockAspect ?? selectedElement?.keepAspect ?? keepAspect;
    const aspect = selectedElement?.aspectRatio || (currentWidth / Math.max(1, currentHeight)) || 1;
    if (isAspectLocked) {
      const newW = Math.max(5, Math.min(100, Math.round(clampedH * aspect)));
      updateShape({
        width: newW,
        height: clampedH,
        lockAspect: true,
        keepAspect: true,
        aspectRatio: aspect,
      });
    } else {
      const newAspect = Math.max(1, currentWidth) / clampedH;
      updateShape({
        height: clampedH,
        aspectRatio: newAspect,
        lockAspect: false,
        keepAspect: false,
      });
    }
  };

  const changeX = (newX) => {
    const clampedX = Math.max(0, Math.min(100 - currentWidth, Math.round(newX * 10) / 10));
    updateShape({ x: clampedX });
  };

  const changeY = (newY) => {
    const clampedY = Math.max(0, Math.min(100 - currentHeight, Math.round(newY * 10) / 10));
    updateShape({ y: clampedY });
  };

  // --- Fill & Outline Handlers ---
  const setFillColor = (hex) => {
    updateShape({ fill: hex });
  };

  const setOutlineColor = (hex) => {
    updateShape({
      outline: {
        color: hex,
        width: currentOutlineWidth > 0 ? currentOutlineWidth : 2,
      },
    });
  };

  const setOutlineWidth = (w) => {
    updateShape({
      outline: {
        color: currentOutlineColor,
        width: w,
      },
    });
  };

  // Opacity Change (10 - 100%)
  const changeOpacity = (val) => {
    const clamped = Math.max(0.1, Math.min(1.0, Math.round(val * 100) / 100));
    updateShape({ opacity: clamped });
  };

  // Corner Roundness Change (0 - 50%)
  const changeCornerRadius = (rad) => {
    const clamped = Math.max(0, Math.min(50, rad));
    updateShape({ cornerRadius: clamped });
  };

  // Rotation Change
  const addRotation = (deg) => {
    let newRot = (currentRotation + deg) % 360;
    if (newRot < 0) newRot += 360;
    updateShape({ rotation: newRot });
  };

  const setRotation = (deg) => {
    updateShape({ rotation: deg });
  };

  // Lock / Unlock
  const toggleLock = () => {
    const nextLock = !isLocked;
    updateShape({ locked: nextLock });
    if (Platform.OS === 'android') {
      ToastAndroid.show(
        nextLock ? 'شێوەکە قفڵکرا 🔒' : 'قفڵی شێوەکە کرایەوە 🔓',
        ToastAndroid.SHORT
      );
    }
  };

  // --- Apply Preset Shape Style (أنماط الأشكال) ---
  const applyShapeStylePreset = (preset) => {
    updateShape({
      fill: preset.fill,
      outline: {
        color: preset.outlineColor,
        width: preset.outlineWidth,
      },
      textColor: preset.textColor || selectedElement.textColor || '#000000',
      bold: preset.bold !== undefined ? preset.bold : (selectedElement.bold || false),
      opacity: preset.opacity !== undefined ? preset.opacity : (selectedElement.opacity !== undefined ? selectedElement.opacity : 1.0),
    });
  };

  return (
    <View style={styles.toolbarContainer}>
      {/* Top Header Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabHeaderRow}>
        {!isLineOrArrow && (
          <TouchableOpacity
            style={[styles.tabHeaderBtn, activeSubTab === 'style_presets' && styles.tabHeaderBtnActive]}
            onPress={() => setActiveSubTab('style_presets')}
          >
            <Ionicons name="color-palette-outline" size={15} color={activeSubTab === 'style_presets' ? '#ffffff' : '#aaaaaa'} />
            <Text style={[styles.tabHeaderBtnText, activeSubTab === 'style_presets' && styles.tabHeaderBtnTextActive]}>
              أنماط الأشكال (Shape Styles)
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.tabHeaderBtn, activeSubTab === 'size' && styles.tabHeaderBtnActive]}
          onPress={() => setActiveSubTab('size')}
        >
          <Ionicons name="resize-outline" size={15} color={activeSubTab === 'size' ? '#ffffff' : '#aaaaaa'} />
          <Text style={[styles.tabHeaderBtnText, activeSubTab === 'size' && styles.tabHeaderBtnTextActive]}>
            قەبارەی ستوونی و ئاسۆیی (Size)
          </Text>
        </TouchableOpacity>

        {!isLineOrArrow && (
          <TouchableOpacity
            style={[styles.tabHeaderBtn, activeSubTab === 'fill' && styles.tabHeaderBtnActive]}
            onPress={() => setActiveSubTab('fill')}
          >
            <Ionicons name="color-fill-outline" size={15} color={activeSubTab === 'fill' ? '#ffffff' : '#aaaaaa'} />
            <Text style={[styles.tabHeaderBtnText, activeSubTab === 'fill' && styles.tabHeaderBtnTextActive]}>
              ڕەنگ (Fill)
            </Text>
          </TouchableOpacity>
        )}

        {!isLineOrArrow && (
          <TouchableOpacity
            style={[styles.tabHeaderBtn, activeSubTab === 'text' && styles.tabHeaderBtnActive]}
            onPress={() => {
              setActiveSubTab('text');
              setTimeout(() => textInputRef.current?.focus(), 100);
            }}
          >
            <Ionicons name="text-outline" size={15} color={activeSubTab === 'text' ? '#ffffff' : '#aaaaaa'} />
            <Text style={[styles.tabHeaderBtnText, activeSubTab === 'text' && styles.tabHeaderBtnTextActive]}>
              نووسین
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.tabHeaderBtn, activeSubTab === 'outline' && styles.tabHeaderBtnActive]}
          onPress={() => setActiveSubTab('outline')}
        >
          <Ionicons name="square-outline" size={15} color={activeSubTab === 'outline' ? '#ffffff' : '#aaaaaa'} />
          <Text style={[styles.tabHeaderBtnText, activeSubTab === 'outline' && styles.tabHeaderBtnTextActive]}>
            چوارچێوە (Outline)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabHeaderBtn, activeSubTab === 'style' && styles.tabHeaderBtnActive]}
          onPress={() => setActiveSubTab('style')}
        >
          <Ionicons name="options-outline" size={15} color={activeSubTab === 'style' ? '#ffffff' : '#aaaaaa'} />
          <Text style={[styles.tabHeaderBtnText, activeSubTab === 'style' && styles.tabHeaderBtnTextActive]}>
            شێواز و ڕوونی
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabHeaderBtn, activeSubTab === 'tools' && styles.tabHeaderBtnActive]}
          onPress={() => setActiveSubTab('tools')}
        >
          <Ionicons name="build-outline" size={15} color={activeSubTab === 'tools' ? '#ffffff' : '#aaaaaa'} />
          <Text style={[styles.tabHeaderBtnText, activeSubTab === 'tools' && styles.tabHeaderBtnTextActive]}>
            ئامرازەکان
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabHeaderBtn, { backgroundColor: '#0a84ff', paddingHorizontal: 10 }]}
          onPress={() => {
            if (onOpenShapePicker) onOpenShapePicker('change');
          }}
        >
          <Ionicons name="shapes-outline" size={15} color="#ffffff" />
          <Text style={[styles.tabHeaderBtnText, { color: '#ffffff', fontWeight: 'bold' }]}>
            گۆڕینی شێوە
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* SUB-TAB 0: SHAPE STYLE PRESETS ("أنماط الأشكال") */}
      {!isLineOrArrow && activeSubTab === 'style_presets' && (
        <View style={styles.tabContentBox}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScrollRow}>
            {SHAPE_STYLE_PRESETS.map((preset) => {
              const isSelectedPreset =
                currentFill.toLowerCase() === preset.fill.toLowerCase() &&
                currentOutlineColor.toLowerCase() === preset.outlineColor.toLowerCase();

              return (
                <TouchableOpacity
                  key={`preset_${preset.id}`}
                  style={[
                    styles.presetCard,
                    isSelectedPreset && styles.presetCardActive,
                  ]}
                  onPress={() => applyShapeStylePreset(preset)}
                >
                  <View style={styles.presetPreviewBox}>
                    {renderSvgShape({
                      shapeType: shapeType,
                      fill: preset.fill,
                      outlineColor: preset.outlineColor,
                      outlineWidth: preset.outlineWidth,
                      cornerRadius: currentCornerRadius,
                      svgWidth: '100%',
                      svgHeight: '100%',
                    })}
                  </View>
                  <Text style={styles.presetCardText} numberOfLines={1}>
                    {preset.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* SUB-TAB 1: SIZE & DIMENSIONS ("قەبارەی ستوونی و ئاسۆیی") */}
      {activeSubTab === 'size' && (
        <View style={styles.tabContentBox}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sizeSectionContainer}>
            {/* Width Controls (پانی / Horizontal) */}
            <View style={styles.dimensionBox}>
              <View style={styles.dimensionHeader}>
                <Text style={styles.dimensionTitle}>پانی (Width): {currentWidth}%</Text>
                <View style={styles.stepBtnGroup}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => changeWidth(currentWidth - 1)}>
                    <Text style={styles.stepBtnText}>-1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => changeWidth(currentWidth + 1)}>
                    <Text style={styles.stepBtnText}>+1</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <PptSlider
                label="پانی"
                unit="%"
                min={5}
                max={100}
                step={1}
                value={currentWidth}
                onChange={changeWidth}
                style={{ width: 170 }}
              />

              <View style={styles.chipRow}>
                {[15, 25, 50, 75, 100].map((wVal) => (
                  <TouchableOpacity
                    key={`wchip_${wVal}`}
                    style={[styles.chipBtn, currentWidth === wVal && styles.chipBtnActive]}
                    onPress={() => changeWidth(wVal)}
                  >
                    <Text style={[styles.chipBtnText, currentWidth === wVal && styles.chipBtnTextActive]}>{wVal}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Height Controls (بەرزایی / Vertical) */}
            <View style={styles.dimensionBox}>
              <View style={styles.dimensionHeader}>
                <Text style={styles.dimensionTitle}>بەرزایی (Height): {currentHeight}%</Text>
                <View style={styles.stepBtnGroup}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => changeHeight(currentHeight - 1)}>
                    <Text style={styles.stepBtnText}>-1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => changeHeight(currentHeight + 1)}>
                    <Text style={styles.stepBtnText}>+1</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <PptSlider
                label="بەرزایی"
                unit="%"
                min={3}
                max={100}
                step={1}
                value={currentHeight}
                onChange={changeHeight}
                style={{ width: 170 }}
              />

              <View style={styles.chipRow}>
                {[10, 20, 35, 50, 75].map((hVal) => (
                  <TouchableOpacity
                    key={`hchip_${hVal}`}
                    style={[styles.chipBtn, currentHeight === hVal && styles.chipBtnActive]}
                    onPress={() => changeHeight(hVal)}
                  >
                    <Text style={[styles.chipBtnText, currentHeight === hVal && styles.chipBtnTextActive]}>{hVal}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Position X Controls */}
            <View style={styles.dimensionBox}>
              <Text style={styles.dimensionTitle}>شوێنی ئاسۆیی (X): {currentX}%</Text>
              <PptSlider
                label="شوێنی X"
                unit="%"
                min={0}
                max={Math.max(1, 100 - currentWidth)}
                step={1}
                value={currentX}
                onChange={changeX}
                style={{ width: 150 }}
              />
            </View>

            {/* Position Y Controls */}
            <View style={styles.dimensionBox}>
              <Text style={styles.dimensionTitle}>شوێنی ستوونی (Y): {currentY}%</Text>
              <PptSlider
                label="شوێنی Y"
                unit="%"
                min={0}
                max={Math.max(1, 100 - currentHeight)}
                step={1}
                value={currentY}
                onChange={changeY}
                style={{ width: 150 }}
              />
            </View>

            {/* Aspect Ratio Lock Toggle */}
            <TouchableOpacity
              style={[styles.aspectLockBtn, keepAspect && styles.aspectLockBtnActive]}
              onPress={toggleAspectLock}
            >
              <Ionicons name={keepAspect ? 'link' : 'unlink-outline'} size={18} color="#ffffff" />
              <Text style={styles.aspectLockText}>
                {keepAspect ? 'لێکچوونی ڕێژە (Locked)' : 'ڕێژەی ئازاد (Unlocked)'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* SUB-TAB 2: FILL COLOR ("ڕەنگ") */}
      {!isLineOrArrow && activeSubTab === 'fill' && (
        <View style={styles.tabContentBox}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContentRow}>
            {/* None / Transparent Button */}
            <TouchableOpacity
              style={[
                styles.noneBtn,
                (currentFill === 'none' || currentFill === 'transparent') && styles.noneBtnActive,
              ]}
              onPress={() => setFillColor('none')}
            >
              <Text style={{ fontSize: 14 }}>🚫</Text>
              <Text style={styles.noneBtnText}>بێ ڕەنگ</Text>
            </TouchableOpacity>

            {/* Color Palette */}
            {COLOR_PALETTE.map((hex) => (
              <TouchableOpacity
                key={`fill_${hex}`}
                style={[
                  styles.colorDot,
                  { backgroundColor: hex },
                  currentFill.toLowerCase() === hex.toLowerCase() && styles.colorDotActive,
                ]}
                onPress={() => setFillColor(hex)}
              >
                {currentFill.toLowerCase() === hex.toLowerCase() && (
                  <Text style={{ color: hex === '#ffffff' || hex === '#ffff00' ? '#000' : '#fff', fontSize: 10, fontWeight: 'bold' }}>
                    ✓
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* SUB-TAB 3: SHAPE TEXT ("نووسین") */}
      {!isLineOrArrow && activeSubTab === 'text' && (
        <View style={styles.tabContentBox}>
          <TextInput
            ref={textInputRef}
            style={styles.shapeTextInput}
            value={selectedElement.text || ''}
            onChangeText={(val) => updateShape({ text: val })}
            placeholder="دەقی شێوەکە بنووسە..."
            placeholderTextColor="#666666"
            multiline={true}
            textAlign="right"
            textAlignVertical="top"
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContentRow}>
            {/* Bold Toggle */}
            <TouchableOpacity
              style={[styles.boldToggleBtn, !!selectedElement.bold && styles.boldToggleBtnActive]}
              onPress={() => updateShape({ bold: !selectedElement.bold })}
            >
              <Text style={[styles.boldToggleText, !!selectedElement.bold && styles.boldToggleTextActive]}>
                B
              </Text>
            </TouchableOpacity>

            {/* Font Size Control */}
            <PptSlider
              label="قەبارە"
              unit="pt"
              min={8}
              max={72}
              step={1}
              value={selectedElement.fontSize || 16}
              onChange={(val) => updateShape({ fontSize: val })}
              style={{ width: 140 }}
            />

            {/* Text Color Palette */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: '#8B3A2B', fontSize: 11, fontWeight: 'bold' }}>ڕەنگ:</Text>
              {COLOR_PALETTE.map((hex) => {
                const isSelectedColor = (selectedElement.textColor || '#000000').toLowerCase() === hex.toLowerCase();
                return (
                  <TouchableOpacity
                    key={`tclr_${hex}`}
                    style={[
                      styles.colorDot,
                      { backgroundColor: hex },
                      isSelectedColor && styles.colorDotActive,
                    ]}
                    onPress={() => updateShape({ textColor: hex })}
                  >
                    {isSelectedColor && (
                      <Text style={{ color: hex === '#ffffff' || hex === '#ffff00' ? '#000' : '#fff', fontSize: 10, fontWeight: 'bold' }}>
                        ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* SUB-TAB 4: OUTLINE COLOR & WIDTH ("چوارچێوە") */}
      {activeSubTab === 'outline' && (
        <View style={styles.tabContentBox}>
          {/* Outline Width Slider */}
          <View style={styles.borderWidthRow}>
            <PptSlider
              label="ئەستووریی چوارچێوە"
              unit="px"
              min={0}
              max={20}
              step={1}
              value={currentOutlineWidth}
              onChange={setOutlineWidth}
            />
          </View>

          {/* Outline Color Palette */}
          {currentOutlineWidth > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorPaletteRow}>
              {COLOR_PALETTE.map((hex) => (
                <TouchableOpacity
                  key={`oclr_${hex}`}
                  style={[
                    styles.colorDot,
                    { backgroundColor: hex },
                    currentOutlineColor.toLowerCase() === hex.toLowerCase() && styles.colorDotActive,
                  ]}
                  onPress={() => setOutlineColor(hex)}
                >
                  {currentOutlineColor.toLowerCase() === hex.toLowerCase() && (
                    <Text style={{ color: hex === '#ffffff' || hex === '#ffff00' ? '#000' : '#fff', fontSize: 10, fontWeight: 'bold' }}>
                      ✓
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* SUB-TAB 5: STYLE, CORNER ROUNDNESS, OPACITY & ROTATION ("شێواز و ڕوونی") */}
      {activeSubTab === 'style' && (
        <View style={styles.tabContentBox}>
          <View style={[styles.scrollContentRow, { flexWrap: 'wrap' }]}>
            {/* 1. Corner Roundness for rounded rectangle (0 - 50%) */}
            {shapeType === 'roundRect' && (
              <PptSlider
                label="گۆشەی خڕ (Corners)"
                unit="%"
                min={0}
                max={50}
                step={1}
                value={currentCornerRadius}
                onChange={changeCornerRadius}
                style={{ width: 180 }}
              />
            )}

            {/* 2. Opacity (10 - 100%) */}
            <PptSlider
              label="ڕوونی (Opacity)"
              unit="%"
              min={10}
              max={100}
              step={1}
              value={Math.round(currentOpacity * 100)}
              onChange={(val) => changeOpacity(val / 100)}
              style={{ width: 180 }}
            />

            {/* 3. Rotation */}
            <View style={styles.controlGroup}>
              <Text style={styles.groupLabel}>سوڕاندن (Rotation):</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity style={styles.chipBtn} onPress={() => addRotation(-90)}>
                  <Text style={styles.chipBtnText}>↺ 90°</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.chipBtn} onPress={() => addRotation(90)}>
                  <Text style={styles.chipBtnText}>↻ 90°</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.chipBtn, currentRotation === 0 && styles.chipBtnActive]} onPress={() => setRotation(0)}>
                  <Text style={[styles.chipBtnText, currentRotation === 0 && styles.chipBtnTextActive]}>0°</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.chipBtn, currentRotation === 180 && styles.chipBtnActive]} onPress={() => setRotation(180)}>
                  <Text style={[styles.chipBtnText, currentRotation === 180 && styles.chipBtnTextActive]}>180°</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* SUB-TAB 6: TOOLS ("ئامرازەکان") */}
      {activeSubTab === 'tools' && (
        <View style={styles.tabContentBox}>
          <View style={styles.toolsRow}>
            <TouchableOpacity style={styles.toolBtn} onPress={() => onDuplicateElement(selectedElement.id)}>
              <Ionicons name="copy-outline" size={16} color="#ffffff" />
              <Text style={styles.toolBtnText}>کۆپی</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.toolBtn, isLocked && styles.toolBtnLocked]} onPress={toggleLock}>
              <Ionicons name={isLocked ? 'lock-closed' : 'lock-open-outline'} size={16} color={isLocked ? '#ffcc00' : '#ffffff'} />
              <Text style={styles.toolBtnText}>{isLocked ? 'بکرێتەوە' : 'قفڵکردن'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => {
                updateShape({ zIndex: (selectedElement.zIndex || 1) + 1 });
              }}
            >
              <Ionicons name="arrow-up-circle-outline" size={16} color="#ffffff" />
              <Text style={styles.toolBtnText}>پێشەوە</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => {
                updateShape({ zIndex: Math.max(1, (selectedElement.zIndex || 1) - 1) });
              }}
            >
              <Ionicons name="arrow-down-circle-outline" size={16} color="#ffffff" />
              <Text style={styles.toolBtnText}>پاشەوە</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.toolBtn, { backgroundColor: '#ff453a22' }]} onPress={() => onDeleteElement(selectedElement.id)}>
              <Ionicons name="trash-outline" size={16} color="#ff453a" />
              <Text style={[styles.toolBtnText, { color: '#ff453a' }]}>سڕینەوە</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  },
  presetScrollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  presetCard: {
    width: 90,
    height: 75,
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#3a3a3c',
  },
  presetCardActive: {
    borderColor: '#0a84ff',
    backgroundColor: '#1f2a38',
  },
  presetPreviewBox: {
    width: 42,
    height: 36,
  },
  presetCardText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  sizeSectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  dimensionBox: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 10,
    minWidth: 180,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  dimensionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dimensionTitle: {
    color: '#30d158',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepBtnGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  stepBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stepBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  aspectLockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    gap: 6,
  },
  aspectLockBtnActive: {
    backgroundColor: '#8B3A2B',
    borderColor: '#8B3A2B',
  },
  aspectLockText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  scrollContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlGroup: {
    gap: 6,
  },
  groupLabel: {
    color: '#8B3A2B',
    fontSize: 11,
    fontWeight: 'bold',
  },
  noneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    gap: 6,
  },
  noneBtnActive: {
    borderColor: '#8B3A2B',
    backgroundColor: '#3a1a1a',
  },
  noneBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDotActive: {
    borderWidth: 2.5,
    borderColor: '#30d158',
  },
  borderWidthRow: {
    marginBottom: 8,
    gap: 6,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  chipBtn: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipBtnActive: {
    backgroundColor: '#8B3A2B',
  },
  chipBtnText: {
    color: '#aaaaaa',
    fontSize: 10,
    fontWeight: 'bold',
  },
  chipBtnTextActive: {
    color: '#ffffff',
  },
  colorPaletteRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  toolBtnLocked: {
    backgroundColor: '#3a3a10',
    borderColor: '#ffcc00',
    borderWidth: 1,
  },
  toolBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  shapeTextInput: {
    backgroundColor: '#2c2c2e',
    color: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    minHeight: 50,
    maxHeight: 100,
    textAlign: 'right',
    writingDirection: 'rtl',
    borderWidth: 1,
    borderColor: '#3a3a3c',
    marginBottom: 8,
  },
  boldToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2c2c2e',
    borderWidth: 1,
    borderColor: '#3a3a3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boldToggleBtnActive: {
    backgroundColor: '#8B3A2B',
    borderColor: '#8B3A2B',
  },
  boldToggleText: {
    color: '#aaaaaa',
    fontSize: 15,
    fontWeight: 'bold',
  },
  boldToggleTextActive: {
    color: '#ffffff',
  },
});
