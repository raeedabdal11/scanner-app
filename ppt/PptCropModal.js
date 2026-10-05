import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PRESETS = [
  { id: 'free', label: 'ئازاد', ratio: null },
  { id: '1:1', label: '١:١', ratio: 1.0 },
  { id: '4:3', label: '٤:٣', ratio: 4 / 3 },
  { id: '16:9', label: '١٦:٩', ratio: 16 / 9 },
  { id: '3:4', label: '٣:٤', ratio: 3 / 4 },
];

export const PptCropModal = ({
  visible,
  imageUri,
  initialCrop,
  onApply,
  onCancel,
}) => {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [activePreset, setActivePreset] = useState('free');
  const [cropRect, setCropRect] = useState(null); // { x, y, w, h }

  const activeRatioRef = useRef(null);
  const cropRectRef = useRef(null);
  const imgBoundsRef = useRef({ imgX: 0, imgY: 0, imgW: 0, imgH: 0 });
  const dragRef = useRef({ startX: 0, startY: 0, startCrop: null });

  // Update cropRectRef whenever cropRect changes
  useEffect(() => {
    cropRectRef.current = cropRect;
  }, [cropRect]);

  // Load natural image dimensions when imageUri changes or modal opens
  useEffect(() => {
    if (visible && imageUri) {
      Image.getSize(
        imageUri,
        (w, h) => {
          setImageSize({ width: w, height: h });
        },
        (err) => {
          console.warn('Failed to get image size:', err);
          setImageSize({ width: 800, height: 600 });
        }
      );
    }
  }, [visible, imageUri]);

  // Compute image display bounds inside container
  const imgBounds = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0 || imageSize.width === 0 || imageSize.height === 0) {
      return null;
    }
    const containerW = containerSize.width;
    const containerH = containerSize.height;
    const imgAspect = imageSize.width / imageSize.height;
    const containerAspect = containerW / containerH;

    let imgW, imgH, imgX, imgY;
    if (imgAspect > containerAspect) {
      imgW = containerW;
      imgH = containerW / imgAspect;
      imgX = 0;
      imgY = (containerH - imgH) / 2;
    } else {
      imgH = containerH;
      imgW = containerH * imgAspect;
      imgX = (containerW - imgW) / 2;
      imgY = 0;
    }

    return { imgX, imgY, imgW, imgH };
  }, [containerSize, imageSize]);

  // Keep imgBoundsRef updated
  useEffect(() => {
    if (imgBounds) {
      imgBoundsRef.current = imgBounds;
    }
  }, [imgBounds]);

  // Initialize cropRect when imgBounds is ready or visible changes
  useEffect(() => {
    if (visible && imgBounds) {
      const { imgX, imgY, imgW, imgH } = imgBounds;
      const crop = initialCrop || { left: 0, top: 0, right: 0, bottom: 0 };
      const left = crop.left || 0;
      const top = crop.top || 0;
      const right = crop.right || 0;
      const bottom = crop.bottom || 0;

      const initX = imgX + left * imgW;
      const initY = imgY + top * imgH;
      const initW = Math.max(0.1 * imgW, imgW * (1 - left - right));
      const initH = Math.max(0.1 * imgH, imgH * (1 - top - bottom));

      const initialRect = { x: initX, y: initY, w: initW, h: initH };
      setCropRect(initialRect);
      cropRectRef.current = initialRect;
      setActivePreset('free');
      activeRatioRef.current = null;
    }
  }, [visible, imgBounds]);

  // Handle Preset Selection
  const handleSelectPreset = (preset) => {
    setActivePreset(preset.id);
    activeRatioRef.current = preset.ratio;

    if (!imgBoundsRef.current || !cropRectRef.current) return;
    const { imgX, imgY, imgW, imgH } = imgBoundsRef.current;
    const currentCrop = cropRectRef.current;

    if (preset.ratio === null) {
      return; // Free mode, leave current rectangle as is
    }

    const r = preset.ratio;
    const minW = 0.1 * imgW;
    const minH = 0.1 * imgH;

    const cX = currentCrop.x + currentCrop.w / 2;
    const cY = currentCrop.y + currentCrop.h / 2;

    let targetW, targetH;
    if (currentCrop.w / currentCrop.h > r) {
      targetH = currentCrop.h;
      targetW = currentCrop.h * r;
    } else {
      targetW = currentCrop.w;
      targetH = currentCrop.w / r;
    }

    if (targetW > imgW) {
      targetW = imgW;
      targetH = imgW / r;
    }
    if (targetH > imgH) {
      targetH = imgH;
      targetW = imgH * r;
    }

    if (targetW < minW) {
      targetW = minW;
      targetH = minW / r;
    }
    if (targetH < minH) {
      targetH = minH;
      targetW = minH * r;
    }

    let newX = cX - targetW / 2;
    let newY = cY - targetH / 2;

    newX = Math.max(imgX, Math.min(imgX + imgW - targetW, newX));
    newY = Math.max(imgY, Math.min(imgY + imgH - targetH, newY));

    const newRect = { x: newX, y: newY, w: targetW, h: targetH };
    setCropRect(newRect);
    cropRectRef.current = newRect;
  };

  // Reset Crop to Full Image
  const handleResetCrop = () => {
    if (!imgBoundsRef.current) return;
    const { imgX, imgY, imgW, imgH } = imgBoundsRef.current;
    const fullRect = { x: imgX, y: imgY, w: imgW, h: imgH };
    setCropRect(fullRect);
    cropRectRef.current = fullRect;
    setActivePreset('free');
    activeRatioRef.current = null;
  };

  // Apply Crop
  const handleApply = () => {
    if (!imgBoundsRef.current || !cropRectRef.current) {
      onCancel();
      return;
    }
    const { imgX, imgY, imgW, imgH } = imgBoundsRef.current;
    const { x, y, w, h } = cropRectRef.current;

    let left = (x - imgX) / imgW;
    let top = (y - imgY) / imgH;
    let right = (imgX + imgW - (x + w)) / imgW;
    let bottom = (imgY + imgH - (y + h)) / imgH;

    left = Math.max(0, Math.min(0.9, Math.round(left * 10000) / 10000));
    top = Math.max(0, Math.min(0.9, Math.round(top * 10000) / 10000));
    right = Math.max(0, Math.min(0.9 - left, Math.round(right * 10000) / 10000));
    bottom = Math.max(0, Math.min(0.9 - top, Math.round(bottom * 10000) / 10000));

    onApply({ left, top, right, bottom });
  };

  // Helper to compute new crop rectangle for any handle drag
  const computeHandleDrag = (handleKey, dx, dy) => {
    if (!imgBoundsRef.current || !dragRef.current.startCrop) return null;
    const { imgX, imgY, imgW, imgH } = imgBoundsRef.current;
    const start = dragRef.current.startCrop;
    const minW = 0.1 * imgW;
    const minH = 0.1 * imgH;
    const r = activeRatioRef.current;

    let newX = start.x;
    let newY = start.y;
    let newW = start.w;
    let newH = start.h;

    if (handleKey === 'BODY') {
      newX = Math.max(imgX, Math.min(imgX + imgW - start.w, start.x + dx));
      newY = Math.max(imgY, Math.min(imgY + imgH - start.h, start.y + dy));
      return { x: newX, y: newY, w: start.w, h: start.h };
    }

    if (!r) {
      // FREE DRAG (no fixed aspect ratio)
      switch (handleKey) {
        case 'BR': {
          newW = Math.max(minW, Math.min(imgX + imgW - start.x, start.w + dx));
          newH = Math.max(minH, Math.min(imgY + imgH - start.y, start.h + dy));
          break;
        }
        case 'TL': {
          const pX = Math.max(imgX, Math.min(start.x + start.w - minW, start.x + dx));
          newW = start.w + (start.x - pX);
          newX = pX;
          const pY = Math.max(imgY, Math.min(start.y + start.h - minH, start.y + dy));
          newH = start.h + (start.y - pY);
          newY = pY;
          break;
        }
        case 'TR': {
          const pY = Math.max(imgY, Math.min(start.y + start.h - minH, start.y + dy));
          newH = start.h + (start.y - pY);
          newY = pY;
          newW = Math.max(minW, Math.min(imgX + imgW - start.x, start.w + dx));
          break;
        }
        case 'BL': {
          const pX = Math.max(imgX, Math.min(start.x + start.w - minW, start.x + dx));
          newW = start.w + (start.x - pX);
          newX = pX;
          newH = Math.max(minH, Math.min(imgY + imgH - start.y, start.h + dy));
          break;
        }
        case 'R': {
          newW = Math.max(minW, Math.min(imgX + imgW - start.x, start.w + dx));
          break;
        }
        case 'L': {
          const pX = Math.max(imgX, Math.min(start.x + start.w - minW, start.x + dx));
          newW = start.w + (start.x - pX);
          newX = pX;
          break;
        }
        case 'B': {
          newH = Math.max(minH, Math.min(imgY + imgH - start.y, start.h + dy));
          break;
        }
        case 'T': {
          const pY = Math.max(imgY, Math.min(start.y + start.h - minH, start.y + dy));
          newH = start.h + (start.y - pY);
          newY = pY;
          break;
        }
      }
    } else {
      // LOCKED ASPECT RATIO
      switch (handleKey) {
        case 'BR': {
          let pW = start.w + dx;
          const maxW = Math.min(imgX + imgW - start.x, (imgY + imgH - start.y) * r);
          pW = Math.max(minW, Math.max(minH * r, Math.min(maxW, pW)));
          newW = pW;
          newH = pW / r;
          newX = start.x;
          newY = start.y;
          break;
        }
        case 'TL': {
          let pW = start.w - dx;
          const maxW = Math.min(start.x + start.w - imgX, (start.y + start.h - imgY) * r);
          pW = Math.max(minW, Math.max(minH * r, Math.min(maxW, pW)));
          newW = pW;
          newH = pW / r;
          newX = start.x + start.w - newW;
          newY = start.y + start.h - newH;
          break;
        }
        case 'TR': {
          let pW = start.w + dx;
          const maxW = Math.min(imgX + imgW - start.x, (start.y + start.h - imgY) * r);
          pW = Math.max(minW, Math.max(minH * r, Math.min(maxW, pW)));
          newW = pW;
          newH = pW / r;
          newX = start.x;
          newY = start.y + start.h - newH;
          break;
        }
        case 'BL': {
          let pW = start.w - dx;
          const maxW = Math.min(start.x + start.w - imgX, (imgY + imgH - start.y) * r);
          pW = Math.max(minW, Math.max(minH * r, Math.min(maxW, pW)));
          newW = pW;
          newH = pW / r;
          newX = start.x + start.w - newW;
          newY = start.y;
          break;
        }
        case 'R': {
          let pW = start.w + dx;
          const maxH = 2 * Math.min((start.y + start.h / 2) - imgY, (imgY + imgH) - (start.y + start.h / 2));
          const maxW = Math.min(imgX + imgW - start.x, maxH * r);
          pW = Math.max(minW, Math.max(minH * r, Math.min(maxW, pW)));
          newW = pW;
          newH = pW / r;
          newX = start.x;
          newY = (start.y + start.h / 2) - newH / 2;
          break;
        }
        case 'L': {
          let pW = start.w - dx;
          const maxH = 2 * Math.min((start.y + start.h / 2) - imgY, (imgY + imgH) - (start.y + start.h / 2));
          const maxW = Math.min(start.x + start.w - imgX, maxH * r);
          pW = Math.max(minW, Math.max(minH * r, Math.min(maxW, pW)));
          newW = pW;
          newH = pW / r;
          newX = start.x + start.w - newW;
          newY = (start.y + start.h / 2) - newH / 2;
          break;
        }
        case 'B': {
          let pH = start.h + dy;
          const maxW = 2 * Math.min((start.x + start.w / 2) - imgX, (imgX + imgW) - (start.x + start.w / 2));
          const maxH = Math.min(imgY + imgH - start.y, maxW / r);
          pH = Math.max(minH, Math.max(minW / r, Math.min(maxH, pH)));
          newH = pH;
          newW = pH * r;
          newY = start.y;
          newX = (start.x + start.w / 2) - newW / 2;
          break;
        }
        case 'T': {
          let pH = start.h - dy;
          const maxW = 2 * Math.min((start.x + start.w / 2) - imgX, (imgX + imgW) - (start.x + start.w / 2));
          const maxH = Math.min(start.y + start.h - imgY, maxW / r);
          pH = Math.max(minH, Math.max(minW / r, Math.min(maxH, pH)));
          newH = pH;
          newW = pH * r;
          newY = start.y + start.h - newH;
          newX = (start.x + start.w / 2) - newW / 2;
          break;
        }
      }
    }

    return { x: newX, y: newY, w: newW, h: newH };
  };

  // Factory to create PanResponders for each handle
  const createPanResponder = (handleKey) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (!cropRectRef.current) return;
        dragRef.current = {
          startX: evt.nativeEvent.pageX,
          startY: evt.nativeEvent.pageY,
          startCrop: { ...cropRectRef.current },
        };
      },
      onPanResponderMove: (evt) => {
        if (!dragRef.current.startCrop) return;
        const dx = evt.nativeEvent.pageX - dragRef.current.startX;
        const dy = evt.nativeEvent.pageY - dragRef.current.startY;
        const updated = computeHandleDrag(handleKey, dx, dy);
        if (updated) {
          cropRectRef.current = updated;
          setCropRect(updated);
        }
      },
      onPanResponderRelease: () => {
        dragRef.current = { startX: 0, startY: 0, startCrop: null };
      },
      onPanResponderTerminate: () => {
        dragRef.current = { startX: 0, startY: 0, startCrop: null };
      },
    });
  };

  // Memoize PanResponders for the 9 keys
  const responders = useMemo(() => {
    const keys = ['TL', 'TR', 'BL', 'BR', 'T', 'B', 'L', 'R', 'BODY'];
    const map = {};
    keys.forEach((k) => {
      map[k] = createPanResponder(k);
    });
    return map;
  }, []);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onCancel}
      statusBarTranslucent={true}
    >
      <SafeAreaView style={styles.modalSafeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />

        {/* Top Navigation Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.headerBtn} onPress={onCancel}>
            <Ionicons name="close" size={22} color="#ffffff" />
            <Text style={styles.headerBtnTextCancel}>هەڵوەشاندنەوە</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>بڕینی وێنە</Text>

          <TouchableOpacity style={[styles.headerBtn, styles.headerBtnApply]} onPress={handleApply}>
            <Ionicons name="checkmark" size={20} color="#ffffff" />
            <Text style={styles.headerBtnTextApply}>پەسەندکردن</Text>
          </TouchableOpacity>
        </View>

        {/* Main Workspace Area */}
        <View
          style={styles.workspace}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setContainerSize({ width, height });
          }}
        >
          {(!imgBounds || !cropRect) ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B3A2B" />
              <Text style={styles.loadingText}>چاوەڕێ بە...</Text>
            </View>
          ) : (
            <View style={styles.imageContainer}>
              {/* Full Original Image */}
              <Image
                source={{ uri: imageUri }}
                style={{
                  position: 'absolute',
                  left: imgBounds.imgX,
                  top: imgBounds.imgY,
                  width: imgBounds.imgW,
                  height: imgBounds.imgH,
                }}
                resizeMode="stretch"
              />

              {/* Darkened Overlays Outside Crop Rectangle */}
              {/* Top Overlay */}
              <View
                style={[
                  styles.overlay,
                  {
                    left: 0,
                    top: 0,
                    right: 0,
                    height: Math.max(0, cropRect.y),
                  },
                ]}
                pointerEvents="none"
              />
              {/* Bottom Overlay */}
              <View
                style={[
                  styles.overlay,
                  {
                    left: 0,
                    top: cropRect.y + cropRect.h,
                    right: 0,
                    bottom: 0,
                  },
                ]}
                pointerEvents="none"
              />
              {/* Left Overlay */}
              <View
                style={[
                  styles.overlay,
                  {
                    left: 0,
                    top: cropRect.y,
                    width: Math.max(0, cropRect.x),
                    height: cropRect.h,
                  },
                ]}
                pointerEvents="none"
              />
              {/* Right Overlay */}
              <View
                style={[
                  styles.overlay,
                  {
                    left: cropRect.x + cropRect.w,
                    top: cropRect.y,
                    right: 0,
                    height: cropRect.h,
                  },
                ]}
                pointerEvents="none"
              />

              {/* Draggable Body inside Crop Rectangle */}
              <View
                style={{
                  position: 'absolute',
                  left: cropRect.x,
                  top: cropRect.y,
                  width: cropRect.w,
                  height: cropRect.h,
                  borderWidth: 1.5,
                  borderColor: '#ffffff',
                }}
                {...responders.BODY.panHandlers}
              >
                {/* Rule of Thirds Grid Lines */}
                <View style={[styles.gridLineV, { left: '33.33%' }]} pointerEvents="none" />
                <View style={[styles.gridLineV, { left: '66.66%' }]} pointerEvents="none" />
                <View style={[styles.gridLineH, { top: '33.33%' }]} pointerEvents="none" />
                <View style={[styles.gridLineH, { top: '66.66%' }]} pointerEvents="none" />
              </View>

              {/* 8 Draggable Handles with >= 44x44 Touch Target */}

              {/* Top-Left Corner (TL) */}
              <View
                style={[styles.touchHandle, { left: cropRect.x - 22, top: cropRect.y - 22 }]}
                {...responders.TL.panHandlers}
              >
                <View style={styles.cornerHandleTL} />
              </View>

              {/* Top-Right Corner (TR) */}
              <View
                style={[styles.touchHandle, { left: cropRect.x + cropRect.w - 22, top: cropRect.y - 22 }]}
                {...responders.TR.panHandlers}
              >
                <View style={styles.cornerHandleTR} />
              </View>

              {/* Bottom-Left Corner (BL) */}
              <View
                style={[styles.touchHandle, { left: cropRect.x - 22, top: cropRect.y + cropRect.h - 22 }]}
                {...responders.BL.panHandlers}
              >
                <View style={styles.cornerHandleBL} />
              </View>

              {/* Bottom-Right Corner (BR) */}
              <View
                style={[styles.touchHandle, { left: cropRect.x + cropRect.w - 22, top: cropRect.y + cropRect.h - 22 }]}
                {...responders.BR.panHandlers}
              >
                <View style={styles.cornerHandleBR} />
              </View>

              {/* Top Midpoint (T) */}
              <View
                style={[styles.touchHandle, { left: cropRect.x + cropRect.w / 2 - 22, top: cropRect.y - 22 }]}
                {...responders.T.panHandlers}
              >
                <View style={styles.edgeHandleH} />
              </View>

              {/* Bottom Midpoint (B) */}
              <View
                style={[styles.touchHandle, { left: cropRect.x + cropRect.w / 2 - 22, top: cropRect.y + cropRect.h - 22 }]}
                {...responders.B.panHandlers}
              >
                <View style={styles.edgeHandleH} />
              </View>

              {/* Left Midpoint (L) */}
              <View
                style={[styles.touchHandle, { left: cropRect.x - 22, top: cropRect.y + cropRect.h / 2 - 22 }]}
                {...responders.L.panHandlers}
              >
                <View style={styles.edgeHandleV} />
              </View>

              {/* Right Midpoint (R) */}
              <View
                style={[styles.touchHandle, { left: cropRect.x + cropRect.w - 22, top: cropRect.y + cropRect.h / 2 - 22 }]}
                {...responders.R.panHandlers}
              >
                <View style={styles.edgeHandleV} />
              </View>
            </View>
          )}
        </View>

        {/* Bottom Control Toolbar */}
        <View style={styles.bottomToolbar}>
          {/* Preset Aspect Ratios Row */}
          <View style={styles.presetsRow}>
            {PRESETS.map((p) => {
              const isActive = activePreset === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.presetBtn, isActive && styles.presetBtnActive]}
                  onPress={() => handleSelectPreset(p)}
                >
                  <Text style={[styles.presetBtnText, isActive && styles.presetBtnTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Reset Button Row */}
          <View style={styles.bottomActionsRow}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleResetCrop}>
              <Ionicons name="refresh-outline" size={16} color="#ffffff" />
              <Text style={styles.resetBtnText}>بێ برین (Reset)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  topHeader: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#1c1c1e',
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e',
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  headerBtnApply: {
    backgroundColor: '#8B3A2B',
  },
  headerBtnTextCancel: {
    color: '#ff453a',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerBtnTextApply: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  workspace: {
    flex: 1,
    backgroundColor: '#0a0a0c',
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#aaaaaa',
    fontSize: 13,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  touchHandle: {
    position: 'absolute',
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cornerHandleTL: {
    width: 18,
    height: 18,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderColor: '#ffffff',
  },
  cornerHandleTR: {
    width: 18,
    height: 18,
    borderRightWidth: 3,
    borderTopWidth: 3,
    borderColor: '#ffffff',
  },
  cornerHandleBL: {
    width: 18,
    height: 18,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#ffffff',
  },
  cornerHandleBR: {
    width: 18,
    height: 18,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#ffffff',
  },
  edgeHandleH: {
    width: 24,
    height: 5,
    backgroundColor: '#ffffff',
    borderRadius: 2.5,
  },
  edgeHandleV: {
    width: 5,
    height: 24,
    backgroundColor: '#ffffff',
    borderRadius: 2.5,
  },
  bottomToolbar: {
    backgroundColor: '#1c1c1e',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#2c2c2e',
    gap: 12,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  presetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2c2c2e',
    borderWidth: 1,
    borderColor: '#3a3a3c',
    minWidth: 50,
    alignItems: 'center',
  },
  presetBtnActive: {
    backgroundColor: '#8B3A2B',
    borderColor: '#8B3A2B',
  },
  presetBtnText: {
    color: '#aaaaaa',
    fontSize: 13,
    fontWeight: 'bold',
  },
  presetBtnTextActive: {
    color: '#ffffff',
  },
  bottomActionsRow: {
    alignItems: 'center',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  resetBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
