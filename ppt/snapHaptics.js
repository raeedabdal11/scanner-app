// Very short haptic tick when a snap newly engages ("چەسپاندن"). React Native's built-in
// Vibration (android.permission.VIBRATE is already in the manifest). Kept apart from
// snapGeometry.js so the snapping math stays plain JS (node scripts can import it).
import { Vibration } from 'react-native';
import { getSnapEnabled, snapRotation } from './snapGeometry';

export const snapTick = () => {
  if (!getSnapEnabled()) return;
  try {
    Vibration.vibrate(8);
  } catch (e) {
    // no vibrator: snapping stays silent
  }
};

/**
 * Rotation from a toolbar control, snapped to 0 / 45 / 90 ... within 3 degrees. Ticks once when
 * the value newly lands on a snap angle (not while it stays there, never when snapping is OFF).
 */
export const snapRotationWithTick = (deg, currentRotation) => {
  const raw = ((Number(deg) || 0) % 360 + 360) % 360;
  const snapped = snapRotation(deg);
  if (snapped !== raw && snapped !== ((currentRotation || 0) % 360 + 360) % 360) snapTick();
  return snapped;
};
