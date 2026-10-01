import React from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  PanResponder,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const PptCanvas = ({
  slide,
  aspectRatio = '16:9',
  selectedElementId,
  editingElementId,
  onSelectElement,
  onStartInlineEditing,
  onEndInlineEditing,
  onChangeElement,
  onDuplicateElement,
  onDeleteElement,
  onChangeImageElement,
  fontFamily,
}) => {
  const is43 = aspectRatio === '4:3';
  const canvasWidth = SCREEN_WIDTH - 24;
  const canvasHeight = is43 ? (canvasWidth * 3) / 4 : (canvasWidth * 9) / 16;

  // Move Element Drag & Tap Handler
  const createPanResponder = (element) => {
    let initialX = element.x;
    let initialY = element.y;
    let isDragging = false;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: () => {
        onSelectElement(element.id);
        initialX = element.x;
        initialY = element.y;
        isDragging = false;
      },
      onPanResponderMove: (evt, gestureState) => {
        const dist = Math.hypot(gestureState.dx, gestureState.dy);
        if (dist > 8) {
          isDragging = true;
          const deltaXPercent = (gestureState.dx / canvasWidth) * 100;
          const deltaYPercent = (gestureState.dy / canvasHeight) * 100;

          const newX = Math.max(0, Math.min(100 - element.width, initialX + deltaXPercent));
          const newY = Math.max(0, Math.min(100 - element.height, initialY + deltaYPercent));

          onChangeElement({
            ...element,
            x: Math.round(newX * 10) / 10,
            y: Math.round(newY * 10) / 10,
          });
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const dist = Math.hypot(gestureState.dx, gestureState.dy);
        if (!isDragging && dist <= 8) {
          // Finger moved <= 8px -> TAP! Start inline editing
          onSelectElement(element.id);
          if (element.type === 'text') {
            onStartInlineEditing(element.id);
          }
        }
      },
    });
  };

  // Resize Element Drag Handler
  const createResizePanResponder = (element) => {
    let initialW = element.width;
    let initialH = element.height;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const deltaWPercent = (gestureState.dx / canvasWidth) * 100;
        const deltaHPercent = (gestureState.dy / canvasHeight) * 100;

        const newW = Math.max(10, Math.min(100 - element.x, initialW + deltaWPercent));
        const newH = Math.max(10, Math.min(100 - element.y, initialH + deltaHPercent));

        onChangeElement({
          ...element,
          width: Math.round(newW * 10) / 10,
          height: Math.round(newH * 10) / 10,
        });
      },
    });
  };

  if (!slide) {
    return (
      <View style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}>
        <Text style={{ color: '#888' }}>هیچ سڵایدێک دیاری نەکراوە</Text>
      </View>
    );
  }

  const elements = slide.elements || [];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={1}
        style={[
          styles.canvas,
          { width: canvasWidth, height: canvasHeight, backgroundColor: slide.background || '#ffffff' },
        ]}
        onPress={() => {
          onSelectElement(null);
          if (onEndInlineEditing) onEndInlineEditing();
        }}
      >
        {elements.map((elem) => {
          const isSelected = selectedElementId === elem.id;
          const isEditing = editingElementId === elem.id;
          const left = (elem.x / 100) * canvasWidth;
          const top = (elem.y / 100) * canvasHeight;
          const elemWidth = (elem.width / 100) * canvasWidth;
          const elemHeight = (elem.height / 100) * canvasHeight;

          const dragResponder = createPanResponder(elem);
          const resizeResponder = createResizePanResponder(elem);

          const scaledFontSize = (elem.fontSize || 18) * (canvasWidth / 360);

          return (
            <View
              key={elem.id}
              style={[
                styles.elementWrapper,
                {
                  left,
                  top,
                  width: elemWidth,
                  minHeight: elemHeight,
                  zIndex: elem.zIndex || 1,
                },
                isSelected && styles.selectedWrapper,
              ]}
              {...(isEditing ? {} : dragResponder.panHandlers)}
            >
              {/* Element Content */}
              {elem.type === 'text' ? (
                <View
                  style={[
                    styles.textContainer,
                    {
                      backgroundColor: elem.highlightColor || 'transparent',
                    },
                  ]}
                >
                  {isEditing ? (
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: scaledFontSize,
                        fontWeight: elem.fontWeight || 'normal',
                        fontStyle: elem.fontStyle || 'normal',
                        textDecorationLine: elem.textDecorationLine || 'none',
                        color: elem.color || '#1c1c1e',
                        textAlign: elem.textAlign || 'right',
                        writingDirection: elem.writingDirection || 'rtl',
                        lineHeight: scaledFontSize * (elem.lineSpacing || 1.2),
                        fontFamily: fontFamily || undefined,
                        padding: 0,
                        margin: 0,
                        textAlignVertical: 'top',
                      }}
                      value={elem.text}
                      onChangeText={(text) => {
                        onChangeElement({ ...elem, text });
                      }}
                      multiline={true}
                      autoFocus={true}
                      onBlur={() => {
                        if (onEndInlineEditing) onEndInlineEditing();
                      }}
                      onContentSizeChange={(e) => {
                        const contentHeight = e.nativeEvent.contentSize.height;
                        const neededPercent = Math.ceil(((contentHeight + 12) / canvasHeight) * 100);
                        if (neededPercent > elem.height) {
                          onChangeElement({ ...elem, height: Math.min(95, neededPercent) });
                        }
                      }}
                    />
                  ) : (
                    <Text
                      style={{
                        fontSize: scaledFontSize,
                        fontWeight: elem.fontWeight || 'normal',
                        fontStyle: elem.fontStyle || 'normal',
                        textDecorationLine: elem.textDecorationLine || 'none',
                        color: elem.color || '#1c1c1e',
                        textAlign: elem.textAlign || 'right',
                        writingDirection: elem.writingDirection || 'rtl',
                        lineHeight: scaledFontSize * (elem.lineSpacing || 1.2),
                        fontFamily: fontFamily || undefined,
                      }}
                    >
                      {elem.text || '...'}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.imageContainer}>
                  {elem.uri ? (
                    <Image
                      source={{ uri: elem.uri }}
                      style={styles.image}
                      resizeMode="contain"
                    />
                  ) : (
                    <TouchableOpacity
                      style={styles.imagePlaceholder}
                      onPress={() => onChangeImageElement(elem)}
                    >
                      <Text style={{ fontSize: 24, marginBottom: 4 }}>🖼️</Text>
                      <Text style={{ color: '#007AFF', fontSize: 12, fontWeight: 'bold' }}>
                        داگرتنی وێنە
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Resize Handle for Selected Element */}
              {isSelected && (
                <View
                  style={styles.resizeHandle}
                  {...resizeResponder.panHandlers}
                >
                  <View style={styles.resizeHandleInner} />
                </View>
              )}
            </View>
          );
        })}
      </TouchableOpacity>

      {/* Selected Element Floating Action Bar */}
      {selectedElementId && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => {
              const elem = elements.find((e) => e.id === selectedElementId);
              if (elem) onChangeElement({ ...elem, zIndex: (elem.zIndex || 1) + 1 });
            }}
          >
            <Text style={styles.actionText}>⬆️ پێشەوە</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => {
              const elem = elements.find((e) => e.id === selectedElementId);
              if (elem) onChangeElement({ ...elem, zIndex: Math.max(1, (elem.zIndex || 1) - 1) });
            }}
          >
            <Text style={styles.actionText}>⬇️ پاشەوە</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => onDuplicateElement(selectedElementId)}>
            <Text style={styles.actionText}>📋 کۆپی</Text>
          </TouchableOpacity>

          {elements.find((e) => e.id === selectedElementId)?.type === 'image' && (
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                const elem = elements.find((e) => e.id === selectedElementId);
                if (elem) onChangeImageElement(elem);
              }}
            >
              <Text style={{ color: '#007AFF', fontSize: 11, fontWeight: 'bold' }}>🖼️ گۆڕینی وێنە</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionItem, { backgroundColor: '#ff453a22' }]}
            onPress={() => onDeleteElement(selectedElementId)}
          >
            <Text style={{ color: '#ff453a', fontSize: 11, fontWeight: 'bold' }}>🗑️ سڕینەوە</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  canvas: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  elementWrapper: {
    position: 'absolute',
    padding: 2,
  },
  selectedWrapper: {
    borderWidth: 1.5,
    borderColor: '#D24726',
    borderStyle: 'dashed',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 4,
  },
  imageContainer: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resizeHandle: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  resizeHandleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D24726',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  actionBar: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    padding: 6,
    gap: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  actionItem: {
    backgroundColor: '#3a3a3c',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
