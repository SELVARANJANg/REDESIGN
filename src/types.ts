export type ElementType =
  | 'artboard'
  | 'rect'
  | 'oval'
  | 'text'
  | 'note'
  | 'line'
  | 'arrow'
  | 'path'
  | 'image'
  | 'group';

export interface RadialGradientStop {
  offset: number; // 0 to 100 (%)
  color: string;
  opacity?: number; // 0 to 1
}

export interface RadialGradientSpec {
  cx?: number; // 0 to 100 (%), default 50
  cy?: number; // 0 to 100 (%), default 50
  r?: number; // 0 to 100 (%), default 50
  fx?: number; // optional focal point X (0-100)
  fy?: number; // optional focal point Y (0-100)
  stops: RadialGradientStop[];
}

export type BlendModeType =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'soft-light';

export interface BaseElement {
  id: number;
  t: ElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  flipX?: boolean;
  flipY?: boolean;
  op?: number;
  blendMode?: BlendModeType;
  radialGradient?: RadialGradientSpec | string;
  sh?: boolean | number;
  shadowStyle?: 'none' | 'subtle' | 'soft' | 'heavy';
  shadowIntensity?: number; // 0 - 100%
  shadowBlur?: number;
  shadowY?: number;
  link?: string;
  locked?: boolean;
  hidden?: boolean;
  aspectLocked?: boolean;
  groupId?: number;
  autoLayout?: 'none' | 'vertical' | 'horizontal';
  autoLayoutGap?: number;
  autoLayoutPadding?: number;
  autoLayoutAlign?: 'start' | 'center' | 'end';
}

export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type DistributionType = 'horizontal' | 'vertical';

export interface ArtboardElement extends BaseElement {
  t: 'artboard';
  n: string;
  fill: string;
  r?: number;
  device?: string;
  orientationLocked?: boolean;
  lockedOrientation?: 'portrait' | 'landscape';
}

export interface RectElement extends BaseElement {
  t: 'rect';
  fill: string;
  gradientFill?: string;
  radialGradient?: RadialGradientSpec | string;
  stroke?: string;
  sw?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  r?: number;
  paddingH?: number;
  paddingV?: number;
  marginH?: number;
  marginV?: number;
}

export interface OvalElement extends BaseElement {
  t: 'oval';
  fill: string;
  gradientFill?: string;
  radialGradient?: RadialGradientSpec | string;
  stroke?: string;
  sw?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
}

export interface TextElement extends BaseElement {
  t: 'text';
  text: string;
  fs: number;
  fill: string;
  b?: boolean;
  fw?: number;
  ls?: number;
  it?: boolean;
  ff?: string;
  align?: 'left' | 'center' | 'right';
}

export interface NoteElement extends BaseElement {
  t: 'note';
  text: string;
  fs: number;
  fill: string;
  tc: string;
}

export interface LineElement extends BaseElement {
  t: 'line';
  stroke: string;
  sw: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
}

export interface ArrowElement extends BaseElement {
  t: 'arrow';
  stroke: string;
  sw: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
}

export interface PathElement extends BaseElement {
  t: 'path';
  pts: [number, number][];
  stroke: string;
  sw: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  smooth?: boolean;
  smoothTolerance?: number;
}

export interface ImageElement extends BaseElement {
  t: 'image';
  src: string;
  br?: number;
  ct?: number;
  sa?: number;
  bl?: number;
  fm?: 'xMidYMid slice' | 'xMidYMid meet' | 'none';
  r?: number;
  stroke?: string;
  sw?: number;
  palette?: string[];
  qrValue?: string;
}

export interface GroupElement extends BaseElement {
  t: 'group';
  n?: string;
  childrenIds: number[];
}

export type CanvasElement =
  | ArtboardElement
  | RectElement
  | OvalElement
  | TextElement
  | NoteElement
  | LineElement
  | ArrowElement
  | PathElement
  | ImageElement
  | GroupElement;

export interface PageComment {
  id: string;
  author: string;
  text: string;
  time: string;
}

export interface Page {
  id: string;
  n: string;
  items: CanvasElement[];
  cm: (string | PageComment)[];
}

export interface ProjectState {
  name: string;
  id: number;
  pi: number;
  pages: Page[];
  smartPalette?: string[];
}

export type SelectionMode = 'single' | 'multi';
export type SaveStatus = 'saved' | 'saving';

export type ToolType =
  | 'select'
  | 'hand'
  | 'text'
  | 'artboard'
  | 'note'
  | 'pencil'
  | 'pen'
  | 'rect'
  | 'oval'
  | 'arrow'
  | 'line'
  | 'image'
  | 'eyedropper';

export interface Viewport {
  x: number;
  y: number;
  z: number;
}

export interface DevicePreset {
  id: string;
  name: string;
  category: 'Mobile' | 'Tablet' | 'Desktop' | 'Watch';
  w: number;
  h: number;
  icon?: string;
}

export interface DistanceMarker {
  type: 'h' | 'v';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  distance: number;
  label: string;
}

export interface TemplateCanvasItem {
  t: ElementType | string;
  x: number;
  y: number;
  w: number;
  h: number;
  [key: string]: any;
}

export interface DesignTemplate {
  id: string;
  title: string;
  category: 'cards' | 'resume' | 'contact' | 'greetings' | 'ui' | 'marketing';
  categoryLabel: string;
  description: string;
  badge?: string;
  tags: string[];
  w: number;
  h: number;
  elements: TemplateCanvasItem[];
}

export interface VersionSnapshot {
  id: string;
  timestamp: number;
  label: string;
  kind: 'hourly' | 'manual' | 'pre-restore';
  projectName: string;
  pageCount: number;
  elementCount: number;
  data: ProjectState;
}
