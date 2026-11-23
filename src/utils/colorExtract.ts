/**
 * Dominant color extraction utilities for Smart Palette generation.
 * Runs synchronously on an existing canvas or asynchronously on an image URL/dataUrl.
 */

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, '0');
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
}

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function getSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === min) return 0;
  const d = max - min;
  return d / (1 - Math.abs(max + min - 1));
}

export function extractPaletteFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  maxColors = 6
): string[] {
  try {
    const sampleSize = 64;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sampleSize;
    tempCanvas.height = sampleSize;
    const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];

    ctx.drawImage(sourceCanvas, 0, 0, sampleSize, sampleSize);
    const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);

    const buckets = new Map<
      string,
      { rSum: number; gSum: number; bSum: number; count: number; satSum: number }
    >();

    // Quantize into 24-unit RGB bins (steps of 24 => ~11x11x11 palette space)
    const step = 24;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 128) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const qr = Math.round(r / step) * step;
      const qg = Math.round(g / step) * step;
      const qb = Math.round(b / step) * step;
      const key = `${qr},${qg},${qb}`;

      const sat = getSaturation(r, g, b);
      const existing = buckets.get(key);
      if (existing) {
        existing.rSum += r;
        existing.gSum += g;
        existing.bSum += b;
        existing.count += 1;
        existing.satSum += sat;
      } else {
        buckets.set(key, { rSum: r, gSum: g, bSum: b, count: 1, satSum: sat });
      }
    }

    if (buckets.size === 0) return [];

    const candidates = Array.from(buckets.values())
      .map((bkt) => {
        const avgR = bkt.rSum / bkt.count;
        const avgG = bkt.gSum / bkt.count;
        const avgB = bkt.bSum / bkt.count;
        const avgSat = bkt.satSum / bkt.count;
        const lum = (0.2126 * avgR + 0.7152 * avgG + 0.0722 * avgB) / 255;

        // Balance raw pixel frequency with chromatic richness, gently downweighting pure extreme black/white noise
        const extremePenalty = lum > 0.96 || lum < 0.04 ? 0.55 : 1;
        const score = bkt.count * (1 + avgSat * 1.35) * extremePenalty;

        return {
          rgb: [avgR, avgG, avgB] as [number, number, number],
          hex: rgbToHex(avgR, avgG, avgB),
          count: bkt.count,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);

    const selected: { rgb: [number, number, number]; hex: string }[] = [];
    const minDist = 42;

    for (const c of candidates) {
      if (selected.length >= maxColors) break;
      const tooClose = selected.some((s) => colorDistance(s.rgb, c.rgb) < minDist);
      if (!tooClose) {
        selected.push({ rgb: c.rgb, hex: c.hex });
      }
    }

    // If image was very monochromatic, fill remaining slots with looser distance threshold
    if (selected.length < Math.min(maxColors, candidates.length)) {
      for (const c of candidates) {
        if (selected.length >= maxColors) break;
        if (!selected.some((s) => s.hex === c.hex || colorDistance(s.rgb, c.rgb) < 20)) {
          selected.push({ rgb: c.rgb, hex: c.hex });
        }
      }
    }

    return selected.map((s) => s.hex);
  } catch (err) {
    console.warn('Palette extraction failed:', err);
    return [];
  }
}

export async function extractDominantColors(
  imageSrc: string,
  maxColors = 6
): Promise<string[]> {
  if (!imageSrc) return [];
  return new Promise((resolve) => {
    const img = new Image();
    if (!imageSrc.startsWith('data:') && !imageSrc.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      try {
        const w = Math.max(1, Math.min(128, img.naturalWidth || 64));
        const h = Math.max(1, Math.min(128, img.naturalHeight || 64));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve([]);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(extractPaletteFromCanvas(canvas, maxColors));
      } catch {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.src = imageSrc;
  });
}

export function mergeSmartPalette(
  existing: string[] = [],
  incoming: string[] = [],
  limit = 16
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const hex of [...incoming, ...existing]) {
    const norm = hex.trim().toLowerCase();
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    result.push(norm);
    if (result.length >= limit) break;
  }
  return result;
}

function parseHexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace('#', '');
  if (/^[0-9a-f]{3}$/i.test(clean)) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  if (/^[0-9a-f]{6}$/i.test(clean)) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return null;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(1, s));
  const lig = Math.max(0, Math.min(1, l));

  if (sat === 0) {
    const v = lig * 255;
    return rgbToHex(v, v, v);
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = lig < 0.5 ? lig * (1 + sat) : lig + sat - lig * sat;
  const p = 2 * lig - q;
  const hk = hue / 360;
  const r = hue2rgb(p, q, hk + 1 / 3) * 255;
  const g = hue2rgb(p, q, hk) * 255;
  const b = hue2rgb(p, q, hk - 1 / 3) * 255;
  return rgbToHex(r, g, b);
}

/**
 * Generates a vibrant, contrast-balanced complementary palette derived from
 * the canvas's current `smartPalette` state (falling back to provided canvas/studio seeds).
 */
export function generateComplementaryPalette(
  smartPalette: string[] = [],
  desiredCount = 6,
  fallbackColors: string[] = [],
  variationStep = 0
): string[] {
  const validSmart = smartPalette.filter((c) => parseHexToRgb(c) !== null);
  const validFallback = fallbackColors.filter((c) => parseHexToRgb(c) !== null);
  const seeds =
    validSmart.length > 0
      ? validSmart
      : validFallback.length > 0
      ? validFallback
      : ['#2563eb', '#0f766e', '#7c3aed', '#f59e0b'];

  const hueOffsets = [180, 150, 210, 120, 240, 195, 165, 30];
  const candidates: string[] = [];
  const seen = new Set<string>();

  const pushUnique = (hex: string) => {
    const norm = hex.toLowerCase();
    if (seen.has(norm)) return;
    const rgb = parseHexToRgb(norm);
    if (!rgb) return;
    // Ensure noticeable perceptual separation from previous candidates when small palette
    if (candidates.length < 10) {
      for (const existing of candidates) {
        const exRgb = parseHexToRgb(existing);
        if (exRgb && colorDistance(rgb, exRgb) < 26) return;
      }
    }
    seen.add(norm);
    candidates.push(norm);
  };

  // Prioritize chromatic seeds first so monochrome dark/white pixels don't dominate every complement
  const sortedSeeds = [...seeds].sort((a, b) => {
    const rgbA = parseHexToRgb(a)!;
    const rgbB = parseHexToRgb(b)!;
    return rgbToHsl(...rgbB)[1] - rgbToHsl(...rgbA)[1];
  });

  const targetTotal = Math.max(desiredCount, 6);

  for (let pass = 0; pass < hueOffsets.length && candidates.length < targetTotal * 2; pass++) {
    const offset = hueOffsets[(pass + variationStep) % hueOffsets.length];
    for (let i = 0; i < sortedSeeds.length; i++) {
      const seed = sortedSeeds[(i + variationStep) % sortedSeeds.length];
      const rgb = parseHexToRgb(seed);
      if (!rgb) continue;
      const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);

      if (s < 0.09) {
        // Monochrome seed: invert lightness contrast + cool/warm complementary tint
        const invL = l > 0.55 ? 0.16 + ((pass * 0.08) % 0.22) : 0.86 - ((pass * 0.08) % 0.22);
        const subtleTintHue = (210 + (pass + variationStep) * 45) % 360;
        pushUnique(hslToHex(subtleTintHue, pass % 2 === 0 ? 0.28 : 0.1, invL));
      } else {
        const compHue = (h + offset) % 360;
        const tunedSat = Math.max(0.48, Math.min(0.88, s * 0.92 + 0.12));
        // Alternate lighter & richer shades so text/shapes layered together maintain visual hierarchy
        const altLight =
          pass % 2 === 0
            ? Math.max(0.36, Math.min(0.66, 1 - l * 0.72))
            : Math.max(0.28, Math.min(0.76, l < 0.45 ? l + 0.34 : l - 0.18));
        pushUnique(hslToHex(compHue, tunedSat, altLight));
      }
    }
  }

  // Shuffle deterministically-fresh on each call using Math.random while avoiding adjacent clones
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  return candidates.slice(0, Math.max(targetTotal, candidates.length));
}

