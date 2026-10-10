import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ToastAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PptSlider from './PptSlider';

// Theme Colors for Border/Outline Picker Grid (Matches PptShapeToolbar)
const COLOR_PALETTE = [
  '#ffffff', '#000000', '#1f497d', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646',
  '#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b0f0', '#0070c0', '#7030a0',
  '#ff3b30', '#ff9500', '#34c759', '#007aff', '#5856d6', '#af52de', '#8e8e93', '#3a3a3c',
];

export const PptImageToolbar = forwardRef(({
  selectedElement,
  onPickGallery,
  onPickCamera,
  onAddShape,
  onOpenShapePicker,
  onChangeElement,
  onDuplicateElement,
  onDeleteElement,
  onClose,
}, ref) => {
  const [activeSubTab, setActiveSubTab] = useState('insert'); // 'insert' | 'size' | 'style' | 'crop' | 'border' | 'tools'
  const [showShapesPanel, setShowShapesPanel] = useState(false);
  const [keepAspect, setKeepAspect] = useState(false);

  useEffect(() => {
    if (selectedElement) {
      const isAspectLocked = selectedElement.lockAspect ?? selectedElement.keepAspect ?? false;
      setKeepAspect(!!isAspectLocked);
    }
  }, [selectedElement?.id, selectedElement?.lockAspect, selectedElement?.keepAspect]);

  // Expose back navigation handlers via ref
  useImperativeHandle(ref, () => ({
    closeSubModal: () => {
      if (showShapesPanel) {
        setShowShapesPanel(false);
        return 'shapes panel';
      }
      return null;
    },
    closeTabPanel: () => {
      if (showShapesPanel) {
        setShowShapesPanel(false);
        return 'shapes panel';
      }
      if (activeSubTab !== 'insert') {
        setActiveSubTab('insert');
        return 'image toolbar tab (' + activeSubTab + ')';
      }
      return null;
    },
  }), [activeSubTab, showShapesPanel]);

  const isImageSelected = selectedElement && selectedElement.type === 'image';

  // Helper to update selected image element
  const updateImage = (patch) => {
    if (!selectedElement) return;
    onChangeElement({
      ...selectedElement,
      ...patch,
    });
  };

  const currentFit = selectedElement?.fit || 'fill';
  const currentOpacity = selectedElement?.opacity !== undefined ? selectedElement.opacity : 1.0;
  const currentRadius = selectedElement?.borderRadius || 0;
  const currentRotation = selectedElement?.rotation || 0;

  // Border & Outline
  const outline = selectedElement?.outline || selectedElement?.border || { color: '#ffffff', width: 0 };
  const currentBorderWidth = selectedElement?.border?.width !== undefined ? selectedElement.border.width : (outline?.width || 0);
  const currentBorderColor = selectedElement?.border?.color || outline?.color || '#ffffff';

  const currentCrop = selectedElement?.crop || { top: 0, bottom: 0, left: 0, right: 0 };
  const isLocked = !!selectedElement?.locked;

  const currentWidth = Math.round(selectedElement?.width || 50);
  const currentHeight = Math.round(selectedElement?.height || 30);
  const currentX = Math.round(selectedElement?.x || 25);
  const currentY = Math.round(selectedElement?.y || 35);

  // Toggle Aspect Ratio Lock
  const toggleAspectLock = () => {
    const nextVal = !keepAspect;
    setKeepAspect(nextVal);
    const aspect = (currentWidth && currentHeight && currentHeight > 0)
      ? (currentWidth / currentHeight)
      : (selectedElement?.aspectRatio || 1);
    updateImage({
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
      updateImage({
        width: clampedW,
        height: newH,
        lockAspect: true,
        keepAspect: true,
        aspectRatio: aspect,
      });
    } else {
      const newAspect = clampedW / Math.max(1, currentHeight);
      updateImage({
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
      updateImage({
        width: newW,
        height: clampedH,
        lockAspect: true,
        keepAspect: true,
        aspectRatio: aspect,
      });
    } else {
      const newAspect = Math.max(1, currentWidth) / clampedH;
      updateImage({
        height: clampedH,
        aspectRatio: newAspect,
        lockAspect: false,
        keepAspect: false,
      });
    }
  };

  const changeX = (newX) => {
    const clampedX = Math.max(0, Math.min(100 - currentWidth, Math.round(newX)));
    updateImage({ x: clampedX });
  };

  const changeY = (newY) => {
    const clampedY = Math.max(0, Math.min(100 - currentHeight, Math.round(newY)));
    updateImage({ y: clampedY });
  };

  // Fit/Fill Toggle
  const toggleFit = (mode) => {
    updateImage({ fit: mode });
  };

  // --- Opacity Change (10 - 100%) ---
  const changeOpacity = (val) => {
    const clamped = Math.max(0.1, Math.min(1.0, Math.round(val * 100) / 100));
    updateImage({ opacity: clamped });
  };

  // Border Radius Change (0 - 50%)
  const changeRadius = (rad) => {
    const clamped = Math.max(0, Math.min(50, rad));
    updateImage({ borderRadius: clamped });
  };

  // --- Rotation Change ---
  const addRotation = (deg) => {
    let newRot = (currentRotation + deg) % 360;
    if (newRot < 0) newRot += 360;
    updateImage({ rotation: newRot });
  };

  const setRotation = (deg) => {
    updateImage({ rotation: deg });
  };

  // --- Border & Outline Width / Color Handlers ---
  const setBorderWidth = (w) => {
    const clampedW = Math.max(0, Math.min(20, Math.round(w)));
    updateImage({
      border: {
        color: currentBorderColor,
        width: clampedW,
      },
      outline: {
        color: currentBorderColor,
        width: clampedW,
      },
    });
  };

  const setBorderColor = (colorHex) => {
    const w = currentBorderWidth > 0 ? currentBorderWidth : 2;
    updateImage({
      border: {
        color: colorHex,
        width: w,
      },
      outline: {
        color: colorHex,
        width: w,
      },
    });
  };

  // --- Crop Controls (0 - 45%) ---
  const handleCropChange = (side, newPctVal) => {
    const topPct = Math.round((currentCrop.top || 0) * 100);
    const bottomPct = Math.round((currentCrop.bottom || 0) * 100);
    const leftPct = Math.round((currentCrop.left || 0) * 100);
    const rightPct = Math.round((currentCrop.right || 0) * 100);

    let clampedPct = Math.max(0, Math.min(45, newPctVal));

    if (side === 'top') {
      const maxAllowed = Math.min(45, 90 - bottomPct);
      clampedPct = Math.max(0, Math.min(clampedPct, maxAllowed));
    } else if (side === 'bottom') {
      const maxAllowed = Math.min(45, 90 - topPct);
      clampedPct = Math.max(0, Math.min(clampedPct, maxAllowed));
    } else if (side === 'left') {
      const maxAllowed = Math.min(45, 90 - rightPct);
      clampedPct = Math.max(0, Math.min(clampedPct, maxAllowed));
    } else if (side === 'right') {
      const maxAllowed = Math.min(45, 90 - leftPct);
      clampedPct = Math.max(0, Math.min(clampedPct, maxAllowed));
    }

    const newCrop = {
      ...currentCrop,
      [side]: Math.round(clampedPct) / 100,
    };
    updateImage({ crop: newCrop });
  };

  const applyCropPreset = (pct) => {
    const fraction = pct / 100;
    updateImage({ crop: { top: fraction, bottom: fraction, left: fraction, right: fraction } });
  };

  const resetCrop = () => {
    updateImage({ crop: { top: 0, bottom: 0, left: 0, right: 0 } });
  };

  // Lock / Unlock
  const toggleLock = () => {
    const nextLock = !isLocked;
    updateImage({ locked: nextLock });
    if (Platform.OS === 'android') {
      ToastAndroid.show(
        nextLock ? 'وێنەکە قفڵکرا 🔒' : 'قفڵی وێنەکە کرایەوە 🔓',
        ToastAndroid.SHORT
      );
    }
  };

  return (
    <View style={styles.toolbarContainer}>
      {/* Top Header Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabHeaderRow}>
        <TouchableOpacity
          style={[styles.tabHeaderBtn, activeSubTab === 'insert' && styles.tabHeaderBtnActive]}
          onPress={() => setActiveSubTab('insert')}
        >
          <Ionicons name="add-circle-outline" size={15} color={activeSubTab === 'insert' ? '#ffffff' : '#aaaaaa'} />
          <Text style={[styles.tabHeaderBtnText, activeSubTab === 'insert' && styles.tabHeaderBtnTextActive]}>
            زیادکردن
          </Text>
        </TouchableOpacity>

        {isImageSelected && (
          <>
            <TouchableOpacity
              style={[styles.tabHeaderBtn, activeSubTab === 'size' && styles.tabHeaderBtnActive]}
              onPress={() => setActiveSubTab('size')}
            >
              <Ionicons name="resize-outline" size={15} color={activeSubTab === 'size' ? '#ffffff' : '#aaaaaa'} />
              <Text style={[styles.tabHeaderBtnText, activeSubTab === 'size' && styles.tabHeaderBtnTextActive]}>
                قەبارەی ستوونی و ئاسۆیی (Size)
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
              style={[styles.tabHeaderBtn, activeSubTab === 'crop' && styles.tabHeaderBtnActive]}
              onPress={() => setActiveSubTab('crop')}
            >
              <Ionicons name="crop-outline" size={15} color={activeSubTab === 'crop' ? '#ffffff' : '#aaaaaa'} />
              <Text style={[styles.tabHeaderBtnText, activeSubTab === 'crop' && styles.tabHeaderBtnTextActive]}>
                بڕین (Crop)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabHeaderBtn, activeSubTab === 'border' && styles.tabHeaderBtnActive]}
              onPress={() => setActiveSubTab('border')}
            >
              <Ionicons name="square-outline" size={15} color={activeSubTab === 'border' ? '#ffffff' : '#aaaaaa'} />
              <Text style={[styles.tabHeaderBtnText, activeSubTab === 'border' && styles.tabHeaderBtnTextActive]}>
                چوارچێوە (Outline)
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
          </>
        )}
      </ScrollView>

      {/* SUB-TAB 1: INSERT MODE ("زیادکردن") */}
      {activeSubTab === 'insert' && (
        <View style={styles.tabContentBox}>
          <Text style={styles.sectionTitle}>زیادکردنی وێنە و شێوەکان بۆ سڵاید:</Text>
          <View style={styles.insertButtonsRow}>
            <TouchableOpacity style={styles.insertActionBtn} onPress={onPickGallery}>
              <Ionicons name="images-outline" size={18} color="#ffffff" />
              <Text style={styles.insertActionBtnText}>گەلەری</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.insertActionBtn, { backgroundColor: '#1f497d' }]} onPress={onPickCamera}>
              <Ionicons name="camera-outline" size={18} color="#ffffff" />
              <Text style={styles.insertActionBtnText}>کامێرا</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.insertActionBtn,
                { backgroundColor: showShapesPanel ? '#8B3A2B' : '#2c2c2e', borderWidth: 1, borderColor: '#3a3a3c' },
              ]}
              onPress={() => setShowShapesPanel(!showShapesPanel)}
            >
              <Ionicons name="shapes-outline" size={18} color="#ffffff" />
              <Text style={styles.insertActionBtnText}>شێوەکان</Text>
            </TouchableOpacity>
          </View>

          {/* Small Panel for Shapes Options */}
          {showShapesPanel && (
            <View style={styles.shapesPanelBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.shapesPanelTitle}>شێوەیەک هەڵبژێرە:</Text>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a84ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}
                  onPress={() => {
                    setShowShapesPanel(false);
                    if (onOpenShapePicker) onOpenShapePicker();
                  }}
                >
                  <Ionicons name="grid-outline" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>لیستی گشتی...</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shapesRow}>
                <TouchableOpacity
                  style={[styles.shapeOptionBtn, { backgroundColor: '#0a84ff', borderWidth: 0 }]}
                  onPress={() => {
                    setShowShapesPanel(false);
                    if (onOpenShapePicker) onOpenShapePicker();
                  }}
                >
                  <Ionicons name="grid-outline" size={18} color="#ffffff" />
                  <Text style={[styles.shapeOptionText, { color: '#ffffff', fontWeight: 'bold' }]}>
                    هەموو شێوەکان
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shapeOptionBtn}
                  onPress={() => {
                    setShowShapesPanel(false);
                    if (onAddShape) onAddShape('rect');
                  }}
                >
                  <View style={styles.shapeIconRect} />
                  <Text style={styles.shapeOptionText}>چوارگۆشە</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shapeOptionBtn}
                  onPress={() => {
                    setShowShapesPanel(false);
                    if (onAddShape) onAddShape('roundRect');
                  }}
                >
                  <View style={styles.shapeIconRoundRect} />
                  <Text style={styles.shapeOptionText}>چوارگۆشەی خڕ</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shapeOptionBtn}
                  onPress={() => {
                    setShowShapesPanel(false);
                    if (onAddShape) onAddShape('ellipse');
                  }}
                >
                  <View style={styles.shapeIconEllipse} />
                  <Text style={styles.shapeOptionText}>بازنە</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shapeOptionBtn}
                  onPress={() => {
                    setShowShapesPanel(false);
                    if (onAddShape) onAddShape('line');
                  }}
                >
                  <View style={styles.shapeIconLine} />
                  <Text style={styles.shapeOptionText}>هێڵ</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shapeOptionBtn}
                  onPress={() => {
                    setShowShapesPanel(false);
                    if (onAddShape) onAddShape('arrow');
                  }}
                >
                  <View style={styles.shapeIconArrowRow}>
                    <View style={styles.shapeIconLinePart} />
                    <View style={styles.shapeIconArrowHead} />
                  </View>
                  <Text style={styles.shapeOptionText}>تیر</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shapeOptionBtn}
                  onPress={() => {
                    setShowShapesPanel(false);
                    if (onAddShape) onAddShape('star5');
                  }}
                >
                  <Ionicons name="star" size={18} color="#ffd60a" />
                  <Text style={styles.shapeOptionText}>ئەستێرە</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shapeOptionBtn}
                  onPress={() => {
                    setShowShapesPanel(false);
                    if (onAddShape) onAddShape('heart');
                  }}
                >
                  <Ionicons name="heart" size={18} color="#ff3b30" />
                  <Text style={styles.shapeOptionText}>دڵ</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* SUB-TAB 2: SIZE & DIMENSIONS ("قەبارەی ستوونی و ئاسۆیی") */}
      {isImageSelected && activeSubTab === 'size' && (
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

      {/* SUB-TAB 3: STYLE & OPACITY & ROTATION ("شێواز و ڕوونی") */}
      {isImageSelected && activeSubTab === 'style' && (
        <View style={styles.tabContentBox}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContentRow}>
            {/* 1. Fit / Fill Toggle */}
            <View style={styles.controlGroup}>
              <Text style={styles.groupLabel}>شێوازی پێشاندان:</Text>
              <View style={styles.togglePair}>
                <TouchableOpacity
                  style={[styles.toggleBtn, currentFit === 'fill' && styles.toggleBtnActive]}
                  onPress={() => toggleFit('fill')}
                >
                  <Text style={[styles.toggleBtnText, currentFit === 'fill' && styles.toggleBtnTextActive]}>
                    پڕکردنەوە (Fill)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleBtn, currentFit === 'fit' && styles.toggleBtnActive]}
                  onPress={() => toggleFit('fit')}
                >
                  <Text style={[styles.toggleBtnText, currentFit === 'fit' && styles.toggleBtnTextActive]}>
                    گۆنجاندن (Fit)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. Rounded Corners (0 - 50%) */}
            <PptSlider
              label="گۆشەی خڕ (Corners)"
              unit="%"
              min={0}
              max={50}
              step={1}
              value={currentRadius}
              onChange={changeRadius}
              style={{ width: 160 }}
            />

            {/* 3. Opacity (10 - 100%) */}
            <View style={styles.controlGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.groupLabel}>ڕوونی (Opacity): {Math.round(currentOpacity * 100)}%</Text>
                <View style={styles.stepBtnGroup}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => changeOpacity(currentOpacity - 0.05)}>
                    <Text style={styles.stepBtnText}>-5%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => changeOpacity(currentOpacity + 0.05)}>
                    <Text style={styles.stepBtnText}>+5%</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <PptSlider
                label="ڕوونی"
                unit="%"
                min={10}
                max={100}
                step={1}
                value={Math.round(currentOpacity * 100)}
                onChange={(val) => changeOpacity(val / 100)}
                style={{ width: 170 }}
              />
              <View style={styles.chipRow}>
                {[10, 25, 50, 75, 90, 100].map((opVal) => (
                  <TouchableOpacity
                    key={`opchip_${opVal}`}
                    style={[styles.chipBtn, Math.round(currentOpacity * 100) === opVal && styles.chipBtnActive]}
                    onPress={() => changeOpacity(opVal / 100)}
                  >
                    <Text style={[styles.chipBtnText, Math.round(currentOpacity * 100) === opVal && styles.chipBtnTextActive]}>{opVal}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 4. Rotation Controls */}
            <View style={styles.controlGroup}>
              <Text style={styles.groupLabel}>سوڕاندنەوە (Rotation): {currentRotation}°</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity style={styles.chipBtn} onPress={() => addRotation(-90)}>
                  <Text style={styles.chipBtnText}>↺ 90°</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.chipBtn} onPress={() => addRotation(90)}>
                  <Text style={styles.chipBtnText}>↻ 90°</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.chipBtn} onPress={() => addRotation(-15)}>
                  <Text style={styles.chipBtnText}>↺ 15°</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.chipBtn} onPress={() => addRotation(15)}>
                  <Text style={styles.chipBtnText}>↻ 15°</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.chipBtn, currentRotation === 0 && styles.chipBtnActive]} onPress={() => setRotation(0)}>
                  <Text style={[styles.chipBtnText, currentRotation === 0 && styles.chipBtnTextActive]}>0°</Text>
                </TouchableOpacity>
              </View>
              <PptSlider
                label="گۆشەی سوڕاندن"
                unit="°"
                min={0}
                max={360}
                step={1}
                value={currentRotation}
                onChange={setRotation}
                style={{ width: 160 }}
              />
            </View>

            {/* 5. Image Scale / Proportional Size Slider */}
            <PptSlider
              label="قەبارەی وێنە (Scale)"
              unit="%"
              min={10}
              max={100}
              step={1}
              value={Math.round(selectedElement?.width || 50)}
              onChange={(newWidth) => {
                const currentW = selectedElement?.width || 50;
                const currentH = selectedElement?.height || 30;
                const aspect = currentW / Math.max(1, currentH);
                const newH = Math.max(5, newWidth / aspect);
                updateImage({
                  width: newWidth,
                  height: Math.round(newH * 10) / 10,
                });
              }}
              style={{ width: 160 }}
            />
          </ScrollView>
        </View>
      )}

      {/* SUB-TAB 4: CROP ("بڕین") */}
      {isImageSelected && activeSubTab === 'crop' && (
        <View style={styles.tabContentBox}>
          <ScrollView
            showsHorizontalScrollIndicator={false}
            horizontal
            contentContainerStyle={styles.scrollContentRow}
          >
            {/* Reset & Crop Presets */}
            <View style={styles.controlGroup}>
              <Text style={styles.groupLabel}>بڕینی پێشوەختە:</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity style={styles.resetCropBtn} onPress={resetCrop}>
                  <Ionicons name="refresh-outline" size={14} color="#ffffff" />
                  <Text style={styles.resetCropText}>بێ بڕین (0%)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.chipBtn} onPress={() => applyCropPreset(5)}>
                  <Text style={styles.chipBtnText}>5% لایەکان</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.chipBtn} onPress={() => applyCropPreset(10)}>
                  <Text style={styles.chipBtnText}>10% لایەکان</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.chipBtn} onPress={() => applyCropPreset(20)}>
                  <Text style={styles.chipBtnText}>20% لایەکان</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Top Crop Slider */}
            <View style={styles.dimensionBox}>
              <View style={styles.dimensionHeader}>
                <Text style={styles.dimensionTitle}>سەرەوە (Top): {Math.round((currentCrop.top || 0) * 100)}%</Text>
                <View style={styles.stepBtnGroup}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => handleCropChange('top', Math.round((currentCrop.top || 0) * 100) - 1)}>
                    <Text style={styles.stepBtnText}>-1%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => handleCropChange('top', Math.round((currentCrop.top || 0) * 100) + 1)}>
                    <Text style={styles.stepBtnText}>+1%</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <PptSlider
                label="سەرەوە"
                unit="%"
                min={0}
                max={45}
                step={1}
                value={Math.round((currentCrop.top || 0) * 100)}
                onChange={(val) => handleCropChange('top', val)}
                style={{ width: 160 }}
              />
            </View>

            {/* Bottom Crop Slider */}
            <View style={styles.dimensionBox}>
              <View style={styles.dimensionHeader}>
                <Text style={styles.dimensionTitle}>خوارەوە (Bottom): {Math.round((currentCrop.bottom || 0) * 100)}%</Text>
                <View style={styles.stepBtnGroup}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => handleCropChange('bottom', Math.round((currentCrop.bottom || 0) * 100) - 1)}>
                    <Text style={styles.stepBtnText}>-1%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => handleCropChange('bottom', Math.round((currentCrop.bottom || 0) * 100) + 1)}>
                    <Text style={styles.stepBtnText}>+1%</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <PptSlider
                label="خوارەوە"
                unit="%"
                min={0}
                max={45}
                step={1}
                value={Math.round((currentCrop.bottom || 0) * 100)}
                onChange={(val) => handleCropChange('bottom', val)}
                style={{ width: 160 }}
              />
            </View>

            {/* Left Crop Slider */}
            <View style={styles.dimensionBox}>
              <View style={styles.dimensionHeader}>
                <Text style={styles.dimensionTitle}>چەپ (Left): {Math.round((currentCrop.left || 0) * 100)}%</Text>
                <View style={styles.stepBtnGroup}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => handleCropChange('left', Math.round((currentCrop.left || 0) * 100) - 1)}>
                    <Text style={styles.stepBtnText}>-1%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => handleCropChange('left', Math.round((currentCrop.left || 0) * 100) + 1)}>
                    <Text style={styles.stepBtnText}>+1%</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <PptSlider
                label="چەپ"
                unit="%"
                min={0}
                max={45}
                step={1}
                value={Math.round((currentCrop.left || 0) * 100)}
                onChange={(val) => handleCropChange('left', val)}
                style={{ width: 160 }}
              />
            </View>

            {/* Right Crop Slider */}
            <View style={styles.dimensionBox}>
              <View style={styles.dimensionHeader}>
                <Text style={styles.dimensionTitle}>ڕاست (Right): {Math.round((currentCrop.right || 0) * 100)}%</Text>
                <View style={styles.stepBtnGroup}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => handleCropChange('right', Math.round((currentCrop.right || 0) * 100) - 1)}>
                    <Text style={styles.stepBtnText}>-1%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => handleCropChange('right', Math.round((currentCrop.right || 0) * 100) + 1)}>
                    <Text style={styles.stepBtnText}>+1%</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <PptSlider
                label="ڕاست"
                unit="%"
                min={0}
                max={45}
                step={1}
                value={Math.round((currentCrop.right || 0) * 100)}
                onChange={(val) => handleCropChange('right', val)}
                style={{ width: 160 }}
              />
            </View>
          </ScrollView>
        </View>
      )}

      {/* SUB-TAB 5: BORDER / OUTLINE ("چوارچێوە") */}
      {isImageSelected && activeSubTab === 'border' && (
        <View style={styles.tabContentBox}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContentRow}>
            {/* Outline Width Slider & Presets */}
            <View style={styles.controlGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.groupLabel}>ئەستووریی چوارچێوە: {currentBorderWidth}px</Text>
                <View style={styles.stepBtnGroup}>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => setBorderWidth(currentBorderWidth - 1)}>
                    <Text style={styles.stepBtnText}>-1px</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.stepBtn} onPress={() => setBorderWidth(currentBorderWidth + 1)}>
                    <Text style={styles.stepBtnText}>+1px</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <PptSlider
                label="ئەستووری"
                unit="px"
                min={0}
                max={20}
                step={1}
                value={currentBorderWidth}
                onChange={setBorderWidth}
                style={{ width: 170 }}
              />

              <View style={styles.chipRow}>
                {[0, 1, 2, 4, 8, 12].map((wVal) => (
                  <TouchableOpacity
                    key={`bwchip_${wVal}`}
                    style={[styles.chipBtn, currentBorderWidth === wVal && styles.chipBtnActive]}
                    onPress={() => setBorderWidth(wVal)}
                  >
                    <Text style={[styles.chipBtnText, currentBorderWidth === wVal && styles.chipBtnTextActive]}>
                      {wVal === 0 ? '🚫 بێ چوارچێوە' : `${wVal}px`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Outline Color Palette Grid */}
            {currentBorderWidth > 0 && (
              <View style={styles.controlGroup}>
                <Text style={styles.groupLabel}>ڕەنگی چوارچێوە:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorPaletteRow}>
                  {COLOR_PALETTE.map((hex) => (
                    <TouchableOpacity
                      key={`oclr_${hex}`}
                      style={[
                        styles.colorDot,
                        { backgroundColor: hex },
                        currentBorderColor.toLowerCase() === hex.toLowerCase() && styles.colorDotActive,
                      ]}
                      onPress={() => setBorderColor(hex)}
                    >
                      {currentBorderColor.toLowerCase() === hex.toLowerCase() && (
                        <Text style={{ color: hex === '#ffffff' || hex === '#ffff00' ? '#000' : '#fff', fontSize: 10, fontWeight: 'bold' }}>
                          ✓
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* SUB-TAB 6: TOOLS ("ئامرازەکان") */}
      {isImageSelected && activeSubTab === 'tools' && (
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
                updateImage({ zIndex: (selectedElement.zIndex || 1) + 1 });
              }}
            >
              <Ionicons name="arrow-up-circle-outline" size={16} color="#ffffff" />
              <Text style={styles.toolBtnText}>پێشەوە</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => {
                updateImage({ zIndex: Math.max(1, (selectedElement.zIndex || 1) - 1) });
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
  sectionTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'right',
  },
  insertButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  insertActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B3A2B',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  insertActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  scrollContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  controlGroup: {
    gap: 6,
  },
  groupLabel: {
    color: '#8B3A2B',
    fontSize: 11,
    fontWeight: 'bold',
  },
  togglePair: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#8B3A2B',
  },
  toggleBtnText: {
    color: '#aaaaaa',
    fontSize: 11,
    fontWeight: 'bold',
  },
  toggleBtnTextActive: {
    color: '#ffffff',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  chipBtn: {
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  chipBtnActive: {
    backgroundColor: '#8B3A2B',
    borderColor: '#8B3A2B',
  },
  chipBtnText: {
    color: '#aaaaaa',
    fontSize: 11,
    fontWeight: 'bold',
  },
  chipBtnTextActive: {
    color: '#ffffff',
  },
  cropVerticalContainer: {
    paddingVertical: 4,
    gap: 8,
  },
  cropHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 4,
  },
  cropSlidersList: {
    gap: 6,
  },
  resetCropBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  resetCropText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  borderWidthRow: {
    marginBottom: 8,
    gap: 6,
  },
  colorPaletteRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDotActive: {
    borderWidth: 2.5,
    borderColor: '#30d158',
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
  shapesPanelBox: {
    marginTop: 10,
    backgroundColor: '#141416',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  shapesPanelTitle: {
    color: '#8B3A2B',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'right',
  },
  shapesRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  shapeOptionBtn: {
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    minWidth: 70,
  },
  shapeOptionText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
  },
  shapeIconRect: {
    width: 20,
    height: 14,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    backgroundColor: '#1f497d',
  },
  shapeIconRoundRect: {
    width: 20,
    height: 14,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 4,
    backgroundColor: '#1f497d',
  },
  shapeIconEllipse: {
    width: 20,
    height: 14,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 10,
    backgroundColor: '#1f497d',
  },
  shapeIconLine: {
    width: 20,
    height: 2,
    backgroundColor: '#ffffff',
    marginVertical: 6,
  },
  shapeIconArrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 22,
    height: 14,
  },
  shapeIconLinePart: {
    flex: 1,
    height: 2,
    backgroundColor: '#ffffff',
  },
  shapeIconArrowHead: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#ffffff',
  },
});
