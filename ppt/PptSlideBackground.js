import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { getSlideBackground, gradientLineCoords } from './slideBackground';

// Full-slide background layer (gradient / image + dark overlay). Rendered as the first,
// non-interactive child of a slide so it always sits behind every element.
// Solid backgrounds are drawn by the slide container's backgroundColor (see getSlideBaseColor).
export const PptSlideBackground = React.memo(({ slide, width, height }) => {
  const bg = getSlideBackground(slide);
  if (bg.type === 'solid' || !width || !height) return null;

  if (bg.type === 'gradient') {
    const { x1, y1, x2, y2 } = gradientLineCoords(bg.angle, width, height);
    const gradId = `slideBg_${String((slide && slide.id) || 'x').replace(/[^a-zA-Z0-9_]/g, '_')}`;
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient
              id={gradId}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={bg.color} stopOpacity="1" />
              <Stop offset="1" stopColor={bg.color2} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={width} height={height} fill={`url(#${gradId})`} />
        </Svg>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image source={{ uri: bg.uri }} style={{ width, height }} resizeMode="cover" />
      {bg.overlay > 0 && (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${bg.overlay / 100})` }]}
        />
      )}
    </View>
  );
});

// Color painted by the slide container itself (under the background layer).
export const getSlideBaseColor = (slide) => {
  const bg = getSlideBackground(slide);
  if (bg.type === 'image') return '#000000';
  return bg.color;
};
