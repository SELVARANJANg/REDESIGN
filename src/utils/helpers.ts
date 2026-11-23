import {
  CanvasElement,
  DevicePreset,
  ProjectState,
  AlignmentType,
  DistributionType,
} from '../types';

export const STORAGE_KEY = 'gamura-redesign-v3-unique';

export const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'iphone', name: 'iPhone 16 Pro', category: 'Mobile', w: 393, h: 852 },
  { id: 'galaxy', name: 'Galaxy S24', category: 'Mobile', w: 360, h: 780 },
  { id: 'ipad', name: 'iPad Air / Tablet', category: 'Tablet', w: 820, h: 1080 },
  { id: 'desktop', name: 'Desktop Web', category: 'Desktop', w: 1200, h: 750 },
  { id: 'dribbble', name: 'Dribbble / Social', category: 'Desktop', w: 800, h: 600 },
];

export const DEFS = `
<defs>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="150%">
    <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.16" />
  </filter>
  <filter id="sh-sm" x="-20%" y="-20%" width="140%" height="150%">
    <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.10" />
  </filter>
  <filter id="sh-lg" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="12" stdDeviation="20" flood-opacity="0.22" />
  </filter>
  <linearGradient id="grad-gamura-blue" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#2563eb" />
    <stop offset="100%" stop-color="#4f46e5" />
  </linearGradient>
  <linearGradient id="grad-purple-pink" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#8b5cf6" />
    <stop offset="100%" stop-color="#ec4899" />
  </linearGradient>
  <linearGradient id="grad-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#059669" />
    <stop offset="100%" stop-color="#10b981" />
  </linearGradient>
  <linearGradient id="grad-sunset" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#f59e0b" />
    <stop offset="100%" stop-color="#ef4444" />
  </linearGradient>
  <linearGradient id="grad-dark-card" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#1e293b" />
    <stop offset="100%" stop-color="#0f172a" />
  </linearGradient>
  <radialGradient id="rgrad-spotlight-blue" cx="35%" cy="35%" r="70%">
    <stop offset="0%" stop-color="#60a5fa" />
    <stop offset="100%" stop-color="#1e3a8a" />
  </radialGradient>
  <radialGradient id="rgrad-sunset-glow" cx="50%" cy="50%" r="60%">
    <stop offset="0%" stop-color="#fde047" />
    <stop offset="55%" stop-color="#f97316" />
    <stop offset="100%" stop-color="#be123c" />
  </radialGradient>
  <radialGradient id="rgrad-emerald-aurora" cx="35%" cy="30%" r="70%">
    <stop offset="0%" stop-color="#6ee7b7" />
    <stop offset="100%" stop-color="#065f46" />
  </radialGradient>
  <radialGradient id="rgrad-berry-velvet" cx="40%" cy="35%" r="68%">
    <stop offset="0%" stop-color="#f472b6" />
    <stop offset="100%" stop-color="#581c87" />
  </radialGradient>
  <radialGradient id="rgrad-golden-orb" cx="40%" cy="35%" r="65%">
    <stop offset="0%" stop-color="#fef08a" />
    <stop offset="100%" stop-color="#b45309" />
  </radialGradient>
  <radialGradient id="rgrad-dark-vignette" cx="50%" cy="45%" r="70%">
    <stop offset="0%" stop-color="#334155" />
    <stop offset="100%" stop-color="#020617" />
  </radialGradient>
</defs>
`;

export const LINEAR_GRADIENT_PRESETS = [
  { id: 'url(#grad-gamura-blue)', name: 'Ocean Blue', css: 'linear-gradient(135deg, #2563eb, #4f46e5)' },
  { id: 'url(#grad-purple-pink)', name: 'Neon Berry', css: 'linear-gradient(135deg, #8b5cf6, #ec4899)' },
  { id: 'url(#grad-emerald)', name: 'Emerald Mint', css: 'linear-gradient(135deg, #059669, #10b981)' },
  { id: 'url(#grad-sunset)', name: 'Warm Sunset', css: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
  { id: 'url(#grad-dark-card)', name: 'Obsidian Slate', css: 'linear-gradient(135deg, #1e293b, #0f172a)' },
];

export const RADIAL_GRADIENT_PRESETS = [
  {
    id: 'rgrad-spotlight-blue',
    name: 'Spotlight',
    css: 'radial-gradient(circle at 35% 35%, #60a5fa, #1e3a8a)',
    spec: {
      cx: 35,
      cy: 35,
      r: 70,
      stops: [
        { offset: 0, color: '#60a5fa' },
        { offset: 100, color: '#1e3a8a' },
      ],
    },
  },
  {
    id: 'rgrad-sunset-glow',
    name: 'Solar Glow',
    css: 'radial-gradient(circle at 50% 50%, #fde047, #f97316, #be123c)',
    spec: {
      cx: 50,
      cy: 50,
      r: 60,
      stops: [
        { offset: 0, color: '#fde047' },
        { offset: 55, color: '#f97316' },
        { offset: 100, color: '#be123c' },
      ],
    },
  },
  {
    id: 'rgrad-emerald-aurora',
    name: 'Aurora',
    css: 'radial-gradient(circle at 35% 30%, #6ee7b7, #065f46)',
    spec: {
      cx: 35,
      cy: 30,
      r: 70,
      stops: [
        { offset: 0, color: '#6ee7b7' },
        { offset: 100, color: '#065f46' },
      ],
    },
  },
  {
    id: 'rgrad-berry-velvet',
    name: 'Velvet Bloom',
    css: 'radial-gradient(circle at 40% 35%, #f472b6, #581c87)',
    spec: {
      cx: 40,
      cy: 35,
      r: 68,
      stops: [
        { offset: 0, color: '#f472b6' },
        { offset: 100, color: '#581c87' },
      ],
    },
  },
  {
    id: 'rgrad-golden-orb',
    name: 'Amber Orb',
    css: 'radial-gradient(circle at 40% 35%, #fef08a, #b45309)',
    spec: {
      cx: 40,
      cy: 35,
      r: 65,
      stops: [
        { offset: 0, color: '#fef08a' },
        { offset: 100, color: '#b45309' },
      ],
    },
  },
  {
    id: 'rgrad-dark-vignette',
    name: 'Midnight',
    css: 'radial-gradient(circle at 50% 45%, #334155, #020617)',
    spec: {
      cx: 50,
      cy: 45,
      r: 70,
      stops: [
        { offset: 0, color: '#334155' },
        { offset: 100, color: '#020617' },
      ],
    },
  },
];

export const FONT_FAMILIES = [
  { name: 'Sans', value: 'system-ui, -apple-system, sans-serif' },
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Mono', value: 'ui-monospace, Menlo, monospace' },
  { name: 'Display', value: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' },
];

export const COLOR_PALETTE = [
  '#ffffff',
  '#f8fafc',
  '#2563eb',
  '#4f46e5',
  '#7c3aed',
  '#db2777',
  '#dc2626',
  '#ea580c',
  '#d97706',
  '#16a34a',
  '#0d9488',
  '#0284c7',
  '#1e293b',
  '#0f172a',
];

export function escapeHtml(str: string): string {
  return String(str).replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });
}

export function isValidHex(c?: string): string {
  if (!c) return '#000000';
  return /^#[0-9a-f]{6}$/i.test(c) ? c : '#2563eb';
}

export function fitTextDimensions(item: CanvasElement): void {
  if (item.t === 'text') {
    const lines = item.text.split('\n');
    const maxLine = Math.max(...lines.map((l) => l.length), 1);
    const weight = item.fw ?? (item.b ? 700 : 400);
    const weightFactor = weight >= 800 ? 0.65 : weight >= 600 ? 0.62 : 0.60;
    const lsExtra = (item.ls ?? 0) * Math.max(0, maxLine - 1);
    item.w = Math.max(30, maxLine * item.fs * weightFactor + lsExtra);
    item.h = Math.max(item.fs * 1.25, lines.length * item.fs * 1.3);
  }
}

export function isInside(child: CanvasElement, parent: CanvasElement): boolean {
  const cx = child.x + child.w / 2;
  const cy = child.y + child.h / 2;
  return cx >= parent.x && cx <= parent.x + parent.w && cy >= parent.y && cy <= parent.y + parent.h;
}

export function getBoundingBox(elements: CanvasElement[]) {
  if (!elements.length) return { x: 0, y: 0, w: 380, h: 780 };
  const xs: number[] = [];
  const ys: number[] = [];
  elements.forEach((item) => {
    xs.push(item.x, item.x + item.w);
    ys.push(item.y, item.y + item.h);
  });
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    w: Math.max(maxX - minX, 10),
    h: Math.max(maxY - minY, 10),
  };
}

export function alignElements(
  allElements: CanvasElement[],
  targetIds: number[],
  alignment: AlignmentType,
  parentArtboard?: CanvasElement
): CanvasElement[] {
  const targets = allElements.filter((el) => targetIds.includes(el.id));
  if (targets.length === 0) return allElements;

  // Single element inside an artboard: align relative to the artboard
  if (targets.length === 1 && parentArtboard) {
    const el = targets[0];
    let newX = el.x;
    let newY = el.y;

    switch (alignment) {
      case 'left':
        newX = parentArtboard.x + 20;
        break;
      case 'center':
        newX = parentArtboard.x + Math.round((parentArtboard.w - el.w) / 2);
        break;
      case 'right':
        newX = parentArtboard.x + parentArtboard.w - el.w - 20;
        break;
      case 'top':
        newY = parentArtboard.y + 36;
        break;
      case 'middle':
        newY = parentArtboard.y + Math.round((parentArtboard.h - el.h) / 2);
        break;
      case 'bottom':
        newY = parentArtboard.y + parentArtboard.h - el.h - 36;
        break;
    }

    return allElements.map((item) => (item.id === el.id ? { ...item, x: newX, y: newY } : item));
  }

  // Multiple elements: align relative to their collective bounding box
  if (targets.length >= 2) {
    const bbox = getBoundingBox(targets);
    const centerX = bbox.x + bbox.w / 2;
    const centerY = bbox.y + bbox.h / 2;

    const updates = new Map<number, { x?: number; y?: number }>();

    targets.forEach((el) => {
      switch (alignment) {
        case 'left':
          updates.set(el.id, { x: bbox.x });
          break;
        case 'center':
          updates.set(el.id, { x: Math.round(centerX - el.w / 2) });
          break;
        case 'right':
          updates.set(el.id, { x: bbox.x + bbox.w - el.w });
          break;
        case 'top':
          updates.set(el.id, { y: bbox.y });
          break;
        case 'middle':
          updates.set(el.id, { y: Math.round(centerY - el.h / 2) });
          break;
        case 'bottom':
          updates.set(el.id, { y: bbox.y + bbox.h - el.h });
          break;
      }
    });

    return allElements.map((item) => {
      const u = updates.get(item.id);
      return u ? { ...item, ...u } : item;
    });
  }

  return allElements;
}

export function distributeElements(
  allElements: CanvasElement[],
  targetIds: number[],
  axis: DistributionType,
  parentArtboard?: CanvasElement
): CanvasElement[] {
  const targets = allElements.filter((el) => targetIds.includes(el.id));
  if (targets.length < 2) return allElements;

  const updates = new Map<number, { x?: number; y?: number }>();

  if (axis === 'horizontal') {
    const sorted = [...targets].sort((a, b) => a.x - b.x);
    if (sorted.length === 2 && parentArtboard) {
      const totalW = sorted[0].w + sorted[1].w;
      const gap = Math.max(8, (parentArtboard.w - totalW) / 3);
      updates.set(sorted[0].id, { x: Math.round(parentArtboard.x + gap) });
      updates.set(sorted[1].id, { x: Math.round(parentArtboard.x + gap * 2 + sorted[0].w) });
    } else {
      const first = sorted[0];
      const maxRight = Math.max(...sorted.map((s) => s.x + s.w));
      const span = maxRight - first.x;
      const totalItemWidths = sorted.reduce((sum, item) => sum + item.w, 0);
      const gap = (span - totalItemWidths) / (sorted.length - 1);

      let currentX = first.x;
      sorted.forEach((el, index) => {
        if (index === 0) {
          currentX += el.w + gap;
        } else {
          updates.set(el.id, { x: Math.round(currentX) });
          currentX += el.w + gap;
        }
      });
    }
  } else {
    const sorted = [...targets].sort((a, b) => a.y - b.y);
    if (sorted.length === 2 && parentArtboard) {
      const totalH = sorted[0].h + sorted[1].h;
      const gap = Math.max(8, (parentArtboard.h - totalH) / 3);
      updates.set(sorted[0].id, { y: Math.round(parentArtboard.y + gap) });
      updates.set(sorted[1].id, { y: Math.round(parentArtboard.y + gap * 2 + sorted[0].h) });
    } else {
      const first = sorted[0];
      const maxBottom = Math.max(...sorted.map((s) => s.y + s.h));
      const span = maxBottom - first.y;
      const totalItemHeights = sorted.reduce((sum, item) => sum + item.h, 0);
      const gap = (span - totalItemHeights) / (sorted.length - 1);

      let currentY = first.y;
      sorted.forEach((el, index) => {
        if (index === 0) {
          currentY += el.h + gap;
        } else {
          updates.set(el.id, { y: Math.round(currentY) });
          currentY += el.h + gap;
        }
      });
    }
  }

  return allElements.map((item) => {
    const u = updates.get(item.id);
    return u ? { ...item, ...u } : item;
  });
}

export function applyAutoLayout(
  allElements: CanvasElement[],
  children: CanvasElement[],
  direction: 'vertical' | 'horizontal',
  gap: number = 12,
  padding: number = 0,
  align: 'start' | 'center' | 'end' = 'start',
  container?: CanvasElement
): CanvasElement[] {
  if (children.length === 0) return allElements;

  const updates = new Map<number, { x: number; y: number }>();
  const origin = container ? { x: container.x, y: container.y, w: container.w, h: container.h } : getBoundingBox(children);
  const pad = container ? padding : 0;

  if (direction === 'vertical') {
    const sorted = [...children].sort((a, b) => a.y - b.y);
    let curY = origin.y + pad;

    sorted.forEach((child) => {
      let curX = origin.x + pad;
      if (align === 'center') {
        curX = origin.x + Math.round((origin.w - child.w) / 2);
      } else if (align === 'end') {
        curX = origin.x + origin.w - child.w - pad;
      }
      updates.set(child.id, { x: curX, y: Math.round(curY) });
      curY += child.h + gap;
    });
  } else {
    const sorted = [...children].sort((a, b) => a.x - b.x);
    let curX = origin.x + pad;

    sorted.forEach((child) => {
      let curY = origin.y + pad;
      if (align === 'center') {
        curY = origin.y + Math.round((origin.h - child.h) / 2);
      } else if (align === 'end') {
        curY = origin.y + origin.h - child.h - pad;
      }
      updates.set(child.id, { x: Math.round(curX), y: curY });
      curX += child.w + gap;
    });
  }

  return allElements.map((item) => {
    const u = updates.get(item.id);
    return u ? { ...item, ...u } : item;
  });
}

export function createNewElement(
  t: CanvasElement['t'],
  x: number,
  y: number,
  w: number,
  h: number,
  nextId: number
): CanvasElement {
  const base = {
    id: nextId,
    t,
    x,
    y,
    w,
    h,
    op: 1,
    sh: false,
    rot: 0,
    shadowIntensity: 10,
  };

  switch (t) {
    case 'artboard':
      return {
        ...base,
        t: 'artboard',
        n: 'Mobile Artboard',
        fill: '#ffffff',
        sh: true,
        w: w || 380,
        h: h || 780,
      };
    case 'rect':
      return {
        ...base,
        t: 'rect',
        fill: '#ffffff',
        stroke: '#2563eb',
        sw: 1.5,
        strokeStyle: 'solid',
        r: 12,
        paddingH: 16,
        paddingV: 16,
        marginH: 0,
        marginV: 0,
        w: w || 180,
        h: h || 96,
      };
    case 'oval':
      return {
        ...base,
        t: 'oval',
        fill: '#4f46e5',
        stroke: '#ffffff',
        sw: 0,
        strokeStyle: 'solid',
        w: w || 110,
        h: h || 110,
      };
    case 'note':
      return {
        ...base,
        t: 'note',
        text: 'Quick Note\nDouble tap to edit',
        fs: 15,
        fill: '#fef08a',
        tc: '#1e293b',
        w: w || 200,
        h: h || 150,
        sh: true,
      };
    case 'text':
      return {
        ...base,
        t: 'text',
        text: 'Header Text',
        fs: 26,
        fill: '#0f172a',
        b: true,
        it: false,
        ff: 'system-ui, -apple-system, sans-serif',
        w: w || 160,
        h: h || 36,
      };
    case 'line':
      return {
        ...base,
        t: 'line',
        stroke: '#0f172a',
        sw: 3,
        strokeStyle: 'solid',
        w: w || 160,
        h: h || 0,
      };
    case 'arrow':
      return {
        ...base,
        t: 'arrow',
        stroke: '#0f172a',
        sw: 3,
        strokeStyle: 'solid',
        w: w || 160,
        h: h || 0,
      };
    case 'path':
      return {
        ...base,
        t: 'path',
        pts: [[x, y]],
        stroke: '#2563eb',
        sw: 3,
        w: 10,
        h: 10,
      };
    case 'image':
      return {
        ...base,
        t: 'image',
        src: '',
        br: 1,
        ct: 1,
        sa: 1,
        bl: 0,
        fm: 'xMidYMid slice',
        r: 12,
        sw: 0,
        w: w || 260,
        h: h || 180,
      };
    default:
      return {
        ...base,
        t: 'rect',
        fill: '#ffffff',
        stroke: '#2563eb',
        sw: 1.5,
        strokeStyle: 'solid',
        r: 8,
      } as CanvasElement;
  }
}

/**
 * BRAND NEW UNIQUE "WELCOME TO GAMURA" DEMO
 * Beautiful mobile-first UI with responsive phone shell, status bar, hero banner,
 * quick actions, cards, navigation bar, and design system tokens.
 */
export function createInitialSeed(): ProjectState {
  let id = 100;
  const p1Items: CanvasElement[] = [];

  // Artboard 1: Gamura Mobile App (380 x 780)
  const mobileArtboard: CanvasElement = {
    id: id++,
    t: 'artboard',
    n: 'Gamura App (iOS / Android)',
    x: 0,
    y: 0,
    w: 380,
    h: 780,
    fill: '#f8fafc',
    sh: true,
    shadowIntensity: 14,
    op: 1,
  };
  p1Items.push(mobileArtboard);

  // Phone Status Bar
  p1Items.push({
    id: id++,
    t: 'rect',
    x: 0,
    y: 0,
    w: 380,
    h: 46,
    fill: '#f8fafc',
    sh: false,
    r: 0,
  });

  // Dynamic Island / Camera Pill
  p1Items.push({
    id: id++,
    t: 'rect',
    x: 135,
    y: 10,
    w: 110,
    h: 26,
    fill: '#0f172a',
    r: 14,
    sh: false,
  });

  // Status time
  p1Items.push({
    id: id++,
    t: 'text',
    x: 24,
    y: 14,
    w: 48,
    h: 20,
    text: '9:41',
    fs: 14,
    b: true,
    fill: '#0f172a',
  });

  // Battery & Wifi icons representation
  p1Items.push({
    id: id++,
    t: 'rect',
    x: 326,
    y: 16,
    w: 24,
    h: 12,
    fill: '#0f172a',
    r: 3,
  });

  // App Navigation Header Bar
  p1Items.push({
    id: id++,
    t: 'rect',
    x: 20,
    y: 56,
    w: 340,
    h: 52,
    fill: '#ffffff',
    r: 16,
    sh: true,
    shadowIntensity: 8,
  });

  // Gamura Brand Logo Badge
  p1Items.push({
    id: id++,
    t: 'rect',
    x: 30,
    y: 66,
    w: 32,
    h: 32,
    fill: '#2563eb',
    r: 10,
  });

  p1Items.push({
    id: id++,
    t: 'text',
    x: 39,
    y: 71,
    w: 20,
    h: 20,
    text: 'G',
    fs: 18,
    b: true,
    fill: '#ffffff',
  });

  // Header Search / Project Label
  p1Items.push({
    id: id++,
    t: 'text',
    x: 72,
    y: 72,
    w: 180,
    h: 22,
    text: 'Gamura Studio v2',
    fs: 16,
    b: true,
    fill: '#0f172a',
  });

  // Avatar circle
  p1Items.push({
    id: id++,
    t: 'oval',
    x: 316,
    y: 68,
    w: 28,
    h: 28,
    fill: '#6366f1',
    sh: false,
  });

  // Hero Card Banner (Dark gradient glassmorphism)
  p1Items.push({
    id: id++,
    t: 'rect',
    x: 20,
    y: 122,
    w: 340,
    h: 174,
    fill: '#1e293b',
    gradientFill: 'url(#grad-dark-card)',
    r: 22,
    sh: true,
    shadowIntensity: 18,
    link: '#welcome-card',
  });

  // Hero Tag Pill
  p1Items.push({
    id: id++,
    t: 'rect',
    x: 36,
    y: 140,
    w: 154,
    h: 26,
    fill: '#2563eb',
    r: 13,
  });

  p1Items.push({
    id: id++,
    t: 'text',
    x: 48,
    y: 144,
    w: 130,
    h: 18,
    text: 'TOUCH & DESKTOP',
    fs: 11,
    b: true,
    fill: '#ffffff',
  });

  // Hero Heading
  p1Items.push({
    id: id++,
    t: 'text',
    x: 36,
    y: 176,
    w: 260,
    h: 36,
    text: 'Design with Pure Speed',
    fs: 22,
    b: true,
    fill: '#ffffff',
  });

  // Hero Subtitle
  p1Items.push({
    id: id++,
    t: 'text',
    x: 36,
    y: 216,
    w: 280,
    h: 36,
    text: 'Vector artboards, instant CSS export,\nmulti-touch gesture pan and pinch.',
    fs: 13,
    b: false,
    fill: '#94a3b8',
  });

  // Hero Action Button
  p1Items.push({
    id: id++,
    t: 'rect',
    x: 36,
    y: 256,
    w: 112,
    h: 28,
    fill: '#ffffff',
    r: 8,
  });

  p1Items.push({
    id: id++,
    t: 'text',
    x: 48,
    y: 261,
    w: 88,
    h: 18,
    text: 'Explore Tools →',
    fs: 12,
    b: true,
    fill: '#0f172a',
  });

  // Section Label: "Core Features"
  p1Items.push({
    id: id++,
    t: 'text',
    x: 22,
    y: 312,
    w: 160,
    h: 24,
    text: 'Studio Features',
    fs: 17,
    b: true,
    fill: '#0f172a',
  });

  // 4 Feature Cards (2x2 Grid)
  const featureCards = [
    {
      title: 'Vector Canvas',
      desc: 'Infinitely scale & snap',
      color: '#2563eb',
      grad: 'url(#grad-gamura-blue)',
      icon: '▢',
    },
    {
      title: 'Live Code',
      desc: 'Clean HTML & Tailwind',
      color: '#059669',
      grad: 'url(#grad-emerald)',
      icon: '</>',
    },
    {
      title: 'Device Presets',
      desc: 'iOS, Android & Web',
      color: '#7c3aed',
      grad: 'url(#grad-purple-pink)',
      icon: '📱',
    },
    {
      title: 'Export Studio',
      desc: 'PNG, PDF, SVG ready',
      color: '#ea580c',
      grad: 'url(#grad-sunset)',
      icon: '⇪',
    },
  ];

  featureCards.forEach((c, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const cx = 20 + col * 174;
    const cy = 342 + row * 114;

    // Card background
    p1Items.push({
      id: id++,
      t: 'rect',
      x: cx,
      y: cy,
      w: 166,
      h: 102,
      fill: '#ffffff',
      r: 18,
      sh: true,
      shadowIntensity: 8,
      link: `#card-${index}`,
    });

    // Badge icon circle
    p1Items.push({
      id: id++,
      t: 'rect',
      x: cx + 14,
      y: cy + 14,
      w: 32,
      h: 32,
      fill: c.color,
      gradientFill: c.grad,
      r: 10,
    });

    // Title
    p1Items.push({
      id: id++,
      t: 'text',
      x: cx + 14,
      y: cy + 54,
      w: 138,
      h: 20,
      text: c.title,
      fs: 14,
      b: true,
      fill: '#0f172a',
    });

    // Subtitle
    p1Items.push({
      id: id++,
      t: 'text',
      x: cx + 14,
      y: cy + 76,
      w: 138,
      h: 18,
      text: c.desc,
      fs: 11,
      b: false,
      fill: '#64748b',
    });
  });

  // Recent Artboards Carousel Card
  p1Items.push({
    id: id++,
    t: 'rect',
    x: 20,
    y: 582,
    w: 340,
    h: 96,
    fill: '#ffffff',
    r: 20,
    sh: true,
    shadowIntensity: 8,
  });

  p1Items.push({
    id: id++,
    t: 'text',
    x: 36,
    y: 600,
    w: 240,
    h: 22,
    text: 'Multi-device Ready',
    fs: 16,
    b: true,
    fill: '#0f172a',
  });

  p1Items.push({
    id: id++,
    t: 'text',
    x: 36,
    y: 626,
    w: 280,
    h: 36,
    text: 'Optimized for iPhone, Android, iPad & Desktop screens with pixel-perfect alignment.',
    fs: 12,
    b: false,
    fill: '#64748b',
  });

  // Bottom Floating Navigation Bar
  p1Items.push({
    id: id++,
    t: 'rect',
    x: 20,
    y: 698,
    w: 340,
    h: 60,
    fill: '#0f172a',
    r: 24,
    sh: true,
    shadowIntensity: 20,
  });

  const navItems = ['Home', 'Canvas', '+', 'Export', 'Code'];
  navItems.forEach((n, idx) => {
    const nx = 42 + idx * 62;
    if (n === '+') {
      p1Items.push({
        id: id++,
        t: 'rect',
        x: nx - 6,
        y: 708,
        w: 40,
        h: 40,
        fill: '#2563eb',
        r: 20,
      });
      p1Items.push({
        id: id++,
        t: 'text',
        x: nx + 7,
        y: 717,
        w: 18,
        h: 20,
        text: '+',
        fs: 20,
        b: true,
        fill: '#ffffff',
      });
    } else {
      p1Items.push({
        id: id++,
        t: 'text',
        x: nx,
        y: 720,
        w: 48,
        h: 18,
        text: n,
        fs: 12,
        b: idx === 0,
        fill: idx === 0 ? '#ffffff' : '#94a3b8',
      });
    }
  });

  // Artboard 2: "Design System & UI Kit" (380 x 660) placed alongside
  const uiKitArtboard: CanvasElement = {
    id: id++,
    t: 'artboard',
    n: 'Design System Tokens',
    x: 420,
    y: 0,
    w: 380,
    h: 660,
    fill: '#ffffff',
    sh: true,
    shadowIntensity: 12,
    op: 1,
  };
  p1Items.push(uiKitArtboard);

  // Section: Buttons
  p1Items.push({
    id: id++,
    t: 'text',
    x: 444,
    y: 28,
    w: 200,
    h: 24,
    text: 'Buttons & Components',
    fs: 18,
    b: true,
    fill: '#0f172a',
  });

  // Primary Button
  p1Items.push({
    id: id++,
    t: 'rect',
    x: 444,
    y: 64,
    w: 332,
    h: 48,
    fill: '#2563eb',
    gradientFill: 'url(#grad-gamura-blue)',
    r: 14,
    sh: true,
    shadowIntensity: 10,
  });

  p1Items.push({
    id: id++,
    t: 'text',
    x: 550,
    y: 78,
    w: 150,
    h: 22,
    text: 'Primary Action',
    fs: 15,
    b: true,
    fill: '#ffffff',
  });

  // Secondary Button
  p1Items.push({
    id: id++,
    t: 'rect',
    x: 444,
    y: 124,
    w: 332,
    h: 48,
    fill: '#f1f5f9',
    stroke: '#cbd5e1',
    sw: 1.5,
    r: 14,
  });

  p1Items.push({
    id: id++,
    t: 'text',
    x: 540,
    y: 138,
    w: 160,
    h: 22,
    text: 'Secondary Action',
    fs: 15,
    b: true,
    fill: '#334155',
  });

  // Section: Color Palette
  p1Items.push({
    id: id++,
    t: 'text',
    x: 444,
    y: 198,
    w: 200,
    h: 24,
    text: 'Color System',
    fs: 18,
    b: true,
    fill: '#0f172a',
  });

  const swatches = [
    { name: 'Royal Blue', hex: '#2563eb' },
    { name: 'Indigo', hex: '#4f46e5' },
    { name: 'Violet', hex: '#7c3aed' },
    { name: 'Emerald', hex: '#059669' },
    { name: 'Amber', hex: '#d97706' },
  ];

  swatches.forEach((sw, sidx) => {
    const sx = 444 + sidx * 66;
    p1Items.push({
      id: id++,
      t: 'rect',
      x: sx,
      y: 234,
      w: 58,
      h: 58,
      fill: sw.hex,
      r: 12,
      sh: true,
      shadowIntensity: 8,
    });
    p1Items.push({
      id: id++,
      t: 'text',
      x: sx,
      y: 300,
      w: 58,
      h: 16,
      text: sw.hex,
      fs: 10,
      b: true,
      fill: '#64748b',
    });
  });

  // Section: Input field specimen
  p1Items.push({
    id: id++,
    t: 'text',
    x: 444,
    y: 336,
    w: 200,
    h: 24,
    text: 'Form Elements',
    fs: 18,
    b: true,
    fill: '#0f172a',
  });

  p1Items.push({
    id: id++,
    t: 'rect',
    x: 444,
    y: 372,
    w: 332,
    h: 46,
    fill: '#f8fafc',
    stroke: '#e2e8f0',
    sw: 1.5,
    r: 12,
  });

  p1Items.push({
    id: id++,
    t: 'text',
    x: 460,
    y: 386,
    w: 220,
    h: 20,
    text: 'Enter email address...',
    fs: 14,
    b: false,
    fill: '#94a3b8',
  });

  // Sticky Note with Gamura Tips
  p1Items.push({
    id: id++,
    t: 'note',
    x: 444,
    y: 450,
    w: 332,
    h: 180,
    fill: '#fef08a',
    tc: '#713f12',
    fs: 14,
    text: 'Gamura Studio Guide 🚀\n\n• Touch-optimized: Tap items to inspect, drag 8 corner & edge handles to resize.\n• Pinch to zoom or use 50% pill.\n• Tap 🎛 for real-time CSS / HTML.\n• Tap ▶ to test clickable mockups!',
    sh: true,
    shadowIntensity: 16,
  });

  p1Items.forEach(fitTextDimensions);

  // Page 2: Wireframe Mockups
  const p2Items: CanvasElement[] = [];
  p2Items.push({
    id: id++,
    t: 'artboard',
    n: 'Wireframe Canvas',
    x: 40,
    y: 40,
    w: 380,
    h: 700,
    fill: '#ffffff',
    sh: true,
    shadowIntensity: 10,
    op: 1,
  });

  p2Items.push({
    id: id++,
    t: 'rect',
    x: 64,
    y: 72,
    w: 332,
    h: 60,
    fill: '#f1f5f9',
    stroke: '#cbd5e1',
    sw: 1.5,
    strokeStyle: 'dashed',
    r: 12,
  });

  p2Items.push({
    id: id++,
    t: 'text',
    x: 140,
    y: 92,
    w: 180,
    h: 24,
    text: '+ Header Wireframe',
    fs: 15,
    b: true,
    fill: '#64748b',
  });

  p2Items.push({
    id: id++,
    t: 'rect',
    x: 64,
    y: 152,
    w: 332,
    h: 220,
    fill: '#f8fafc',
    stroke: '#cbd5e1',
    sw: 1.5,
    strokeStyle: 'dashed',
    r: 16,
  });

  p2Items.push({
    id: id++,
    t: 'text',
    x: 130,
    y: 250,
    w: 200,
    h: 24,
    text: '+ Hero Section Placeholder',
    fs: 15,
    b: true,
    fill: '#64748b',
  });

  p2Items.forEach(fitTextDimensions);

  return {
    name: 'Gamura Studio',
    id: id + 10,
    pi: 0,
    pages: [
      {
        id: 'p1',
        n: 'Mobile App & UI Kit',
        items: p1Items,
        cm: [
          {
            id: 'c1',
            author: 'Gamura Engine',
            text: 'Welcome to Gamura Studio! Optimized for touch, mobile, tablet & desktop.',
            time: 'Just now',
          },
        ],
      },
      {
        id: 'p2',
        n: 'Wireframes & Templates',
        items: p2Items,
        cm: [],
      },
    ],
  };
}
