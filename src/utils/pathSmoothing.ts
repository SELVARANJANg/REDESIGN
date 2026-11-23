/**
 * Path simplification and Catmull-Rom -> Cubic Bezier SVG path smoothing
 * for the hand-drawn Pen & Pencil tools.
 */

function perpendicularDistance(
  pt: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(pt[0] - lineStart[0], pt[1] - lineStart[1]);
  }
  const num = Math.abs(
    dy * pt[0] - dx * pt[1] + lineEnd[0] * lineStart[1] - lineEnd[1] * lineStart[0]
  );
  return num / Math.sqrt(lenSq);
}

/**
 * Ramer-Douglas-Peucker point reduction algorithm.
 * Removes redundant micro-jitter points from raw pointer streams while preserving curves & corners.
 */
export function simplifyPoints(
  pts: [number, number][],
  tolerance: number = 1.8
): [number, number][] {
  if (pts.length <= 2) return pts;

  let maxDist = 0;
  let index = 0;
  const end = pts.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(pts[i], pts[0], pts[end]);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyPoints(pts.slice(0, index + 1), tolerance);
    const right = simplifyPoints(pts.slice(index), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [pts[0], pts[end]];
}

/**
 * Converts a sequence of [x, y] points into a smooth SVG path string (`M ... C ...`)
 * using centripetal/uniform Catmull-Rom to Cubic Bezier spline conversion.
 */
export function pointsToSmoothSvgPath(
  pts: [number, number][],
  tension: number = 0.5
): string {
  if (!pts || pts.length === 0) return '';
  if (pts.length === 1) {
    const [x, y] = pts[0];
    return `M ${x} ${y} L ${x + 0.1} ${y + 0.1}`;
  }
  if (pts.length === 2) {
    return `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]}`;
  }

  const fmt = (n: number) => Math.round(n * 100) / 100;
  let d = `M ${fmt(pts[0][0])} ${fmt(pts[0][1])}`;
  const factor = tension / 3;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = p1[0] + (p2[0] - p0[0]) * factor;
    const cp1y = p1[1] + (p2[1] - p0[1]) * factor;
    const cp2x = p2[0] - (p3[0] - p1[0]) * factor;
    const cp2y = p2[1] - (p3[1] - p1[1]) * factor;

    d += ` C ${fmt(cp1x)} ${fmt(cp1y)}, ${fmt(cp2x)} ${fmt(cp2y)}, ${fmt(p2[0])} ${fmt(p2[1])}`;
  }

  return d;
}

/**
 * Converts points to a raw unsmoothed polyline path (`M ... L ...`).
 */
export function pointsToLinearSvgPath(pts: [number, number][]): string {
  if (!pts || pts.length === 0) return '';
  if (pts.length === 1) {
    return `M ${pts[0][0]} ${pts[0][1]} L ${pts[0][0] + 0.1} ${pts[0][1] + 0.1}`;
  }
  return pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
}
