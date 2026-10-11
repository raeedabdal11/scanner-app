// Shared safe-area + keyboard helpers for every PPT screen and panel.
//
// RN Modals open their own Android window, so useSafeAreaInsets() needs a
// SafeAreaProvider *inside* each Modal (PptSafeAreaRoot). Keyboard events come
// from the main activity: endCoordinates.height excludes the navigation bar,
// while endCoordinates.screenY is the real top edge of the keyboard on screen,
// so overlap is always computed from screenY against a measured view.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Keyboard, Platform, StatusBar, Dimensions } from 'react-native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const BOTTOM_EXTRA = 4;

export const PptSafeAreaRoot = ({ children, style }) => (
  <SafeAreaProvider initialMetrics={initialWindowMetrics} style={style}>
    {children}
  </SafeAreaProvider>
);

export const useEditorInsets = () => {
  const insets = useSafeAreaInsets();
  const fallback = (initialWindowMetrics && initialWindowMetrics.insets) || {};
  const statusBarH = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
  const bottom = Math.max(insets.bottom || 0, fallback.bottom || 0);
  return {
    // Header padding: below the status bar / punch-hole camera
    top: Math.max(insets.top || 0, statusBarH, 8),
    // Above the navigation bar / gesture line
    bottom,
    bottomPad: bottom + BOTTOM_EXTRA,
    left: Math.max(insets.left || 0, fallback.left || 0),
    right: Math.max(insets.right || 0, fallback.right || 0),
  };
};

export const useKeyboard = () => {
  const [kb, setKb] = useState({ visible: false, height: 0, screenY: 0 });
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      const end = (e && e.endCoordinates) || {};
      const height = end.height || 0;
      const screenH = Dimensions.get('screen').height;
      const screenY = end.screenY > 0 && end.screenY < screenH ? end.screenY : screenH - height;
      setKb((prev) =>
        prev.visible && prev.height === height && prev.screenY === screenY
          ? prev
          : { visible: height > 0, height, screenY }
      );
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKb((prev) => (prev.visible ? { visible: false, height: 0, screenY: 0 } : prev));
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  return kb;
};

// How much of a view's bottom edge the keyboard covers. Works whether or not
// the window was resized for the keyboard (a resized window gives 0).
export const useKeyboardOverlap = (viewRef, keyboard) => {
  const [overlap, setOverlap] = useState(0);

  const measure = useCallback(() => {
    if (!keyboard.visible) {
      setOverlap(0);
      return;
    }
    const node = viewRef.current;
    if (!node || typeof node.measureInWindow !== 'function') return;
    node.measureInWindow((x, y, w, h) => {
      const next = Math.max(0, Math.round(y + h - keyboard.screenY));
      setOverlap((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    });
  }, [viewRef, keyboard.visible, keyboard.screenY]);

  useEffect(() => {
    measure();
  }, [measure]);

  return { overlap, remeasure: measure };
};

// A bottom sheet / container whose last row must stay above the navigation bar
export const PptSafeBottomView = ({ style, extra = 0, children }) => {
  const insets = useEditorInsets();
  return <View style={[style, { paddingBottom: insets.bottom + extra }]}>{children}</View>;
};

// Bottom dock: keeps its children above the navigation bar, and directly
// above the keyboard while it is open. Its own bottom edge never moves (it is
// the last child of a flex column), so it can measure itself safely.
export const PptKeyboardDock = ({ children, style, onKeyboardPlaced }) => {
  const dockRef = useRef(null);
  const insets = useEditorInsets();
  const keyboard = useKeyboard();
  const { overlap, remeasure } = useKeyboardOverlap(dockRef, keyboard);
  const placedRef = useRef(onKeyboardPlaced);
  placedRef.current = onKeyboardPlaced;

  // Tell the parent once the dock has settled above the keyboard
  useEffect(() => {
    if (!keyboard.visible || !placedRef.current) return undefined;
    const t = setTimeout(() => {
      const node = dockRef.current;
      if (!node || !placedRef.current) return;
      node.measureInWindow((x, y, w, h) => {
        // Padding sits under the content, so the content starts at the dock top
        if (placedRef.current) placedRef.current({ dockTop: y });
      });
    }, 60);
    return () => clearTimeout(t);
  }, [keyboard.visible, keyboard.screenY, overlap]);

  return (
    <View
      ref={dockRef}
      onLayout={remeasure}
      style={[
        style,
        {
          paddingBottom: keyboard.visible ? overlap : insets.bottomPad,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      {children}
    </View>
  );
};
