import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
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
  const [activeSubTab, setActiveSubTab] = useState('fill'); // 'fill' | 'text' | 'outline' | 'style' | 'tools'
  const textInputRef = useRef(null);

  // Expose back navigation and openTextTabAndFocus handlers via ref
  useImperativeHandle(ref, () => ({
    closeSubModal: () => null,
    closeTabPanel: () => {
      if (activeSubTab !== 'fill') {
        setActiveSubTab('fill');
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

  const currentFill = selectedElement.fill || 'none';
  const currentOpacity = selectedElement.opacity !== undefined ? selectedElement.opacity : 1.0;
  const currentRotation = selectedElement.rotation || 0;
  const currentCornerRadius = selectedElement.cornerRadius !== undefined ? selectedElement.cornerRadius : 20;

  const outline = selectedElement.outline || { color: '#000000', width: 2 };
  const currentOutlineColor = outline.color || '#000000';
  const currentOutlineWidth = outline.width !== undefined ? outline.width : 2;

  const isLocked = !!selectedElement.locked;

  // Fill Color Setter
  const setFillColor = (hex) => {
    updateShape({ fill: hex });
  };

  // Outline Color & Width
  const setOutlineColor = (hex) => {
    updateShape({
      outline: {
        color: hex,
        width: currentOutlineWidth > 0 ? currentOutlineWidth : 2,
      },
    });
  };

  const setOutlineWidth = (w) => {
    console.log('[PptShapeToolbar] setOutlineWidth rawWidth=', w, 'currentElement.outline=', selectedElement?.outline);
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
    console.log('[PptShapeToolbar] changeOpacity rawVal=', val, 'clampedOpacity=', clamped, 'currentElement.opacity=', selectedElement?.opacity);
    updateShape({ opacity: clamped });
  };

  // Corner Roundness Change (0 - 50%)
  const changeCornerRadius = (rad) => {
    const clamped = Math.max(0, Math.min(50, rad));
    console.log('[PptShapeToolbar] changeCornerRadius rawRad=', rad, 'clampedRadius=', clamped, 'currentElement.cornerRadius=', selectedElement?.cornerRadius);
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

  return (
    <View style={styles.toolbarContainer}>
      {/* Top Header Tabs */}
      <View style={styles.tabHeaderRow}>
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
          style={[styles.tabHeaderBtn, { backgroundColor: '#0a84ff', paddingHorizontal: 8 }]}
          onPress={() => {
            if (onOpenShapePicker) onOpenShapePicker('change');
          }}
        >
          <Ionicons name="shapes-outline" size={15} color="#ffffff" />
          <Text style={[styles.tabHeaderBtnText, { color: '#ffffff', fontWeight: 'bold' }]}>
            گۆڕینی شێوە
          </Text>
        </TouchableOpacity>
      </View>

      {/* SUB-TAB 1: FILL COLOR ("ڕەنگ") */}
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

      {/* SUB-TAB 2: SHAPE TEXT ("نووسین") */}
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

      {/* SUB-TAB 2: OUTLINE COLOR & WIDTH ("چوارچێوە") */}
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

      {/* SUB-TAB 3: STYLE, CORNER ROUNDNESS, OPACITY & ROTATION ("شێواز و ڕوونی") */}
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

            {/* 3. Shape Scale / Size Slider (10 - 100%) */}
            <PptSlider
              label="قەبارەی شێوە (Scale)"
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
                console.log('[PptShapeToolbar] Shape Scale slider val=', newWidth, 'newWidth=', newWidth, 'newH=', newH, 'currentElement.width=', selectedElement?.width);
                updateShape({
                  width: newWidth,
                  height: Math.round(newH * 10) / 10,
                });
              }}
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

      {/* SUB-TAB 4: TOOLS ("ئامرازەکان") */}
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
    gap: 6,
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
