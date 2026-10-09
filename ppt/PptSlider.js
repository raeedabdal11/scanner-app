import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';

const THUMB_SIZE = 22;
const THUMB_RADIUS = THUMB_SIZE / 2;
const TOUCH_HEIGHT = 48;

export const PptSlider = ({
  value = 0,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  label = '',
  unit = '',
  color = '#8B3A2B',
  style,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const containerWidthRef = useRef(0);

  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(null);

  const startLocX = useRef(0);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const minRef = useRef(min);
  minRef.current = min;

  const maxRef = useRef(max);
  maxRef.current = max;

  const stepRef = useRef(step);
  stepRef.current = step;

  const currentValue = isDragging && dragValue !== null ? dragValue : value;

  const computeValueFromX = (locX, width) => {
    const currentMin = minRef.current;
    const currentMax = maxRef.current;
    const currentStep = stepRef.current;

    if (width <= THUMB_SIZE) return currentMin;
    const trackWidth = width - THUMB_SIZE;
    const touchX = locX - THUMB_RADIUS;
    const ratio = Math.max(0, Math.min(1, touchX / trackWidth));
    let rawVal = currentMin + ratio * (currentMax - currentMin);

    if (currentStep > 0) {
      rawVal = Math.round((rawVal - currentMin) / currentStep) * currentStep + currentMin;
    }

    const precision = currentStep.toString().split('.')[1]?.length || 0;
    const clampedVal = Math.max(currentMin, Math.min(currentMax, Number(rawVal.toFixed(precision))));
    return clampedVal;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (evt) => {
        const locX = evt.nativeEvent.locationX;
        const width = containerWidthRef.current;
        console.log(`[PptSlider:${label}] onPanResponderGrant locX=${locX}, containerWidth=${width}`);
        setIsDragging(true);
        startLocX.current = locX;
        if (width > 0) {
          const newVal = computeValueFromX(locX, width);
          console.log(`[PptSlider:${label}] onPanResponderGrant newVal=${newVal}`);
          setDragValue(newVal);
          if (onChangeRef.current) onChangeRef.current(newVal);
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        const currentLocX = startLocX.current + gestureState.dx;
        const width = containerWidthRef.current;
        console.log(`[PptSlider:${label}] onPanResponderMove dx=${gestureState.dx}, currentLocX=${currentLocX}, containerWidth=${width}`);
        if (width > 0) {
          const newVal = computeValueFromX(currentLocX, width);
          console.log(`[PptSlider:${label}] onPanResponderMove newVal=${newVal}`);
          setDragValue(newVal);
          if (onChangeRef.current) onChangeRef.current(newVal);
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        const currentLocX = startLocX.current + gestureState.dx;
        const width = containerWidthRef.current;
        console.log(`[PptSlider:${label}] onPanResponderRelease dx=${gestureState.dx}, currentLocX=${currentLocX}, containerWidth=${width}`);
        if (width > 0) {
          const newVal = computeValueFromX(currentLocX, width);
          console.log(`[PptSlider:${label}] onPanResponderRelease finalVal=${newVal}`);
          if (onChangeRef.current) onChangeRef.current(newVal);
        }
        setIsDragging(false);
        setDragValue(null);
      },

      onPanResponderTerminate: () => {
        console.log(`[PptSlider:${label}] onPanResponderTerminate`);
        setIsDragging(false);
        setDragValue(null);
      },
    })
  ).current;

  const ratio = max > min ? Math.max(0, Math.min(1, (currentValue - min) / (max - min))) : 0;

  return (
    <View style={[styles.wrapper, style]}>
      {(label !== '' || unit !== '') && (
        <View style={styles.labelRow}>
          <Text style={styles.labelText}>{label}</Text>
          <Text style={styles.valueText}>{`${currentValue}${unit}`}</Text>
        </View>
      )}

      <View
        style={styles.touchContainer}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) {
            setContainerWidth(w);
            containerWidthRef.current = w;
          }
        }}
        {...panResponder.panHandlers}
      >
        <View style={styles.trackTrack} pointerEvents="none">
          <View style={styles.trackBackground}>
            <View
              style={[
                styles.trackFill,
                {
                  width: `${ratio * 100}%`,
                  backgroundColor: color,
                },
              ]}
            />
          </View>

          <View
            style={[
              styles.thumb,
              {
                left: `${ratio * 100}%`,
                borderColor: color,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 4,
    width: '100%',
    minWidth: 160,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  labelText: {
    color: '#8B3A2B',
    fontSize: 11,
    fontWeight: 'bold',
  },
  valueText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  touchContainer: {
    height: TOUCH_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: THUMB_RADIUS,
  },
  trackTrack: {
    width: '100%',
    height: TOUCH_HEIGHT,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBackground: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3a3a3c',
    overflow: 'hidden',
    width: '100%',
  },
  trackFill: {
    height: '100%',
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    top: (TOUCH_HEIGHT - THUMB_SIZE) / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_RADIUS,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    transform: [{ translateX: -THUMB_RADIUS }],
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});

export default PptSlider;
