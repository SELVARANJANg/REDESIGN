/**
 * Mobile haptic vibration feedback helpers using navigator.vibrate.
 * Gracefully degrades to no-op on unsupported desktop browsers / iOS Safari.
 */

const HAPTICS_PREF_KEY = 'gamura-haptics-enabled-v1';

let lastSnapVibrationAt = 0;

export function isHapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function getHapticsEnabled(): boolean {
  try {
    const raw = localStorage.getItem(HAPTICS_PREF_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

export function setHapticsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(HAPTICS_PREF_KEY, String(enabled));
  } catch {
    // Ignore storage restriction
  }
}

function triggerVibrate(pattern: number | number[]): void {
  if (!getHapticsEnabled() || !isHapticsSupported()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore browser gesture/permission exceptions
  }
}

/**
 * Subtle tactile tick when an element snaps to a grid interval, guide line, or spacing target.
 * Rate-limited so dragging smoothly across lines never buzzes continuously.
 */
export function hapticSnap(): void {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (now - lastSnapVibrationAt < 50) return;
  lastSnapVibrationAt = now;
  triggerVibrate(9);
}

/**
 * Distinct confirmation pulse when dropping / placing an element or finalizing a reorder.
 */
export function hapticDrop(): void {
  triggerVibrate([12, 18, 10]);
}

/**
 * Crisp feedback pulse when saving or restoring a version snapshot.
 */
export function hapticSuccess(): void {
  triggerVibrate([10, 24, 16]);
}
