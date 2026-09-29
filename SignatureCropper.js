import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Text, TouchableOpacity, PanResponder, StyleSheet, ActivityIndicator } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

const MIN = 40;
const TOUCH = 48;
const DOT = 20;
const ACCENT = '#22C55E';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export default function SignatureCropper({ uri, onDone, onCancel }) {
  const [imgSize, setImgSize] = useState(null);
  const [bounds, setBounds] = useState(null);
  const [rect, setRect] = useState(null);
  const [busy, setBusy] = useState(false);

  const rectRef = useRef(null);
  const boundsRef = useRef(null);
  const startRef = useRef(null);
  const boxRef = useRef(null);

  const updateRect = (r) => { rectRef.current = r; setRect(r); };

  useEffect(() => {
    rectRef.current = null;
    setRect(null);
    Image.getSize(uri, (w, h) => setImgSize({ w, h }), () => setImgSize(null));
  }, [uri]);

  const computeBounds = () => {
    const box = boxRef.current;
    if (!box || !imgSize) return;
    const s = Math.min(box.w / imgSize.w, box.h / imgSize.h);
    const w = imgSize.w * s;
    const h = imgSize.h * s;
    const b = { x: (box.w - w) / 2, y: (box.h - h) / 2, w, h, s };
    boundsRef.current = b;
    setBounds(b);
    if (!rectRef.current) updateRect({ x: b.x, y: b.y, w: b.w, h: b.h });
  };

  useEffect(computeBounds, [imgSize]);

  const onLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    boxRef.current = { w: width, h: height };
    computeBounds();
  };

  const makePan = (mode) => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: () => { startRef.current = rectRef.current ? { ...rectRef.current } : null; },
    onPanResponderMove: (_, g) => {
      const s = startRef.current;
      const B = boundsRef.current;
      if (!s || !B) return;
      if (mode === 'move') {
        updateRect({
          x: clamp(s.x + g.dx, B.x, B.x + B.w - s.w),
          y: clamp(s.y + g.dy, B.y, B.y + B.h - s.h),
          w: s.w, h: s.h,
        });
        return;
      }
      let L = s.x, T = s.y, R = s.x + s.w, Bo = s.y + s.h;
      if (mode.includes('l')) L = clamp(s.x + g.dx, B.x, R - MIN);
      if (mode.includes('r')) R = clamp(s.x + s.w + g.dx, L + MIN, B.x + B.w);
      if (mode.includes('t')) T = clamp(s.y + g.dy, B.y, Bo - MIN);
      if (mode.includes('b')) Bo = clamp(s.y + s.h + g.dy, T + MIN, B.y + B.h);
      updateRect({ x: L, y: T, w: R - L, h: Bo - T });
    },
  });

  const pans = useRef({
    move: makePan('move'),
    tl: makePan('tl'), tr: makePan('tr'), bl: makePan('bl'), br: makePan('br'),
    t: makePan('t'), b: makePan('b'), l: makePan('l'), r: makePan('r'),
  }).current;

  const handleDone = async () => {
    const B = boundsRef.current;
    const r = rectRef.current;
    if (!B || !r || !imgSize) return;
    setBusy(true);
    try {
      const originX = clamp(Math.round((r.x - B.x) / B.s), 0, imgSize.w - 1);
      const originY = clamp(Math.round((r.y - B.y) / B.s), 0, imgSize.h - 1);
      const width = clamp(Math.round(r.w / B.s), 1, imgSize.w - originX);
      const height = clamp(Math.round(r.h / B.s), 1, imgSize.h - originY);
      const res = await ImageManipulator.manipulateAsync(
        uri,
        [{ crop: { originX, originY, width, height } }],
        { format: ImageManipulator.SaveFormat.PNG }
      );
      onDone && onDone(res.uri, { width: res.width, height: res.height });
    } catch (e) {
      console.warn('Crop failed', e);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    const b = boundsRef.current;
    if (b) updateRect({ x: b.x, y: b.y, w: b.w, h: b.h });
  };

  const handles = rect ? [
    { key: 'tl', x: rect.x, y: rect.y },
    { key: 'tr', x: rect.x + rect.w, y: rect.y },
    { key: 'bl', x: rect.x, y: rect.y + rect.h },
    { key: 'br', x: rect.x + rect.w, y: rect.y + rect.h },
    { key: 't', x: rect.x + rect.w / 2, y: rect.y },
    { key: 'b', x: rect.x + rect.w / 2, y: rect.y + rect.h },
    { key: 'l', x: rect.x, y: rect.y + rect.h / 2 },
    { key: 'r', x: rect.x + rect.w, y: rect.y + rect.h / 2 },
  ] : [];

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>بڕینی واژۆ</Text>
      <View style={styles.stage} onLayout={onLayout}>
        {bounds && (
          <>
            <View pointerEvents="none" style={[styles.paper, { left: bounds.x, top: bounds.y, width: bounds.w, height: bounds.h }]} />
            <Image source={{ uri }} style={{ position: 'absolute', left: bounds.x, top: bounds.y, width: bounds.w, height: bounds.h }} />
          </>
        )}
        {rect && bounds && (
          <>
            <View pointerEvents="none" style={[styles.dim, { left: bounds.x, top: bounds.y, width: bounds.w, height: rect.y - bounds.y }]} />
            <View pointerEvents="none" style={[styles.dim, { left: bounds.x, top: rect.y + rect.h, width: bounds.w, height: bounds.y + bounds.h - (rect.y + rect.h) }]} />
            <View pointerEvents="none" style={[styles.dim, { left: bounds.x, top: rect.y, width: rect.x - bounds.x, height: rect.h }]} />
            <View pointerEvents="none" style={[styles.dim, { left: rect.x + rect.w, top: rect.y, width: bounds.x + bounds.w - (rect.x + rect.w), height: rect.h }]} />
            <View {...pans.move.panHandlers} style={[styles.frame, { left: rect.x, top: rect.y, width: rect.w, height: rect.h }]}>
              <View pointerEvents="none" style={[styles.gridV, { left: '33.33%' }]} />
              <View pointerEvents="none" style={[styles.gridV, { left: '66.66%' }]} />
              <View pointerEvents="none" style={[styles.gridH, { top: '33.33%' }]} />
              <View pointerEvents="none" style={[styles.gridH, { top: '66.66%' }]} />
            </View>
            {handles.map((h) => (
              <View key={h.key} {...pans[h.key].panHandlers} style={[styles.touch, { left: h.x - TOUCH / 2, top: h.y - TOUCH / 2 }]}>
                <View style={h.key.length === 2 ? styles.dotCorner : styles.dotEdge} />
              </View>
            ))}
          </>
        )}
        {!bounds && <ActivityIndicator style={{ flex: 1 }} color={ACCENT} />}
      </View>
      <Text style={styles.hint}>گۆشەکان ڕابکێشە بۆ گەورە و بچووککردن، ناوەڕاستیش بۆ جووڵاندن</Text>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onCancel} disabled={busy}>
          <Text style={styles.btnGhostText}>پاشگەزبوونەوە</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={handleReset} disabled={busy}>
          <Text style={styles.btnGhostText}>دووبارە</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnMain]} onPress={handleDone} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnMainText}>بڕین</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1F2328', paddingTop: 48, paddingBottom: 24 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  stage: { flex: 1, marginHorizontal: 16 },
  paper: { position: 'absolute', backgroundColor: '#FFFFFF' },
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.45)' },
  frame: { position: 'absolute', borderWidth: 2, borderColor: ACCENT },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(34,197,94,0.5)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(34,197,94,0.5)' },
  touch: { position: 'absolute', width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center', zIndex: 10, elevation: 10 },
  dotCorner: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: '#fff', borderWidth: 3, borderColor: ACCENT },
  dotEdge: { width: DOT - 4, height: DOT - 4, borderRadius: (DOT - 4) / 2, backgroundColor: ACCENT, borderWidth: 2, borderColor: '#fff' },
  hint: { color: '#A8B0B8', fontSize: 13, textAlign: 'center', marginTop: 12 },
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 14 },
  btn: { flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: '#2E343B' },
  btnGhostText: { color: '#E6E8EA', fontSize: 15, fontWeight: '600' },
  btnMain: { backgroundColor: ACCENT },
  btnMainText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
