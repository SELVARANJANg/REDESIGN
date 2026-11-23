import React, { useState, useRef, useEffect } from 'react';
import {
  Ban,
  MoreHorizontal,
  Copy,
  ArrowUp,
  ArrowDown,
  Trash2,
  Type,
  CornerUpRight,
  Sparkles,
  Group as GroupIcon,
  Ungroup as UngroupIcon,
  Pipette,
  AlignLeft,
  AlignCenterHorizontal,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Lock,
  Unlock,
  Bold,
  Italic,
  Minus,
  Plus,
  Layers,
  ChevronsUp,
  ChevronsDown,
  ChevronRight,
  RotateCw,
  AlignCenter,
  BoxSelect,
  FlipHorizontal2,
  FlipVertical2,
  Spline,
  Paintbrush,
  ClipboardPaste,
  CaseSensitive,
  Shuffle,
  Magnet,
  Compass,
  Frame,
} from 'lucide-react';
import { CanvasElement, Viewport, AlignmentType, DistributionType, RadialGradientSpec } from '../types';
import {
  getBoundingBox,
  isValidHex,
  LINEAR_GRADIENT_PRESETS,
  RADIAL_GRADIENT_PRESETS,
} from '../utils/helpers';

interface ContextToolbarProps {
  element: CanvasElement;
  selectedElements?: CanvasElement[];
  isGroup?: boolean;
  onGroup?: () => void;
  onUngroup?: () => void;
  onAlign?: (alignment: AlignmentType) => void;
  onDistribute?: (axis: DistributionType) => void;
  onStartEyedropper?: (targetProp: 'fill' | 'stroke') => void;
  viewport: Viewport;
  onUpdateElement: (id: number, updates: Partial<CanvasElement>) => void;
  onUpdateElements?: (ids: number[], updates: Partial<CanvasElement>) => void;
  onDuplicate: (id: number) => void;
  onBringToFront: (id: number) => void;
  onBringForward: (id: number) => void;
  onSendBackward: (id: number) => void;
  onSendToBack: (id: number) => void;
  onDelete: (id: number) => void;
  onEditText?: (element: CanvasElement) => void;
  onUploadImage?: () => void;
  onSelectArtboardChildren?: (artboardId: number) => void;
  canPasteStyle?: boolean;
  onCopyStyle?: (element: CanvasElement) => void;
  onPasteStyle?: () => void;
  onRandomizePalette?: () => void;
  smartPalette?: string[];
  nearestArtboardName?: string | null;
  isNearArtboardEdge?: boolean;
  autoSnappedArtboard?: {
    artboardId: number;
    artboardName: string;
    edge: string;
    timestamp: number;
  } | null;
  onSnapToNearestArtboard?: (mode?: 'edge' | 'inset' | 'center') => void;
  onSnapshot?: () => void;
  isPropertiesOpen?: boolean;
}

type PopupType =
  | 'fill'
  | 'stroke'
  | 'opacity'
  | 'rotation'
  | 'radius'
  | 'spacing'
  | 'shadow'
  | 'align'
  | 'layers'
  | 'more'
  | null;

export const ContextToolbar: React.FC<ContextToolbarProps> = ({
  element,
  selectedElements = [],
  isGroup = false,
  onGroup,
  onUngroup,
  onAlign,
  onDistribute,
  onStartEyedropper,
  viewport,
  onUpdateElement,
  onUpdateElements,
  onDuplicate,
  onBringToFront,
  onBringForward,
  onSendBackward,
  onSendToBack,
  onDelete,
  onEditText,
  onUploadImage,
  onSelectArtboardChildren,
  canPasteStyle = false,
  onCopyStyle,
  onPasteStyle,
  onRandomizePalette,
  smartPalette = [],
  nearestArtboardName = null,
  isNearArtboardEdge = false,
  autoSnappedArtboard = null,
  onSnapToNearestArtboard,
  onSnapshot,
  isPropertiesOpen = false,
}) => {
  const [activePopup, setActivePopup] = useState<PopupType>(null);
  const [showLayerSubmenu, setShowLayerSubmenu] = useState(false);
  const [fillModeTab, setFillModeTab] = useState<'solid' | 'linear' | 'radial'>('solid');
  const [rotDraft, setRotDraft] = useState<string>(String(Math.round(element.rot || 0)));
  const containerRef = useRef<HTMLDivElement>(null);
  const dialRef = useRef<SVGSVGElement>(null);
  const isDialDraggingRef = useRef(false);
  const scrubSnapshotTakenRef = useRef(false);

  const targetElements = selectedElements.length > 0 ? selectedElements : [element];
  const targetIds = targetElements.map((el) => el.id);
  const isMulti = targetElements.length > 1;
  const isLocked = !!element.locked;
  const currentRot = Math.round((element.rot || 0) * 10) / 10;
  const isShadowEnabled =
    element.sh === true ||
    (element.sh !== false && Boolean(element.shadowStyle) && element.shadowStyle !== 'none');
  const currentShadowIntensity = Math.max(
    1,
    Math.min(
      40,
      typeof element.shadowIntensity === 'number' && element.shadowIntensity > 0
        ? element.shadowIntensity
        : element.shadowStyle === 'subtle'
        ? 6
        : element.shadowStyle === 'heavy'
        ? 26
        : 14
    )
  );

  const beginScrubSnapshot = () => {
    if (!scrubSnapshotTakenRef.current) {
      onSnapshot?.();
      scrubSnapshotTakenRef.current = true;
    }
  };

  const endScrubSnapshot = () => {
    scrubSnapshotTakenRef.current = false;
  };

  const applyUpdate = (updates: Partial<CanvasElement>, skipSnapshot = false) => {
    if (!skipSnapshot) {
      onSnapshot?.();
    }
    if (onUpdateElements && targetIds.length > 1) {
      onUpdateElements(targetIds, updates);
    } else {
      onUpdateElement(element.id, updates);
    }
  };

  useEffect(() => {
    setRotDraft(String(Math.round(element.rot || 0)));
  }, [element.id, element.rot]);

  // Reset popups when switching selected element
  useEffect(() => {
    setActivePopup(null);
    setShowLayerSubmenu(false);
    if (element.radialGradient) setFillModeTab('radial');
    else if ('gradientFill' in element && element.gradientFill) setFillModeTab('linear');
    else setFillModeTab('solid');
  }, [element.id]);

  // Close popup when clicking outside the context toolbar
  useEffect(() => {
    const handleOutsideClick = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActivePopup(null);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, []);

  // Compute collective bounding box for accurate positioning over single OR multi selections
  const bbox = isMulti
    ? getBoundingBox(targetElements)
    : { x: element.x, y: element.y, w: element.w, h: element.h };

  const screenX = viewport.x + (bbox.x + bbox.w / 2) * viewport.z;
  // Canvas is positioned at top-14 (56px) below Header
  const screenY = 56 + viewport.y + bbox.y * viewport.z;
  const screenH = Math.max(10, bbox.h * viewport.z);

  // Header (56px) + FloatingPills (~48px) ends around y=110px.
  // Reserve enough clearance for the two-row compact ContextToolbar + optional Snap badge.
  const safeTopFloor = 114;
  const safeBottomCeil = isPropertiesOpen
    ? Math.max(216, Math.round(window.innerHeight * 0.54) - 16)
    : window.innerHeight - 86;

  const hasRoomAbove = screenY >= 228;
  const hasRoomBelow = screenY + screenH + 92 <= safeBottomCeil;

  let toolbarTop: number;
  let toolbarTransform: string;
  if (hasRoomAbove) {
    toolbarTop = Math.min(safeBottomCeil, screenY - 10);
    toolbarTransform = 'translate(-50%, -100%)';
  } else if (hasRoomBelow) {
    toolbarTop = Math.max(safeTopFloor, screenY + screenH + 12);
    toolbarTransform = 'translate(-50%, 0)';
  } else {
    toolbarTop = safeTopFloor;
    toolbarTransform = 'translate(-50%, 0)';
  }

  // Open popups downward when toolbar sits in upper half of screen so popups never clip above viewport
  const openPopupBelow =
    toolbarTransform === 'translate(-50%, 0)'
      ? toolbarTop < window.innerHeight * 0.55
      : toolbarTop < window.innerHeight * 0.52;

  // Keep toolbar & popups cleanly within mobile/tablet/desktop screen bounds
  const isMobileViewport = window.innerWidth < 640;
  const edgePad = Math.min(180, Math.round(window.innerWidth * 0.44));
  const toolbarLeft = isMobileViewport
    ? Math.round(window.innerWidth / 2)
    : Math.max(edgePad, Math.min(window.innerWidth - edgePad, screenX));

  const isLine = element.t === 'line' || element.t === 'arrow' || element.t === 'path';
  const isShapeWithGradients = element.t === 'rect' || element.t === 'oval';
  const isImage = element.t === 'image';
  const isTextLike = element.t === 'text' || element.t === 'note';

  const currentFill = 'fill' in element && element.fill ? element.fill : '#ffffff';
  const currentRadialSpec: RadialGradientSpec =
    element.radialGradient && typeof element.radialGradient !== 'string'
      ? element.radialGradient
      : RADIAL_GRADIENT_PRESETS[0].spec;
  const currentFillPreviewBg = element.radialGradient
    ? typeof element.radialGradient === 'string'
      ? RADIAL_GRADIENT_PRESETS.find((p) => element.radialGradient?.toString().includes(p.id))?.css ||
        currentFill
      : `radial-gradient(circle at ${currentRadialSpec.cx ?? 50}% ${currentRadialSpec.cy ?? 50}%, ${currentRadialSpec.stops
          .map((s) => `${s.color} ${s.offset}%`)
          .join(', ')})`
    : 'gradientFill' in element && element.gradientFill
    ? LINEAR_GRADIENT_PRESETS.find((p) => p.id === element.gradientFill)?.css || currentFill
    : currentFill;
  const currentStroke = 'stroke' in element && element.stroke ? element.stroke : '#1f6fe0';
  const currentSw = 'sw' in element && element.sw !== undefined ? element.sw : isLine ? 4 : 0;
  const currentRadius = 'r' in element && element.r !== undefined ? element.r : 0;
  const currentOpacity = element.op ?? 1;
  const currentStrokeStyle =
    'strokeStyle' in element && element.strokeStyle ? element.strokeStyle : 'solid';
  const paddingH = 'paddingH' in element && element.paddingH !== undefined ? element.paddingH : 16;
  const paddingV = 'paddingV' in element && element.paddingV !== undefined ? element.paddingV : 16;
  const marginH = 'marginH' in element && element.marginH !== undefined ? element.marginH : 0;
  const marginV = 'marginV' in element && element.marginV !== undefined ? element.marginV : 0;

  return (
    <div
      ref={containerRef}
      onPointerDown={(e) => e.stopPropagation()}
      className={`fixed z-40 select-none pointer-events-auto flex items-center ${
        openPopupBelow ? 'flex-col-reverse' : 'flex-col'
      }`}
      style={{
        left: `${toolbarLeft}px`,
        top: `${toolbarTop}px`,
        transform: toolbarTransform,
      }}
    >
      {/* Stroke Popup */}
      {activePopup === 'stroke' && (
        <div className="my-2 w-64 max-w-[calc(100vw-16px)] bg-white dark:bg-[#252529] rounded-2xl shadow-xl border border-gray-200/90 dark:border-gray-700/80 p-3 text-xs text-gray-700 dark:text-gray-200 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between gap-1 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl mb-3">
            <button
              onClick={() => applyUpdate({ strokeStyle: 'none', sw: 0 })}
              className={`flex-1 py-1.5 flex justify-center items-center rounded-lg transition-colors ${
                currentStrokeStyle === 'none' || currentSw === 0
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
              title="None"
            >
              <Ban size={15} />
            </button>
            <button
              onClick={() => applyUpdate({ strokeStyle: 'solid', sw: currentSw || 1.5 })}
              className={`flex-1 py-1.5 flex justify-center items-center rounded-lg transition-colors ${
                currentStrokeStyle === 'solid' && currentSw > 0
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
              title="Solid"
            >
              <div className="w-5 h-[2px] bg-current rounded-full" />
            </button>
            <button
              onClick={() => applyUpdate({ strokeStyle: 'dashed', sw: currentSw || 1.5 })}
              className={`flex-1 py-1.5 flex justify-center items-center rounded-lg transition-colors ${
                currentStrokeStyle === 'dashed'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
              title="Dashed"
            >
              <div className="flex gap-1">
                <span className="w-1.5 h-[2px] bg-current rounded-full" />
                <span className="w-1.5 h-[2px] bg-current rounded-full" />
              </div>
            </button>
            <button
              onClick={() => applyUpdate({ strokeStyle: 'dotted', sw: currentSw || 1.5 })}
              className={`flex-1 py-1.5 flex justify-center items-center rounded-lg transition-colors ${
                currentStrokeStyle === 'dotted'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
              title="Dotted"
            >
              <div className="flex gap-0.5">
                <span className="w-1 h-1 bg-current rounded-full" />
                <span className="w-1 h-1 bg-current rounded-full" />
                <span className="w-1 h-1 bg-current rounded-full" />
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <input
              type="color"
              value={isValidHex(currentStroke)}
              onChange={(e) => applyUpdate({ stroke: e.target.value, sw: currentSw || 1.5 })}
              className="w-8 h-8 rounded-lg cursor-pointer border border-gray-300 dark:border-gray-600 p-0.5 bg-transparent"
            />
            <input
              type="text"
              value={currentStroke || '#1f6fe0'}
              onChange={(e) => applyUpdate({ stroke: e.target.value })}
              className="flex-1 bg-gray-100 dark:bg-gray-800 px-2.5 py-1.5 rounded-lg font-mono text-xs outline-hidden"
              placeholder="#1f6fe0"
            />
            {onStartEyedropper && (
              <button
                type="button"
                onClick={() => {
                  onStartEyedropper('stroke');
                  setActivePopup(null);
                }}
                className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors"
                title="Eyedropper (Pick stroke color from canvas)"
              >
                <Pipette size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5 text-gray-400">
              <span className="w-3.5 h-[1.5px] bg-current rounded-full" />
              <span className="w-3.5 h-[2.5px] bg-current rounded-full" />
              <span className="w-3.5 h-[1.5px] bg-current rounded-full" />
            </div>
            <input
              type="number"
              min="0"
              max="32"
              value={currentSw}
              onChange={(e) => {
                const val = Math.max(0, parseInt(e.target.value) || 0);
                applyUpdate({
                  sw: val,
                  strokeStyle:
                    val > 0
                      ? currentStrokeStyle === 'none'
                        ? 'solid'
                        : currentStrokeStyle
                      : 'none',
                });
              }}
              className="flex-1 bg-gray-100 dark:bg-gray-800 px-2.5 py-1.5 rounded-lg text-xs outline-hidden font-medium"
            />
            <span className="text-gray-400 font-medium">px</span>
          </div>
        </div>
      )}

      {/* Opacity Slider Popup (0% to 100%) */}
      {activePopup === 'opacity' && (
        <div className="my-2 w-60 bg-white dark:bg-[#252529] rounded-2xl shadow-xl border border-gray-200/90 dark:border-gray-700/80 p-3 text-xs text-gray-700 dark:text-gray-200 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-gray-500 dark:text-gray-400">
              Opacity {isMulti ? `(${targetIds.length} items)` : ''}
            </span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
              {Math.round(currentOpacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={currentOpacity}
            onChange={(e) => applyUpdate({ op: parseFloat(e.target.value) }, true)}
            className="w-full accent-blue-600 mb-2.5 cursor-pointer"
            aria-label="Opacity percentage"
          />
          <div className="grid grid-cols-5 gap-1">
            {[0, 0.25, 0.5, 0.75, 1].map((val) => {
              const pct = Math.round(val * 100);
              const isSelected = Math.abs(currentOpacity - val) < 0.015;
              return (
                <button
                  key={val}
                  onClick={() => applyUpdate({ op: val })}
                  className={`py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {pct}%
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Spacing Popup (Padding & Margin) */}
      {activePopup === 'spacing' && (
        <div className="my-2 w-64 bg-white dark:bg-[#252529] rounded-2xl shadow-xl border border-gray-200/90 dark:border-gray-700/80 p-3 text-xs text-gray-700 dark:text-gray-200 animate-in fade-in zoom-in-95 duration-100">
          <div className="font-semibold text-gray-500 dark:text-gray-400 mb-2">Padding</div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-800 px-2 py-1.5 rounded-lg">
              <span className="text-gray-400 mr-2 font-medium">H</span>
              <input
                type="number"
                value={paddingH}
                onChange={(e) => applyUpdate({ paddingH: parseInt(e.target.value) || 0 })}
                className="w-full bg-transparent outline-hidden font-medium"
              />
            </div>
            <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-800 px-2 py-1.5 rounded-lg">
              <span className="text-gray-400 mr-2 font-medium">V</span>
              <input
                type="number"
                value={paddingV}
                onChange={(e) => applyUpdate({ paddingV: parseInt(e.target.value) || 0 })}
                className="w-full bg-transparent outline-hidden font-medium"
              />
            </div>
          </div>

          <div className="font-semibold text-gray-500 dark:text-gray-400 mb-2">Margin</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-800 px-2 py-1.5 rounded-lg">
              <span className="text-gray-400 mr-2 font-medium">H</span>
              <input
                type="number"
                value={marginH}
                onChange={(e) => applyUpdate({ marginH: parseInt(e.target.value) || 0 })}
                className="w-full bg-transparent outline-hidden font-medium"
              />
            </div>
            <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-800 px-2 py-1.5 rounded-lg">
              <span className="text-gray-400 mr-2 font-medium">V</span>
              <input
                type="number"
                value={marginV}
                onChange={(e) => applyUpdate({ marginV: parseInt(e.target.value) || 0 })}
                className="w-full bg-transparent outline-hidden font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* Radius Popup */}
      {activePopup === 'radius' && (
        <div className="my-2 w-64 bg-white dark:bg-[#252529] rounded-2xl shadow-xl border border-gray-200/90 dark:border-gray-700/80 p-3 text-xs text-gray-700 dark:text-gray-200 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-gray-500">Corner Radius</span>
            <span className="font-mono text-gray-400">
              {currentRadius >= 99 ? 'Pill' : `${currentRadius}px`}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="64"
            value={Math.min(64, currentRadius)}
            onChange={(e) => applyUpdate({ r: parseInt(e.target.value) || 0 })}
            className="w-full accent-blue-600 mb-2.5"
          />
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'Sharp', r: 0 },
              { label: '8px', r: 8 },
              { label: '16px', r: 16 },
              { label: 'Pill', r: 999 },
            ].map((preset) => {
              const isSelected =
                preset.r >= 99 ? currentRadius >= 99 : currentRadius === preset.r;
              return (
                <button
                  key={preset.label}
                  onClick={() => applyUpdate({ r: preset.r })}
                  className={`py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Fill Color & Gradient Popup (Solid / Linear / Radial) */}
      {activePopup === 'fill' && (
        <div className="my-2 w-64 max-w-[calc(100vw-16px)] bg-white dark:bg-[#252529] rounded-2xl shadow-xl border border-gray-200/90 dark:border-gray-700/80 p-3 text-xs text-gray-700 dark:text-gray-200 animate-in fade-in zoom-in-95 duration-100">
          {isShapeWithGradients ? (
            <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-800/90 p-1 rounded-xl mb-3">
              {(['solid', 'linear', 'radial'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFillModeTab(tab)}
                  className={`py-1 rounded-lg text-[11px] font-semibold capitalize transition-colors ${
                    fillModeTab === tab
                      ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          ) : (
            <div className="font-semibold text-gray-500 mb-2">Fill Color</div>
          )}

          {(!isShapeWithGradients || fillModeTab === 'solid') && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="color"
                  value={isValidHex(currentFill)}
                  onChange={(e) =>
                    applyUpdate({
                      fill: e.target.value,
                      gradientFill: undefined,
                      radialGradient: undefined,
                    } as any)
                  }
                  className="w-8 h-8 rounded-lg cursor-pointer border border-gray-300 dark:border-gray-600 p-0.5 bg-transparent"
                />
                <input
                  type="text"
                  value={currentFill}
                  onChange={(e) =>
                    applyUpdate({
                      fill: e.target.value,
                      gradientFill: undefined,
                      radialGradient: undefined,
                    } as any)
                  }
                  className="flex-1 bg-gray-100 dark:bg-gray-800 px-2.5 py-1.5 rounded-lg font-mono text-xs outline-hidden"
                  placeholder="#ffffff"
                />
                {onStartEyedropper && (
                  <button
                    type="button"
                    onClick={() => {
                      onStartEyedropper('fill');
                      setActivePopup(null);
                    }}
                    className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors"
                    title="Eyedropper (Pick fill color from canvas)"
                  >
                    <Pipette size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-6 gap-1.5 pt-1">
                {[
                  '#ffffff',
                  '#1f6fe0',
                  '#d93025',
                  '#1e8e3e',
                  '#f2b705',
                  '#1b1b1b',
                  '#f8fafc',
                  '#93c5fd',
                  '#fca5a5',
                  '#86efac',
                  '#fde047',
                  '#64748b',
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() =>
                      applyUpdate({
                        fill: color,
                        gradientFill: undefined,
                        radialGradient: undefined,
                      } as any)
                    }
                    className="w-6 h-6 rounded-md border border-black/10 dark:border-white/10 transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              {smartPalette.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                    Smart Palette
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {smartPalette.slice(0, 8).map((color) => (
                      <button
                        key={`ctx-sp-${color}`}
                        type="button"
                        onClick={() =>
                          applyUpdate({
                            fill: color,
                            gradientFill: undefined,
                            radialGradient: undefined,
                          } as any)
                        }
                        className="w-6 h-6 rounded-md border border-black/15 dark:border-white/15 transition-transform hover:scale-110"
                        style={{ backgroundColor: color }}
                        title={color.toUpperCase()}
                      />
                    ))}
                  </div>
                </div>
              )}
              {onRandomizePalette && (
                <button
                  type="button"
                  onClick={onRandomizePalette}
                  className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200/80 dark:border-violet-800/60 font-semibold text-[11px] hover:bg-violet-100 dark:hover:bg-violet-900/60 active:scale-[0.98] transition-all"
                  title="Replace fill colors of selected elements with a complementary palette from Smart Palette"
                >
                  <Shuffle size={13} />
                  <span>Randomize Complementary Palette</span>
                </button>
              )}
            </>
          )}

          {isShapeWithGradients && fillModeTab === 'linear' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-5 gap-1.5">
                {LINEAR_GRADIENT_PRESETS.map((preset) => {
                  const isActive = 'gradientFill' in element && element.gradientFill === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() =>
                        applyUpdate({
                          gradientFill: preset.id,
                          radialGradient: undefined,
                        } as any)
                      }
                      className={`h-9 rounded-xl border transition-transform hover:scale-105 ${
                        isActive
                          ? 'border-blue-500 ring-2 ring-blue-500/40'
                          : 'border-black/10 dark:border-white/15'
                      }`}
                      style={{ background: preset.css }}
                      title={preset.name}
                    />
                  );
                })}
              </div>
              <button
                onClick={() => applyUpdate({ gradientFill: undefined } as any)}
                className="w-full py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Use Solid Fill
              </button>
            </div>
          )}

          {isShapeWithGradients && fillModeTab === 'radial' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-6 gap-1.5">
                {RADIAL_GRADIENT_PRESETS.map((preset) => {
                  const isSelectedPreset =
                    typeof element.radialGradient === 'string' &&
                    element.radialGradient.includes(preset.id);
                  return (
                    <button
                      key={preset.id}
                      onClick={() =>
                        applyUpdate({
                          radialGradient: {
                            ...preset.spec,
                            stops: preset.spec.stops.map((s) => ({ ...s })),
                          },
                          gradientFill: undefined,
                        } as any)
                      }
                      className={`w-8 h-8 rounded-full border transition-transform hover:scale-105 ${
                        isSelectedPreset
                          ? 'border-blue-500 ring-2 ring-blue-500/40'
                          : 'border-black/10 dark:border-white/15'
                      }`}
                      style={{ background: preset.css }}
                      title={preset.name}
                    />
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                  <input
                    type="color"
                    value={isValidHex(currentRadialSpec.stops[0]?.color || '#60a5fa')}
                    onChange={(e) => {
                      const nextStops = [...(currentRadialSpec.stops || [])];
                      nextStops[0] = { offset: 0, color: e.target.value };
                      if (!nextStops[1]) nextStops[1] = { offset: 100, color: '#1e3a8a' };
                      applyUpdate({
                        radialGradient: { ...currentRadialSpec, stops: nextStops },
                        gradientFill: undefined,
                      } as any);
                    }}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <span className="text-[11px] font-medium">Inner</span>
                </label>
                <label className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                  <input
                    type="color"
                    value={isValidHex(
                      currentRadialSpec.stops[currentRadialSpec.stops.length - 1]?.color || '#1e3a8a'
                    )}
                    onChange={(e) => {
                      const nextStops = [...(currentRadialSpec.stops || [])];
                      if (!nextStops[0]) nextStops[0] = { offset: 0, color: '#60a5fa' };
                      const lastIdx = Math.max(1, nextStops.length - 1);
                      nextStops[lastIdx] = { offset: 100, color: e.target.value };
                      applyUpdate({
                        radialGradient: { ...currentRadialSpec, stops: nextStops },
                        gradientFill: undefined,
                      } as any);
                    }}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <span className="text-[11px] font-medium">Outer</span>
                </label>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-11 text-gray-400 font-medium">Center X</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={currentRadialSpec.cx ?? 50}
                    onChange={(e) =>
                      applyUpdate({
                        radialGradient: { ...currentRadialSpec, cx: parseInt(e.target.value, 10) },
                        gradientFill: undefined,
                      } as any)
                    }
                    className="flex-1 accent-blue-600"
                  />
                  <span className="w-7 text-right font-mono">{currentRadialSpec.cx ?? 50}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-11 text-gray-400 font-medium">Center Y</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={currentRadialSpec.cy ?? 50}
                    onChange={(e) =>
                      applyUpdate({
                        radialGradient: { ...currentRadialSpec, cy: parseInt(e.target.value, 10) },
                        gradientFill: undefined,
                      } as any)
                    }
                    className="flex-1 accent-blue-600"
                  />
                  <span className="w-7 text-right font-mono">{currentRadialSpec.cy ?? 50}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-11 text-gray-400 font-medium">Spread</span>
                  <input
                    type="range"
                    min="15"
                    max="120"
                    value={currentRadialSpec.r ?? 65}
                    onChange={(e) =>
                      applyUpdate({
                        radialGradient: { ...currentRadialSpec, r: parseInt(e.target.value, 10) },
                        gradientFill: undefined,
                      } as any)
                    }
                    className="flex-1 accent-blue-600"
                  />
                  <span className="w-7 text-right font-mono">{currentRadialSpec.r ?? 65}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visual Rotation Control Popup (Interactive 360° Protractor Dial + Input + Presets) */}
      {activePopup === 'rotation' && (
        <div className="my-2 w-64 max-w-[calc(100vw-16px)] bg-white dark:bg-[#252529] rounded-2xl shadow-xl border border-gray-200/90 dark:border-gray-700/80 p-3 text-xs text-gray-700 dark:text-gray-200 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Compass size={13} className="text-blue-600" />
              Rotation {isMulti ? `(${targetIds.length} items)` : ''}
            </span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
              {currentRot}°
            </span>
          </div>

          <div className="flex items-center gap-3 mb-3">
            {/* Interactive 360° Visual Dial */}
            <svg
              ref={dialRef}
              width="86"
              height="86"
              viewBox="0 0 86 86"
              className="shrink-0 touch-none cursor-grab active:cursor-grabbing select-none"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                isDialDraggingRef.current = true;
                beginScrubSnapshot();
                const rect = e.currentTarget.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                let deg = Math.round((Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90);
                if (deg > 180) deg -= 360;
                if (deg < -180) deg += 360;
                applyUpdate({ rot: deg }, true);
              }}
              onPointerMove={(e) => {
                if (!isDialDraggingRef.current) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                let deg = Math.round((Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90);
                if (deg > 180) deg -= 360;
                if (deg < -180) deg += 360;
                if (Math.abs(deg % 45) <= 2) {
                  deg = Math.round(deg / 45) * 45;
                }
                applyUpdate({ rot: deg }, true);
              }}
              onPointerUp={(e) => {
                isDialDraggingRef.current = false;
                endScrubSnapshot();
                try {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                } catch {
                  // ignore
                }
              }}
              onPointerCancel={() => {
                isDialDraggingRef.current = false;
                endScrubSnapshot();
              }}
            >
              <circle
                cx="43"
                cy="43"
                r="36"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.16"
                strokeWidth="2"
              />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
                const rad = ((a - 90) * Math.PI) / 180;
                const x1 = 43 + Math.cos(rad) * 31;
                const y1 = 43 + Math.sin(rad) * 31;
                const x2 = 43 + Math.cos(rad) * 37;
                const y2 = 43 + Math.sin(rad) * 37;
                return (
                  <line
                    key={a}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeOpacity={a % 90 === 0 ? 0.45 : 0.22}
                    strokeWidth={a % 90 === 0 ? 1.8 : 1.1}
                  />
                );
              })}
              {(() => {
                const rad = ((currentRot - 90) * Math.PI) / 180;
                const kx = 43 + Math.cos(rad) * 28;
                const ky = 43 + Math.sin(rad) * 28;
                return (
                  <>
                    <line
                      x1="43"
                      y1="43"
                      x2={kx}
                      y2={ky}
                      stroke="#2563eb"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    <circle cx="43" cy="43" r="3" fill="#2563eb" />
                    <circle cx={kx} cy={ky} r="5.5" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
                  </>
                );
              })()}
            </svg>

            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2.5 py-1.5 rounded-xl">
                <input
                  type="number"
                  min="-360"
                  max="360"
                  value={rotDraft}
                  onChange={(e) => {
                    setRotDraft(e.target.value);
                    const parsed = parseFloat(e.target.value);
                    if (!Number.isNaN(parsed)) {
                      applyUpdate({ rot: Math.max(-360, Math.min(360, parsed)) }, true);
                    }
                  }}
                  onFocus={() => beginScrubSnapshot()}
                  onBlur={() => {
                    endScrubSnapshot();
                    setRotDraft(String(Math.round(currentRot)));
                  }}
                  className="w-full bg-transparent font-mono font-semibold text-xs outline-hidden"
                  aria-label="Rotation degrees"
                />
                <span className="text-gray-400 font-mono">deg</span>
              </div>

              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={Math.max(-180, Math.min(180, currentRot > 180 ? currentRot - 360 : currentRot))}
                onPointerDown={beginScrubSnapshot}
                onPointerUp={endScrubSnapshot}
                onPointerCancel={endScrubSnapshot}
                onChange={(e) => applyUpdate({ rot: parseInt(e.target.value, 10) }, true)}
                className="w-full accent-blue-600 cursor-pointer"
                aria-label="Rotation angle slider"
              />
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1">
            {[-90, -45, 0, 45, 90].map((angle) => {
              const isSelected = Math.round(currentRot) === angle;
              return (
                <button
                  key={angle}
                  type="button"
                  onClick={() => applyUpdate({ rot: angle })}
                  className={`py-1 rounded-lg text-[11px] font-mono font-semibold transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {angle}°
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Shadows Preset & Continuous Intensity Popup */}
      {activePopup === 'shadow' && (
        <div className="my-2 w-64 max-w-[calc(100vw-16px)] bg-white dark:bg-[#252529] rounded-2xl shadow-xl border border-gray-200/90 dark:border-gray-700/80 p-3 text-xs text-gray-700 dark:text-gray-200 animate-in fade-in zoom-in-95 duration-100 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-500">Drop Shadow</span>
            <button
              type="button"
              onClick={() =>
                applyUpdate({
                  sh: !isShadowEnabled,
                  shadowStyle: !isShadowEnabled ? 'soft' : 'none',
                  shadowIntensity: !isShadowEnabled ? currentShadowIntensity || 14 : 0,
                })
              }
              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-colors ${
                isShadowEnabled
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-transparent'
              }`}
            >
              {isShadowEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {(
              [
                { id: 'none', label: 'None', sh: false, intensity: 0 },
                { id: 'subtle', label: 'Subtle', sh: true, intensity: 6 },
                { id: 'soft', label: 'Soft', sh: true, intensity: 14 },
                { id: 'heavy', label: 'Heavy', sh: true, intensity: 26 },
              ] as const
            ).map((preset) => {
              const activeShadow = !isShadowEnabled
                ? 'none'
                : element.shadowStyle && element.shadowStyle !== 'none'
                ? element.shadowStyle
                : currentShadowIntensity >= 20
                ? 'heavy'
                : currentShadowIntensity <= 8
                ? 'subtle'
                : 'soft';
              const isSelected = activeShadow === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() =>
                    applyUpdate({
                      sh: preset.sh,
                      shadowStyle: preset.id,
                      shadowIntensity: preset.intensity,
                    })
                  }
                  className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {isShadowEnabled && (
            <div className="pt-1 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-gray-500 font-medium">Shadow Intensity</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {Math.round(currentShadowIntensity)}px
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="40"
                step="1"
                value={currentShadowIntensity}
                onPointerDown={beginScrubSnapshot}
                onPointerUp={endScrubSnapshot}
                onPointerCancel={endScrubSnapshot}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  const styleTier: 'subtle' | 'soft' | 'heavy' =
                    val <= 9 ? 'subtle' : val >= 20 ? 'heavy' : 'soft';
                  applyUpdate(
                    {
                      sh: true,
                      shadowIntensity: val,
                      shadowStyle: styleTier,
                    },
                    true
                  );
                }}
                className="w-full accent-blue-600 cursor-pointer"
                aria-label="Shadow intensity"
              />
            </div>
          )}
        </div>
      )}

      {/* Layer Order Sub-menu Popup */}
      {activePopup === 'layers' && (
        <div className="my-2 w-56 bg-white dark:bg-[#252529] rounded-2xl shadow-xl border border-gray-200/90 dark:border-gray-700/80 p-2 text-xs text-gray-700 dark:text-gray-200 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Layer Order
          </div>
          <button
            onClick={() => {
              setActivePopup(null);
              onBringToFront(element.id);
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
          >
            <span className="flex items-center gap-2 font-medium">
              <ChevronsUp size={15} className="text-blue-500" />
              Bring to Front
            </span>
            <kbd className="text-[10px] font-mono text-gray-400">⌘⇧]</kbd>
          </button>
          <button
            onClick={() => onBringForward(element.id)}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
          >
            <span className="flex items-center gap-2 font-medium">
              <ArrowUp size={15} className="text-gray-500" />
              Move Forward
            </span>
            <kbd className="text-[10px] font-mono text-gray-400">⌘]</kbd>
          </button>
          <button
            onClick={() => onSendBackward(element.id)}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
          >
            <span className="flex items-center gap-2 font-medium">
              <ArrowDown size={15} className="text-gray-500" />
              Move Backward
            </span>
            <kbd className="text-[10px] font-mono text-gray-400">⌘[</kbd>
          </button>
          <button
            onClick={() => {
              setActivePopup(null);
              onSendToBack(element.id);
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
          >
            <span className="flex items-center gap-2 font-medium">
              <ChevronsDown size={15} className="text-indigo-500" />
              Send to Back
            </span>
            <kbd className="text-[10px] font-mono text-gray-400">⌘⇧[</kbd>
          </button>
        </div>
      )}

      {/* Alignment and Distribution Popup */}
      {activePopup === 'align' && (
        <div className="my-2 w-72 max-w-[calc(100vw-16px)] bg-white dark:bg-[#252529] rounded-2xl shadow-xl border border-gray-200/90 dark:border-gray-700/80 p-3 text-xs text-gray-700 dark:text-gray-200 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-gray-500 dark:text-gray-400">Alignment</span>
            <span className="text-[10px] text-gray-400">
              {selectedElements.length > 1
                ? `${selectedElements.length} items`
                : 'Within artboard'}
            </span>
          </div>

          <div className="grid grid-cols-6 gap-1 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl mb-3">
            <button
              onClick={() => onAlign && onAlign('left')}
              className="p-2 flex flex-col items-center justify-center rounded-lg hover:bg-white dark:hover:bg-gray-700 hover:text-blue-600 transition-colors"
              title="Align Left"
            >
              <AlignLeft size={16} />
            </button>
            <button
              onClick={() => onAlign && onAlign('center')}
              className="p-2 flex flex-col items-center justify-center rounded-lg hover:bg-white dark:hover:bg-gray-700 hover:text-blue-600 transition-colors"
              title="Align Horizontal Center"
            >
              <AlignCenterHorizontal size={16} />
            </button>
            <button
              onClick={() => onAlign && onAlign('right')}
              className="p-2 flex flex-col items-center justify-center rounded-lg hover:bg-white dark:hover:bg-gray-700 hover:text-blue-600 transition-colors"
              title="Align Right"
            >
              <AlignRight size={16} />
            </button>
            <button
              onClick={() => onAlign && onAlign('top')}
              className="p-2 flex flex-col items-center justify-center rounded-lg hover:bg-white dark:hover:bg-gray-700 hover:text-blue-600 transition-colors"
              title="Align Top"
            >
              <AlignStartVertical size={16} />
            </button>
            <button
              onClick={() => onAlign && onAlign('middle')}
              className="p-2 flex flex-col items-center justify-center rounded-lg hover:bg-white dark:hover:bg-gray-700 hover:text-blue-600 transition-colors"
              title="Align Vertical Middle"
            >
              <AlignCenterVertical size={16} />
            </button>
            <button
              onClick={() => onAlign && onAlign('bottom')}
              className="p-2 flex flex-col items-center justify-center rounded-lg hover:bg-white dark:hover:bg-gray-700 hover:text-blue-600 transition-colors"
              title="Align Bottom"
            >
              <AlignEndVertical size={16} />
            </button>
          </div>

          <div className="font-semibold text-gray-500 dark:text-gray-400 mb-2">
            Distribute Spacing
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onDistribute && onDistribute('horizontal')}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 font-medium transition-colors"
              title="Distribute Horizontally"
            >
              <AlignHorizontalDistributeCenter size={15} />
              <span>Horizontal</span>
            </button>
            <button
              onClick={() => onDistribute && onDistribute('vertical')}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 font-medium transition-colors"
              title="Distribute Vertically"
            >
              <AlignVerticalDistributeCenter size={15} />
              <span>Vertical</span>
            </button>
          </div>
        </div>
      )}

      {/* More actions dropdown with Layer Order sub-menu */}
      {activePopup === 'more' && (
        <div className="my-2 w-52 max-h-[55vh] overflow-y-auto touch-pan-y bg-white dark:bg-[#252529] rounded-2xl shadow-xl border border-gray-200/90 dark:border-gray-700/80 p-1.5 text-xs text-gray-700 dark:text-gray-200 animate-in fade-in zoom-in-95 duration-100">
          {isTextLike && onEditText && (
            <button
              onClick={() => {
                setActivePopup(null);
                onEditText(element);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <Type size={15} className="text-gray-500" />
              <span>Edit text</span>
            </button>
          )}

          {element.t === 'artboard' && onSelectArtboardChildren && (
            <button
              onClick={() => {
                setActivePopup(null);
                onSelectArtboardChildren(element.id);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <BoxSelect size={15} className="text-blue-500" />
              <span>Select items inside</span>
            </button>
          )}

          {isImage && onUploadImage && (
            <button
              onClick={() => {
                setActivePopup(null);
                onUploadImage();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <Sparkles size={15} className="text-blue-500" />
              <span>Replace image</span>
            </button>
          )}

          <button
            onClick={() => {
              applyUpdate({ rot: ((element.rot || 0) + 90) % 360 });
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
          >
            <RotateCw size={15} className="text-gray-500" />
            <span>Rotate 90°</span>
          </button>

          <div className="grid grid-cols-2 gap-1 px-1 py-0.5">
            <button
              onClick={() => applyUpdate({ flipX: !element.flipX })}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl transition-colors ${
                element.flipX
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <FlipHorizontal2 size={14} />
              <span>Flip H</span>
            </button>
            <button
              onClick={() => applyUpdate({ flipY: !element.flipY })}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl transition-colors ${
                element.flipY
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <FlipVertical2 size={14} />
              <span>Flip V</span>
            </button>
          </div>

          {onCopyStyle && (
            <button
              onClick={() => {
                setActivePopup(null);
                onCopyStyle(element);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <Paintbrush size={15} className="text-blue-500" />
              <span>Copy Style</span>
            </button>
          )}

          {canPasteStyle && onPasteStyle && (
            <button
              onClick={() => {
                setActivePopup(null);
                onPasteStyle();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors text-left font-medium"
            >
              <ClipboardPaste size={15} />
              <span>Paste Style</span>
            </button>
          )}

          <button
            onClick={() => {
              setActivePopup(null);
              applyUpdate({ locked: !isLocked });
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
          >
            {isLocked ? (
              <Unlock size={15} className="text-amber-500" />
            ) : (
              <Lock size={15} className="text-gray-500" />
            )}
            <span>{isLocked ? 'Unlock layer' : 'Lock layer'}</span>
          </button>

          <button
            onClick={() => {
              setActivePopup(null);
              onDuplicate(element.id);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
          >
            <Copy size={15} className="text-gray-500" />
            <span>{isMulti ? `Duplicate (${targetIds.length})` : 'Duplicate'}</span>
          </button>

          {/* Expandable Layer Order Sub-Menu */}
          <div>
            <button
              onClick={() => setShowLayerSubmenu((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <span className="flex items-center gap-2.5">
                <Layers size={15} className="text-gray-500" />
                <span>Layer Order</span>
              </span>
              <ChevronRight
                size={14}
                className={`text-gray-400 transition-transform ${
                  showLayerSubmenu ? 'rotate-90' : ''
                }`}
              />
            </button>
            {showLayerSubmenu && (
              <div className="ml-3 pl-2 my-1 border-l-2 border-gray-100 dark:border-gray-800 space-y-0.5">
                <button
                  onClick={() => {
                    setActivePopup(null);
                    onBringToFront(element.id);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                >
                  <ChevronsUp size={14} className="text-blue-500" />
                  <span>Bring to Front</span>
                </button>
                <button
                  onClick={() => onBringForward(element.id)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                >
                  <ArrowUp size={14} className="text-gray-500" />
                  <span>Move Forward</span>
                </button>
                <button
                  onClick={() => onSendBackward(element.id)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                >
                  <ArrowDown size={14} className="text-gray-500" />
                  <span>Move Backward</span>
                </button>
                <button
                  onClick={() => {
                    setActivePopup(null);
                    onSendToBack(element.id);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                >
                  <ChevronsDown size={14} className="text-indigo-500" />
                  <span>Send to Back</span>
                </button>
              </div>
            )}
          </div>

          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
          <button
            onClick={() => {
              setActivePopup(null);
              onDelete(element.id);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 transition-colors text-left"
          >
            <Trash2 size={15} />
            <span>{isMulti ? `Delete (${targetIds.length})` : 'Delete'}</span>
          </button>
        </div>
      )}

      {/* Contextual Floating Bar Stack */}
      <div className="flex flex-col items-center gap-1.5 max-w-[96vw]">
        {/* Contextual 'Snap to Nearest Artboard' Banner (auto-highlights when a group is dragged near an artboard's edge) */}
        {element.t !== 'artboard' &&
          nearestArtboardName &&
          onSnapToNearestArtboard &&
          (autoSnappedArtboard ||
            isNearArtboardEdge ||
            isMulti ||
            Boolean(element.groupId)) && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl shadow-lg border backdrop-blur-md text-[11px] font-semibold transition-all animate-in fade-in duration-100 ${
                autoSnappedArtboard
                  ? 'bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                  : isNearArtboardEdge
                  ? 'bg-cyan-50/95 dark:bg-cyan-950/90 border-cyan-300 dark:border-cyan-700 text-cyan-800 dark:text-cyan-200'
                  : 'bg-white/95 dark:bg-[#252529]/95 border-gray-200/90 dark:border-gray-700/80 text-gray-700 dark:text-gray-200'
              }`}
            >
              <Magnet
                size={13}
                className={
                  autoSnappedArtboard
                    ? 'text-emerald-600 dark:text-emerald-400 shrink-0'
                    : 'text-cyan-600 dark:text-cyan-400 shrink-0'
                }
              />
              <button
                type="button"
                onClick={() => onSnapToNearestArtboard('edge')}
                className="flex items-center gap-1 hover:underline whitespace-nowrap"
                title={`Snap selection to ${nearestArtboardName} edge`}
              >
                <Frame size={12} className="shrink-0 opacity-75" />
                <span>
                  {autoSnappedArtboard
                    ? `Snapped → ${autoSnappedArtboard.artboardName}`
                    : `Snap to ${nearestArtboardName}`}
                </span>
              </button>
              <div className="flex items-center gap-0.5 pl-1 border-l border-current/20">
                <button
                  type="button"
                  onClick={() => onSnapToNearestArtboard('inset')}
                  className="px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 hover:bg-blue-600 hover:text-white text-[10px] font-semibold transition-colors"
                  title="Snap neatly inside nearest artboard (16px padding)"
                >
                  Inset
                </button>
                <button
                  type="button"
                  onClick={() => onSnapToNearestArtboard('center')}
                  className="px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 hover:bg-blue-600 hover:text-white text-[10px] font-semibold transition-colors"
                  title="Center inside nearest artboard"
                >
                  Center
                </button>
              </div>
            </div>
          )}

        {/* Primary Floating Toolbar Bar (multi-row flex-wrap so ALL tools stay visible cleanly) */}
        <div className="flex flex-wrap items-center justify-center bg-white/95 dark:bg-[#252529]/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/90 dark:border-gray-700/80 px-1.5 sm:px-2 py-1 gap-0.5 sm:gap-1 shrink-0">
        {/* Quick Unlock badge when locked */}
        {isLocked && (
          <button
            onClick={() => applyUpdate({ locked: false })}
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold shrink-0"
            title="Unlock selected element(s)"
          >
            <Lock size={13} />
            <span>Locked</span>
          </button>
        )}

        {/* Fill color / Gradient */}
        {!isLine && (
          <button
            onClick={() => setActivePopup(activePopup === 'fill' ? null : 'fill')}
            className={`p-1.5 rounded-xl transition-all shrink-0 ${
              activePopup === 'fill'
                ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="Fill Color & Gradients"
          >
            <div
              className="w-5 h-5 rounded-md border border-gray-300 dark:border-gray-600 shadow-2xs"
              style={{ background: currentFillPreviewBg }}
            />
          </button>
        )}

        {/* Path Smooth Curve Toggle */}
        {element.t === 'path' && (
          <button
            onClick={() => applyUpdate({ smooth: element.smooth === false ? true : false } as any)}
            className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-semibold transition-all shrink-0 ${
              element.smooth !== false
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 ring-1 ring-blue-500/40'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="Toggle Smooth Vector Curve"
          >
            <Spline size={14} />
            <span>{element.smooth !== false ? 'Smooth' : 'Raw'}</span>
          </button>
        )}

        {/* Stroke / Border */}
        <button
          onClick={() => setActivePopup(activePopup === 'stroke' ? null : 'stroke')}
          className={`p-1.5 rounded-xl text-gray-700 dark:text-gray-200 transition-all shrink-0 ${
            activePopup === 'stroke'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 ring-1 ring-blue-500'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title="Stroke & Border"
        >
          <div className="flex flex-col gap-[3px] p-0.5">
            <span className="w-4 h-[2px] bg-current rounded-full" />
            <span className="w-4 h-[2px] bg-current rounded-full" />
            <span className="w-4 h-[2px] bg-current rounded-full" />
          </div>
        </button>

        {/* Inline Opacity Quick Slider (adjusts `op` directly without opening Properties sheet) */}
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-xl bg-gray-100/90 dark:bg-gray-800/80 transition-all shrink-0 ${
            activePopup === 'opacity' ? 'ring-1 ring-blue-500' : ''
          }`}
          title="Layer Opacity (0% - 100%)"
        >
          <button
            type="button"
            onClick={() => setActivePopup(activePopup === 'opacity' ? null : 'opacity')}
            className="flex items-center gap-1 text-[11px] font-mono font-semibold text-gray-700 dark:text-gray-200 hover:text-blue-600 shrink-0"
            title="Open Opacity presets"
          >
            <span className="w-3 h-3 rounded-full border border-current bg-gradient-to-tr from-current/90 to-transparent inline-block shrink-0" />
            <span className="w-8 text-right">{Math.round(currentOpacity * 100)}%</span>
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={currentOpacity}
            onPointerDown={beginScrubSnapshot}
            onPointerUp={endScrubSnapshot}
            onPointerCancel={endScrubSnapshot}
            onChange={(e) => applyUpdate({ op: parseFloat(e.target.value) }, true)}
            className="w-14 sm:w-16 accent-blue-600 cursor-pointer"
            aria-label="Quick opacity slider"
          />
        </div>

        {/* Inline Visual Rotation Control + Direct Degree Input (`rot`) */}
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-xl bg-gray-100/90 dark:bg-gray-800/80 transition-all shrink-0 ${
            activePopup === 'rotation' ? 'ring-1 ring-blue-500' : ''
          }`}
          title="Rotation Angle (Type degrees or tap dial)"
        >
          <button
            type="button"
            onClick={() => setActivePopup(activePopup === 'rotation' ? null : 'rotation')}
            className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors shrink-0"
            title="Open Visual Rotation Dial"
            aria-label="Visual rotation dial"
          >
            <svg width="15" height="15" viewBox="0 0 20 20" className="overflow-visible">
              <circle
                cx="10"
                cy="10"
                r="7.5"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="1.6"
              />
              <line
                x1="10"
                y1="10"
                x2="10"
                y2="3"
                stroke="#2563eb"
                strokeWidth="2"
                strokeLinecap="round"
                transform={`rotate(${currentRot} 10 10)`}
              />
              <circle cx="10" cy="10" r="1.6" fill="#2563eb" />
            </svg>
          </button>
          <input
            type="number"
            min="-360"
            max="360"
            value={rotDraft}
            onFocus={() => beginScrubSnapshot()}
            onChange={(e) => {
              setRotDraft(e.target.value);
              const parsed = parseFloat(e.target.value);
              if (!Number.isNaN(parsed)) {
                applyUpdate({ rot: Math.max(-360, Math.min(360, parsed)) }, true);
              }
            }}
            onBlur={() => {
              endScrubSnapshot();
              setRotDraft(String(Math.round(currentRot)));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-9 bg-transparent text-[11px] font-mono font-semibold text-gray-800 dark:text-gray-100 text-right outline-hidden"
            aria-label="Rotation angle input"
          />
          <span className="text-[10px] font-mono text-gray-400 -ml-0.5">°</span>
        </div>

        {/* Inline Shadow Toggle + `shadowIntensity` Slider when `sh` is enabled */}
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-xl transition-all shrink-0 ${
            isShadowEnabled
              ? 'bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <button
            type="button"
            onClick={() => setActivePopup(activePopup === 'shadow' ? null : 'shadow')}
            className={`p-1 rounded-lg transition-colors ${
              activePopup === 'shadow' || isShadowEnabled
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-200'
            }`}
            title={
              isShadowEnabled
                ? `Drop Shadow On (${Math.round(currentShadowIntensity)}px) · Tap for presets`
                : 'Drop Shadow Off · Tap to configure'
            }
          >
            <div className="w-3.5 h-3.5 rounded-full border border-current flex overflow-hidden">
              <span className="w-1/2 h-full bg-current" />
            </div>
          </button>
          {isShadowEnabled && (
            <>
              <input
                type="range"
                min="1"
                max="40"
                step="1"
                value={currentShadowIntensity}
                onPointerDown={beginScrubSnapshot}
                onPointerUp={endScrubSnapshot}
                onPointerCancel={endScrubSnapshot}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  const styleTier: 'subtle' | 'soft' | 'heavy' =
                    val <= 9 ? 'subtle' : val >= 20 ? 'heavy' : 'soft';
                  applyUpdate(
                    {
                      sh: true,
                      shadowIntensity: val,
                      shadowStyle: styleTier,
                    },
                    true
                  );
                }}
                className="w-14 sm:w-16 accent-blue-600 cursor-pointer"
                title={`Shadow Intensity: ${Math.round(currentShadowIntensity)}px`}
                aria-label="Shadow intensity slider"
              />
              <span className="text-[10px] font-mono font-semibold text-blue-600 dark:text-blue-400 w-5 text-right">
                {Math.round(currentShadowIntensity)}
              </span>
            </>
          )}
        </div>

        {/* Quick Typography Controls for Text & Note */}
        {isTextLike && !isMulti && (
          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800/80 p-0.5 rounded-xl shrink-0">
            <button
              onClick={() => {
                const curFs = 'fs' in element ? element.fs : 16;
                applyUpdate({ fs: Math.max(8, curFs - 2) } as any);
              }}
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              title="Decrease font size"
            >
              <Minus size={12} />
            </button>
            <span className="px-1 text-[11px] font-mono font-semibold text-gray-700 dark:text-gray-200">
              {'fs' in element ? element.fs : 16}
            </span>
            <button
              onClick={() => {
                const curFs = 'fs' in element ? element.fs : 16;
                applyUpdate({ fs: Math.min(120, curFs + 2) } as any);
              }}
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              title="Increase font size"
            >
              <Plus size={12} />
            </button>
            {element.t === 'text' && (
              <>
                <button
                  onClick={() => {
                    const isBold = (element.fw ?? (element.b ? 700 : 400)) >= 600;
                    applyUpdate({ b: !isBold, fw: !isBold ? 700 : 400 } as any);
                  }}
                  className={`p-1 rounded-lg transition-colors ${
                    (element.fw ?? (element.b ? 700 : 400)) >= 600
                      ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                  title="Bold"
                >
                  <Bold size={13} />
                </button>
                <button
                  onClick={() => applyUpdate({ it: !element.it } as any)}
                  className={`p-1 rounded-lg transition-colors ${
                    element.it
                      ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                  title="Italic"
                >
                  <Italic size={13} />
                </button>
                <div className="w-[1px] h-3 bg-gray-300 dark:bg-gray-600 mx-0.5" />
                <button
                  onClick={() => applyUpdate({ align: 'left' } as any)}
                  className={`p-1 rounded-lg transition-colors ${
                    (element.align || 'left') === 'left'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                  title="Text Left"
                >
                  <AlignLeft size={13} />
                </button>
                <button
                  onClick={() => applyUpdate({ align: 'center' } as any)}
                  className={`p-1 rounded-lg transition-colors ${
                    element.align === 'center'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                  title="Text Center"
                >
                  <AlignCenter size={13} />
                </button>
                <button
                  onClick={() => applyUpdate({ align: 'right' } as any)}
                  className={`p-1 rounded-lg transition-colors ${
                    element.align === 'right'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                  title="Text Right"
                >
                  <AlignRight size={13} />
                </button>
                <button
                  onClick={() => {
                    const txt = element.text;
                    const isAllUpper = txt === txt.toUpperCase() && txt !== txt.toLowerCase();
                    const nextTxt = isAllUpper
                      ? txt.toLowerCase()
                      : txt.toUpperCase();
                    applyUpdate({ text: nextTxt } as any);
                  }}
                  className="p-1 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-700 transition-colors"
                  title="Toggle Uppercase / Lowercase"
                >
                  <CaseSensitive size={14} />
                </button>
              </>
            )}
          </div>
        )}

        {/* Corner Radius */}
        {(element.t === 'rect' || element.t === 'image' || element.t === 'artboard') && (
          <button
            onClick={() => setActivePopup(activePopup === 'radius' ? null : 'radius')}
            className={`p-1.5 rounded-xl text-gray-700 dark:text-gray-200 transition-all shrink-0 ${
              activePopup === 'radius'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 ring-1 ring-blue-500'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="Corner Radius"
          >
            <CornerUpRight size={17} strokeWidth={2.2} />
          </button>
        )}

        {/* Spacing */}
        {element.t === 'rect' && (
          <button
            onClick={() => setActivePopup(activePopup === 'spacing' ? null : 'spacing')}
            className={`p-1.5 rounded-xl text-gray-700 dark:text-gray-200 transition-all shrink-0 ${
              activePopup === 'spacing'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 ring-1 ring-blue-500'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="Padding & Spacing"
          >
            <div className="w-4 h-4 border border-current rounded-sm flex items-center justify-center p-0.5">
              <span className="w-1.5 h-1.5 bg-current rounded-2xs" />
            </div>
          </button>
        )}

        {/* Eyedropper Color Picker */}
        {onStartEyedropper && (
          <button
            onClick={() => {
              setActivePopup(null);
              onStartEyedropper(isLine ? 'stroke' : 'fill');
            }}
            className="p-1.5 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all shrink-0"
            title="Eyedropper (Pick color from canvas) [I]"
          >
            <Pipette size={17} strokeWidth={2.2} />
          </button>
        )}

        {/* Quick Alignment & Distribution Icons (always accessible cleanly) */}
        {selectedElements.length > 1 && onAlign ? (
          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800/80 p-0.5 rounded-xl shrink-0">
            <button
              onClick={() => onAlign('left')}
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors"
              title="Align Left"
            >
              <AlignLeft size={14} />
            </button>
            <button
              onClick={() => onAlign('center')}
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors"
              title="Align Center (Horizontal)"
            >
              <AlignCenterHorizontal size={14} />
            </button>
            <button
              onClick={() => onAlign('right')}
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors"
              title="Align Right"
            >
              <AlignRight size={14} />
            </button>
            <button
              onClick={() => onAlign('top')}
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors"
              title="Align Top"
            >
              <AlignStartVertical size={14} />
            </button>
            <button
              onClick={() => onAlign('middle')}
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors"
              title="Align Middle (Vertical)"
            >
              <AlignCenterVertical size={14} />
            </button>
            <button
              onClick={() => onAlign('bottom')}
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors"
              title="Align Bottom"
            >
              <AlignEndVertical size={14} />
            </button>
            {onDistribute && (
              <>
                <div className="w-[1px] h-3.5 bg-gray-300 dark:bg-gray-600 mx-0.5" />
                <button
                  onClick={() => onDistribute('horizontal')}
                  className="p-1 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors"
                  title="Distribute Horizontally (Equal horizontal spacing)"
                >
                  <AlignHorizontalDistributeCenter size={14} />
                </button>
                <button
                  onClick={() => onDistribute('vertical')}
                  className="p-1 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors"
                  title="Distribute Vertically (Equal vertical spacing)"
                >
                  <AlignVerticalDistributeCenter size={14} />
                </button>
              </>
            )}
          </div>
        ) : (
          (onAlign || onDistribute) && (
            <button
              onClick={() => setActivePopup(activePopup === 'align' ? null : 'align')}
              className={`p-1.5 rounded-xl transition-all shrink-0 ${
                activePopup === 'align'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 ring-1 ring-blue-500'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="Align to Artboard (Left, Center, Right, Top, Middle, Bottom)"
            >
              <AlignCenterHorizontal size={17} strokeWidth={2.2} />
            </button>
          )
        )}

        {/* Group / Ungroup buttons */}
        {selectedElements.length > 1 && onGroup && (
          <button
            onClick={onGroup}
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-semibold text-xs transition-all hover:bg-blue-100 shrink-0"
            title="Group Selected Elements (Ctrl/Cmd + G)"
          >
            <GroupIcon size={15} />
            <span>Group ({selectedElements.length})</span>
          </button>
        )}

        {(isGroup || element.t === 'group' || element.groupId) && onUngroup && (
          <button
            onClick={onUngroup}
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 font-semibold text-xs transition-all hover:bg-purple-100 shrink-0"
            title="Ungroup Elements (Ctrl/Cmd + Shift + G)"
          >
            <UngroupIcon size={15} />
            <span>Ungroup</span>
          </button>
        )}

        {/* Dedicated Layer Order Sub-menu Button */}
        <button
          onClick={() => setActivePopup(activePopup === 'layers' ? null : 'layers')}
          className={`p-1.5 rounded-xl text-gray-700 dark:text-gray-200 transition-all shrink-0 ${
            activePopup === 'layers'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 ring-1 ring-blue-500'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title="Layer Order (Move Forward / Backward / Front / Back)"
        >
          <Layers size={17} strokeWidth={2.2} />
        </button>

        {/* Divider */}
        <div className="w-[1px] h-4 bg-gray-200 dark:bg-gray-700 mx-0.5 shrink-0" />

        {/* More actions */}
        <button
          onClick={() => {
            setShowLayerSubmenu(false);
            setActivePopup(activePopup === 'more' ? null : 'more');
          }}
          className={`p-1.5 rounded-xl text-gray-700 dark:text-gray-200 transition-all shrink-0 ${
            activePopup === 'more'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 ring-1 ring-blue-500'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title="More actions"
        >
          <MoreHorizontal size={17} strokeWidth={2.2} />
        </button>
        </div>
      </div>
    </div>
  );
};
