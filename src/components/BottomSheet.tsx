import React, { useMemo, useState } from 'react';
import {
  X,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Check,
  Layers,
  Link2,
  Link2Off,
  RotateCw,
  Search,
  FlipHorizontal2,
  FlipVertical2,
  Spline,
  SlidersHorizontal,
  GripVertical,
  MousePointer2,
  LassoSelect,
  ArrowUp,
  ArrowDown,
  Magnet,
  Type as TypeIcon,
  Smartphone,
  Monitor,
  Palette,
  Sparkles,
  QrCode,
  History,
  Vibrate,
  Shuffle,
} from 'lucide-react';
import { BlendModeType, CanvasElement, Page, ProjectState, SelectionMode } from '../types';
import { hapticDrop } from '../utils/haptics';
import {
  generateElementDebugJson,
  generateHtmlDocument,
  generateArtboardSvgs,
  downloadFile,
} from '../utils/export';
import { FONT_FAMILIES, RADIAL_GRADIENT_PRESETS } from '../utils/helpers';

export type BottomSheetTab = 'Properties' | 'Outline' | 'Code' | 'Tweaks';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedElement: CanvasElement | null;
  currentPage: Page;
  project: ProjectState;
  pageIndex: number;
  layoutGuides: boolean;
  snapGrid: boolean;
  smartSnap: boolean;
  hapticsEnabled?: boolean;
  onToggleHaptics?: () => void;
  versionCount?: number;
  onOpenVersionHistory?: () => void;
  selectionMode: SelectionMode;
  onChangeSelectionMode: (mode: SelectionMode) => void;
  onToggleLayoutGuides: () => void;
  onToggleSnapGrid: () => void;
  onToggleSmartSnap: () => void;
  onFitArtboards: () => void;
  onSelectElement: (id: number | null) => void;
  onToggleSelectId?: (id: number) => void;
  onSelectMultiple?: (ids: number[]) => void;
  onUpdateElement: (id: number, updates: Partial<CanvasElement>) => void;
  onUpdateElements?: (ids: number[], updates: Partial<CanvasElement>) => void;
  onDeleteElement: (id: number) => void;
  onReorderLayers: (draggedId: number, targetId: number, position: 'before' | 'after') => void;
  onMoveLayerStep?: (id: number, direction: 'forward' | 'backward') => void;
  onSnapshot?: () => void;
  selectedElements?: CanvasElement[];
  activeTabOverride?: BottomSheetTab;
  onTabChange?: (tab: BottomSheetTab) => void;
  smartPalette?: string[];
  onExtractImagePalette?: (elementId: number) => void;
  onClearSmartPalette?: () => void;
  onRandomizePalette?: () => void;
  onAutoLayout?: (
    direction: 'none' | 'vertical' | 'horizontal',
    gap?: number,
    padding?: number,
    align?: 'start' | 'center' | 'end'
  ) => void;
}

type TabType = BottomSheetTab;

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  selectedElement,
  currentPage,
  project,
  pageIndex,
  layoutGuides,
  snapGrid,
  smartSnap,
  hapticsEnabled = true,
  onToggleHaptics,
  versionCount = 0,
  onOpenVersionHistory,
  selectionMode,
  onChangeSelectionMode,
  onToggleLayoutGuides,
  onToggleSnapGrid,
  onToggleSmartSnap,
  onFitArtboards,
  onSelectElement,
  onToggleSelectId,
  onSelectMultiple,
  onUpdateElement,
  onUpdateElements,
  onDeleteElement,
  onReorderLayers,
  onMoveLayerStep,
  onSnapshot,
  selectedElements = [],
  activeTabOverride,
  onTabChange,
  smartPalette = [],
  onExtractImagePalette,
  onClearSmartPalette,
  onRandomizePalette,
  onAutoLayout,
}) => {
  const [internalTab, setInternalTab] = useState<TabType>('Properties');
  const activeTab = activeTabOverride ?? internalTab;
  const setActiveTab = (tab: TabType) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  const [isExportExpanded, setIsExportExpanded] = useState(false);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSvg, setCopiedSvg] = useState(false);
  const [layerQuery, setLayerQuery] = useState('');
  const [paletteApplyTarget, setPaletteApplyTarget] = useState<'fill' | 'stroke'>('fill');

  // Lazy-compute full HTML document ONLY when Code tab is open so canvas drags stay 60fps
  const htmlCode = useMemo(() => {
    if (!isOpen || activeTab !== 'Code') return '';
    return generateHtmlDocument(project, pageIndex);
  }, [isOpen, activeTab, project, pageIndex]);

  // Pointer-event drag-and-drop state for Layers list (works seamlessly on Android/iOS touch & desktop mouse)
  const [dragState, setDragState] = useState<{
    dragId: number;
    overId: number | null;
    position: 'before' | 'after';
  } | null>(null);
  const dragStateRef = React.useRef(dragState);
  dragStateRef.current = dragState;
  const rowRefs = React.useRef<Record<number, HTMLDivElement | null>>({});

  React.useEffect(() => {
    if (!dragState) return;
    const handlePointerMove = (e: PointerEvent) => {
      const entries = Object.entries(rowRefs.current).filter(
        ([, el]) => el !== null && el.isConnected
      ) as [string, HTMLDivElement][];
      let matchedId: number | null = null;
      let matchedPos: 'before' | 'after' = 'before';
      for (const [idStr, el] of entries) {
        const rect = el.getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
          matchedId = Number(idStr);
          matchedPos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
          break;
        }
      }
      if (matchedId !== null) {
        setDragState((prev) =>
          prev && (prev.overId !== matchedId || prev.position !== matchedPos)
            ? { ...prev, overId: matchedId, position: matchedPos }
            : prev
        );
      }
    };
    const handlePointerUp = () => {
      const current = dragStateRef.current;
      if (current && current.overId !== null && current.overId !== current.dragId) {
        onReorderLayers(current.dragId, current.overId, current.position);
        hapticDrop();
      }
      setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [Boolean(dragState), onReorderLayers]);

  if (!isOpen) return null;

  const selectedIdSet = new Set<number>(
    selectedElements.length > 0
      ? selectedElements.map((e) => e.id)
      : selectedElement
      ? [selectedElement.id]
      : []
  );
  const isArtboardOrientationLocked =
    selectedElement?.t === 'artboard' && !!selectedElement.orientationLocked;
  const effectivePaletteTarget: 'fill' | 'stroke' =
    selectedElement &&
    (selectedElement.t === 'line' || selectedElement.t === 'arrow' || selectedElement.t === 'path')
      ? 'stroke'
      : paletteApplyTarget;

  const applySmartColor = (hex: string) => {
    if (!selectedElement) return;
    onSnapshot?.();
    const targetIds =
      selectedElements.length > 1 ? selectedElements.map((e) => e.id) : [selectedElement.id];
    const updates: Partial<CanvasElement> =
      effectivePaletteTarget === 'stroke'
        ? ({
            stroke: hex,
            sw:
              'sw' in selectedElement && selectedElement.sw && selectedElement.sw > 0
                ? selectedElement.sw
                : 2,
            strokeStyle: 'solid',
          } as any)
        : ({
            fill: hex,
            gradientFill: undefined,
            radialGradient: undefined,
          } as any);
    if (onUpdateElements && targetIds.length > 1) {
      onUpdateElements(targetIds, updates);
    } else {
      onUpdateElement(selectedElement.id, updates);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(htmlCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadHtml = () => {
    downloadFile(
      `${project.name.toLowerCase().replace(/\s+/g, '_')}.html`,
      htmlCode,
      'text/html'
    );
  };

  const selectionModeCard = (
    <div className="mb-3 p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/70 space-y-2 max-w-xl mx-auto">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
          <LassoSelect size={14} className="text-blue-600 dark:text-blue-400" />
          Canvas Selection Mode
        </span>
        {selectedIdSet.size > 0 && (
          <button
            onClick={() => onSelectElement(null)}
            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear ({selectedIdSet.size})
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5 bg-gray-200/70 dark:bg-gray-900/60 p-1 rounded-xl">
        <button
          onClick={() => onChangeSelectionMode('single')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
            selectionMode === 'single'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <MousePointer2 size={13} />
          <span>Single Select</span>
        </button>
        <button
          onClick={() => onChangeSelectionMode('multi')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
            selectionMode === 'multi'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <LassoSelect size={13} />
          <span>Multi / Lasso</span>
        </button>
      </div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
        {selectionMode === 'multi'
          ? 'Drag anywhere on canvas to draw a selection rectangle, or tap layers/items to toggle them.'
          : 'Tap any element to select it, or drag from empty canvas space for marquee select.'}
      </p>
    </div>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#1e1e22] rounded-t-3xl shadow-2xl border-t border-gray-200/90 dark:border-gray-800/90 h-[46vh] max-h-[540px] flex flex-col transition-all duration-200 animate-in slide-in-from-bottom-10 select-none">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto touch-pan-x no-scrollbar">
          {(['Properties', 'Outline', 'Code', 'Tweaks'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
                activeTab === tab
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
            >
              <span>{tab === 'Outline' ? 'Layers' : tab}</span>
              {tab === 'Outline' && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-gray-200/80 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {currentPage.items.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
          title="Close sheet"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body content */}
      <div className="flex-1 overflow-y-auto touch-pan-y p-4 text-sm text-gray-800 dark:text-gray-200">
        {/* PROPERTIES TAB */}
        {activeTab === 'Properties' && (
          <div>
            {selectionModeCard}
            {!selectedElement ? (
              <div className="py-6 text-center text-gray-400 dark:text-gray-500">
                <p className="font-medium text-base mb-1">Nothing selected</p>
                <p className="text-xs">
                  Tap an element or use Multi / Lasso mode to select multiple items.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-w-xl mx-auto">
                {/* Transform (X, Y, W, H) & Lock/Hide/Aspect row */}
                <div className="py-2 border-b border-gray-100 dark:border-gray-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-xs text-gray-500">Dimensions &amp; Layer</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          onUpdateElement(selectedElement.id, {
                            aspectLocked: !selectedElement.aspectLocked,
                          })
                        }
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                          selectedElement.aspectLocked
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                        title="Lock aspect ratio when resizing"
                      >
                        {selectedElement.aspectLocked ? <Link2 size={12} /> : <Link2Off size={12} />}
                        <span>Ratio</span>
                      </button>
                      <button
                        onClick={() =>
                          onUpdateElement(selectedElement.id, { locked: !selectedElement.locked })
                        }
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                          selectedElement.locked
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {selectedElement.locked ? <Lock size={12} /> : <Unlock size={12} />}
                        <span>{selectedElement.locked ? 'Locked' : 'Lock'}</span>
                      </button>
                      <button
                        onClick={() =>
                          onUpdateElement(selectedElement.id, { hidden: !selectedElement.hidden })
                        }
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                          selectedElement.hidden
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {selectedElement.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                        <span>{selectedElement.hidden ? 'Hidden' : 'Hide'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {[
                      { label: 'X', val: Math.round(selectedElement.x), key: 'x' as const },
                      { label: 'Y', val: Math.round(selectedElement.y), key: 'y' as const },
                      { label: 'W', val: Math.round(selectedElement.w), key: 'w' as const },
                      { label: 'H', val: Math.round(selectedElement.h), key: 'h' as const },
                    ].map((coord) => {
                      const isSizeBlocked =
                        isArtboardOrientationLocked && (coord.key === 'w' || coord.key === 'h');
                      return (
                        <label
                          key={coord.key}
                          className={`flex items-center bg-gray-100 dark:bg-gray-800 px-2.5 py-2 rounded-xl ${
                            isSizeBlocked ? 'opacity-60 cursor-not-allowed' : ''
                          }`}
                          title={
                            isSizeBlocked
                              ? 'Unlock Artboard orientation to change dimensions'
                              : undefined
                          }
                        >
                          <span className="text-gray-400 font-semibold mr-1.5">{coord.label}</span>
                          <input
                            type="number"
                            disabled={isSizeBlocked}
                            value={coord.val}
                            onChange={(e) => {
                              if (isSizeBlocked) return;
                              const num = parseInt(e.target.value);
                              if (!Number.isNaN(num)) {
                                const next =
                                  coord.key === 'w' || coord.key === 'h'
                                    ? Math.max(8, num)
                                    : num;
                                if (
                                  selectedElement.aspectLocked &&
                                  (coord.key === 'w' || coord.key === 'h') &&
                                  selectedElement.w > 0 &&
                                  selectedElement.h > 0
                                ) {
                                  const ratio = selectedElement.w / selectedElement.h;
                                  if (coord.key === 'w') {
                                    onUpdateElement(selectedElement.id, {
                                      w: next,
                                      h: Math.max(8, Math.round(next / ratio)),
                                    });
                                  } else {
                                    onUpdateElement(selectedElement.id, {
                                      w: Math.max(8, Math.round(next * ratio)),
                                      h: next,
                                    });
                                  }
                                } else {
                                  onUpdateElement(selectedElement.id, { [coord.key]: next });
                                }
                              }
                            }}
                            className="w-full bg-transparent outline-hidden font-mono font-medium disabled:cursor-not-allowed"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Artboard Orientation & Resize Lock Panel */}
                {selectedElement.t === 'artboard' && (() => {
                  const isLandscape = selectedElement.w > selectedElement.h;
                  const currentOrientation = isLandscape ? 'landscape' : 'portrait';
                  const isOrientLocked = !!selectedElement.orientationLocked;

                  return (
                    <div className="py-2.5 border-b border-gray-100 dark:border-gray-800 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-gray-500 flex items-center gap-1.5">
                          {isLandscape ? (
                            <Monitor size={13} className="text-indigo-500" />
                          ) : (
                            <Smartphone size={13} className="text-indigo-500" />
                          )}
                          Artboard Orientation
                        </span>
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${
                            isOrientLocked
                              ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {isOrientLocked ? `Locked · ${currentOrientation}` : currentOrientation}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                        <button
                          type="button"
                          disabled={isOrientLocked && currentOrientation !== 'portrait'}
                          onClick={() => {
                            if (isLandscape && !isOrientLocked) {
                              onSnapshot?.();
                              onUpdateElement(selectedElement.id, {
                                w: selectedElement.h,
                                h: selectedElement.w,
                                lockedOrientation: 'portrait',
                              } as any);
                            }
                          }}
                          className={`min-h-[40px] flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-45 disabled:cursor-not-allowed ${
                            !isLandscape
                              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-xs'
                              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          <Smartphone size={14} />
                          <span>Portrait</span>
                        </button>
                        <button
                          type="button"
                          disabled={isOrientLocked && currentOrientation !== 'landscape'}
                          onClick={() => {
                            if (!isLandscape && !isOrientLocked) {
                              onSnapshot?.();
                              onUpdateElement(selectedElement.id, {
                                w: selectedElement.h,
                                h: selectedElement.w,
                                lockedOrientation: 'landscape',
                              } as any);
                            }
                          }}
                          className={`min-h-[40px] flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-45 disabled:cursor-not-allowed ${
                            isLandscape
                              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-xs'
                              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          <Monitor size={14} />
                          <span>Landscape</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onSnapshot?.();
                          onUpdateElement(selectedElement.id, {
                            orientationLocked: !isOrientLocked,
                            lockedOrientation: currentOrientation,
                          } as any);
                        }}
                        className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                          isOrientLocked
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                            : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {isOrientLocked ? <Lock size={14} /> : <Unlock size={14} />}
                          <span>Lock Orientation &amp; Prevent Resize</span>
                        </span>
                        <span
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                            isOrientLocked
                              ? 'bg-indigo-600 justify-end'
                              : 'bg-gray-300 dark:bg-gray-600 justify-start'
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                        </span>
                      </button>
                      {isOrientLocked && (
                        <p className="text-[11px] text-indigo-600/80 dark:text-indigo-300/80 leading-snug">
                          Resize handles are hidden in Select mode to prevent accidental resizing. You can still move this artboard freely.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Typography Panel (Font Weight, Letter Spacing, Family & Size) */}
                {selectedElement.t === 'text' && (
                  <div className="py-2.5 border-b border-gray-100 dark:border-gray-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-gray-500 flex items-center gap-1.5">
                        <TypeIcon size={13} className="text-blue-600" />
                        Typography
                      </span>
                      <span className="text-[11px] font-mono text-gray-400">
                        {selectedElement.fs}px · {selectedElement.fw ?? (selectedElement.b ? 700 : 400)}w
                      </span>
                    </div>

                    {/* Font Family & Size */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="flex flex-col gap-1">
                        <span className="text-[11px] text-gray-400 font-medium">Font Family</span>
                        <select
                          value={selectedElement.ff || FONT_FAMILIES[0].value}
                          onChange={(e) => {
                            onSnapshot?.();
                            onUpdateElement(selectedElement.id, { ff: e.target.value } as any);
                          }}
                          className="bg-gray-100 dark:bg-gray-800 px-2.5 py-1.5 rounded-xl font-medium outline-hidden"
                        >
                          {FONT_FAMILIES.map((f) => (
                            <option key={f.name} value={f.value}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[11px] text-gray-400 font-medium">Font Size (px)</span>
                        <input
                          type="number"
                          min={8}
                          max={140}
                          value={selectedElement.fs}
                          onChange={(e) => {
                            const next = Math.max(8, Math.min(140, parseInt(e.target.value, 10) || 16));
                            onUpdateElement(selectedElement.id, { fs: next } as any);
                          }}
                          className="bg-gray-100 dark:bg-gray-800 px-2.5 py-1.5 rounded-xl font-mono font-semibold outline-hidden"
                        />
                      </label>
                    </div>

                    {/* Font Weight selector pills */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium">Font Weight</span>
                        <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                          {(() => {
                            const w = selectedElement.fw ?? (selectedElement.b ? 700 : 400);
                            const names: Record<number, string> = {
                              300: 'Light (300)',
                              400: 'Regular (400)',
                              500: 'Medium (500)',
                              600: 'SemiBold (600)',
                              700: 'Bold (700)',
                              800: 'ExtraBold (800)',
                              900: 'Black (900)',
                            };
                            return names[w] || String(w);
                          })()}
                        </span>
                      </div>
                      <div className="grid grid-cols-7 gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                        {[
                          { weight: 300, label: '300' },
                          { weight: 400, label: '400' },
                          { weight: 500, label: '500' },
                          { weight: 600, label: '600' },
                          { weight: 700, label: '700' },
                          { weight: 800, label: '800' },
                          { weight: 900, label: '900' },
                        ].map((opt) => {
                          const currentWeight =
                            selectedElement.fw ?? (selectedElement.b ? 700 : 400);
                          const isActive = currentWeight === opt.weight;
                          return (
                            <button
                              key={opt.weight}
                              type="button"
                              onClick={() => {
                                onSnapshot?.();
                                onUpdateElement(selectedElement.id, {
                                  fw: opt.weight,
                                  b: opt.weight >= 600,
                                } as any);
                              }}
                              className={`py-1.5 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                                isActive
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Letter Spacing Slider + Presets */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium">Letter Spacing</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                            {(selectedElement.ls ?? 0) > 0
                              ? `+${selectedElement.ls ?? 0}px`
                              : `${selectedElement.ls ?? 0}px`}
                          </span>
                          {(selectedElement.ls ?? 0) !== 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                onSnapshot?.();
                                onUpdateElement(selectedElement.id, { ls: 0 } as any);
                              }}
                              className="text-[10px] font-semibold text-gray-500 hover:text-blue-600"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="-2"
                          max="16"
                          step="0.5"
                          value={selectedElement.ls ?? 0}
                          onChange={(e) =>
                            onUpdateElement(selectedElement.id, {
                              ls: parseFloat(e.target.value),
                            } as any)
                          }
                          className="flex-1 accent-blue-600 cursor-pointer"
                          aria-label="Letter spacing"
                        />
                        <div className="flex items-center gap-1">
                          {[-1, 0, 2, 5].map((presetLs) => (
                            <button
                              key={presetLs}
                              type="button"
                              onClick={() => {
                                onSnapshot?.();
                                onUpdateElement(selectedElement.id, { ls: presetLs } as any);
                              }}
                              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold transition-colors ${
                                (selectedElement.ls ?? 0) === presetLs
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                              }`}
                            >
                              {presetLs > 0 ? `+${presetLs}` : presetLs}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Image Adjustments Panel (Brightness, Contrast, Saturation, Blur) */}
                {selectedElement.t === 'image' && (
                  <div className="py-2.5 border-b border-gray-100 dark:border-gray-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-gray-500 flex items-center gap-1.5">
                        <SlidersHorizontal size={13} className="text-blue-600" />
                        Image Adjustments
                      </span>
                      <button
                        onClick={() => {
                          onSnapshot?.();
                          onUpdateElement(selectedElement.id, {
                            br: 1,
                            ct: 1,
                            sa: 1,
                            bl: 0,
                          } as any);
                        }}
                        className="text-[11px] font-semibold text-blue-600 hover:underline"
                      >
                        Reset
                      </button>
                    </div>
                    <div className="space-y-2 text-xs">
                      {[
                        {
                          label: 'Brightness',
                          key: 'br' as const,
                          min: 0.4,
                          max: 1.8,
                          step: 0.05,
                          val: selectedElement.br ?? 1,
                          fmt: (v: number) => `${Math.round(v * 100)}%`,
                        },
                        {
                          label: 'Contrast',
                          key: 'ct' as const,
                          min: 0.4,
                          max: 1.8,
                          step: 0.05,
                          val: selectedElement.ct ?? 1,
                          fmt: (v: number) => `${Math.round(v * 100)}%`,
                        },
                        {
                          label: 'Saturation',
                          key: 'sa' as const,
                          min: 0,
                          max: 2,
                          step: 0.05,
                          val: selectedElement.sa ?? 1,
                          fmt: (v: number) => `${Math.round(v * 100)}%`,
                        },
                        {
                          label: 'Blur',
                          key: 'bl' as const,
                          min: 0,
                          max: 12,
                          step: 0.5,
                          val: selectedElement.bl ?? 0,
                          fmt: (v: number) => `${v}px`,
                        },
                      ].map((slider) => (
                        <div key={slider.key} className="flex items-center gap-2">
                          <span className="w-20 text-gray-500 font-medium">{slider.label}</span>
                          <input
                            type="range"
                            min={slider.min}
                            max={slider.max}
                            step={slider.step}
                            value={slider.val}
                            onChange={(e) =>
                              onUpdateElement(selectedElement.id, {
                                [slider.key]: parseFloat(e.target.value),
                              } as any)
                            }
                            className="flex-1 accent-blue-600"
                          />
                          <span className="w-11 text-right font-mono text-[11px]">
                            {slider.fmt(slider.val)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {selectedElement.qrValue && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/50 text-xs">
                        <QrCode size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-semibold uppercase text-blue-600 dark:text-blue-400">
                            QR Target
                          </div>
                          <div className="truncate font-mono text-[11px] text-gray-700 dark:text-gray-200 select-text">
                            {selectedElement.qrValue}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Smart Palette (Dominant Colors & Complementary Randomizer) */}
                {(selectedElement.t === 'image' ||
                  smartPalette.length > 0 ||
                  Boolean(onRandomizePalette)) && (
                  <div className="py-2.5 border-b border-gray-100 dark:border-gray-800 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-semibold text-xs text-gray-500 flex items-center gap-1.5">
                        <Palette size={13} className="text-purple-600 dark:text-purple-400" />
                        Smart Palette
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {selectedElement.t !== 'line' &&
                          selectedElement.t !== 'arrow' &&
                          selectedElement.t !== 'path' && (
                            <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg text-[11px] font-semibold">
                              <button
                                type="button"
                                onClick={() => setPaletteApplyTarget('fill')}
                                className={`px-2 py-0.5 rounded-md transition-colors ${
                                  effectivePaletteTarget === 'fill'
                                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                                }`}
                              >
                                Fill
                              </button>
                              <button
                                type="button"
                                onClick={() => setPaletteApplyTarget('stroke')}
                                className={`px-2 py-0.5 rounded-md transition-colors ${
                                  effectivePaletteTarget === 'stroke'
                                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                                }`}
                              >
                                Stroke
                              </button>
                            </div>
                          )}
                        {onRandomizePalette &&
                          selectedElement.t !== 'image' &&
                          selectedElement.t !== 'line' &&
                          selectedElement.t !== 'arrow' &&
                          selectedElement.t !== 'path' && (
                            <button
                              type="button"
                              onClick={onRandomizePalette}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200/80 dark:border-violet-800/60 text-[11px] font-semibold hover:bg-violet-100 dark:hover:bg-violet-900/60 active:scale-95 transition-all"
                              title="Replace fill colors of selected elements with a complementary palette from Smart Palette"
                            >
                              <Shuffle size={11} />
                              <span>Randomize</span>
                            </button>
                          )}
                        {selectedElement.t === 'image' && onExtractImagePalette && (
                          <button
                            type="button"
                            onClick={() => onExtractImagePalette(selectedElement.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 text-[11px] font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors"
                          >
                            <Sparkles size={11} />
                            <span>Extract</span>
                          </button>
                        )}
                        {smartPalette.length > 0 && onClearSmartPalette && (
                          <button
                            type="button"
                            onClick={onClearSmartPalette}
                            className="text-[11px] font-semibold text-gray-400 hover:text-red-500 px-1"
                            title="Clear Smart Palette"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedElement.t === 'image' &&
                      selectedElement.palette &&
                      selectedElement.palette.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            Extracted from this image
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedElement.palette.map((hex) => (
                              <button
                                key={`img-pal-${hex}`}
                                type="button"
                                onClick={() => applySmartColor(hex)}
                                className="group flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-all active:scale-95"
                                title={`Apply ${hex} to ${effectivePaletteTarget}`}
                              >
                                <span
                                  className="w-4 h-4 rounded-md border border-black/15 shrink-0"
                                  style={{ backgroundColor: hex }}
                                />
                                <span className="text-[10px] font-mono font-semibold text-gray-600 dark:text-gray-300 uppercase">
                                  {hex}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                    {smartPalette.length > 0 ? (
                      <div className="space-y-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                          Quick-Access Canvas Palette (Tap to apply {effectivePaletteTarget})
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {smartPalette.map((hex) => {
                            const activeColor =
                              effectivePaletteTarget === 'stroke'
                                ? 'stroke' in selectedElement && selectedElement.stroke
                                  ? selectedElement.stroke.toLowerCase()
                                  : ''
                                : 'fill' in selectedElement && selectedElement.fill
                                ? selectedElement.fill.toLowerCase()
                                : '';
                            const isCurrent = activeColor === hex.toLowerCase();
                            return (
                              <button
                                key={`proj-pal-${hex}`}
                                type="button"
                                onClick={() => applySmartColor(hex)}
                                className={`w-9 h-9 rounded-xl border transition-all hover:scale-105 active:scale-95 flex items-center justify-center ${
                                  isCurrent
                                    ? 'border-blue-600 ring-2 ring-blue-500/40'
                                    : 'border-black/15 dark:border-white/15'
                                }`}
                                style={{ backgroundColor: hex }}
                                title={`${hex.toUpperCase()} — Apply to ${effectivePaletteTarget}`}
                                aria-label={`Apply color ${hex} to ${effectivePaletteTarget}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400">
                        Tap &ldquo;Extract&rdquo; or upload any image to populate quick-access dominant brand colors.
                      </p>
                    )}
                  </div>
                )}

                {/* Vector Path Smoothing Panel */}
                {selectedElement.t === 'path' && (
                  <div className="py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Spline size={15} className="text-blue-600" />
                      <div>
                        <div className="text-xs font-semibold">Smooth Bezier Curves</div>
                        <div className="text-[11px] text-gray-400">
                          Catmull-Rom curve interpolation
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onSnapshot?.();
                        onUpdateElement(selectedElement.id, {
                          smooth: selectedElement.smooth === false ? true : false,
                        } as any);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        selectedElement.smooth !== false
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {selectedElement.smooth !== false ? 'Smoothed' : 'Raw'}
                    </button>
                  </div>
                )}

                {/* Radial Gradients Quick Picker (Rectangles & Ovals) */}
                {(selectedElement.t === 'rect' || selectedElement.t === 'oval') && (
                  <div className="py-2.5 border-b border-gray-100 dark:border-gray-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-gray-500">Radial Gradient</span>
                      {selectedElement.radialGradient && (
                        <button
                          onClick={() => {
                            onSnapshot?.();
                            onUpdateElement(selectedElement.id, {
                              radialGradient: undefined,
                            } as any);
                          }}
                          className="text-[11px] font-semibold text-red-500 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {RADIAL_GRADIENT_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            onSnapshot?.();
                            onUpdateElement(selectedElement.id, {
                              radialGradient: {
                                ...preset.spec,
                                stops: preset.spec.stops.map((s) => ({ ...s })),
                              },
                              gradientFill: undefined,
                            } as any);
                          }}
                          className="h-8 rounded-xl border border-black/10 dark:border-white/15 transition-transform hover:scale-105"
                          style={{ background: preset.css }}
                          title={preset.name}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Corner Radius Quick-Selection Panel (Rectangles, Images, Artboards) */}
                {(selectedElement.t === 'rect' ||
                  selectedElement.t === 'image' ||
                  selectedElement.t === 'artboard') && (
                  <div className="py-2.5 border-b border-gray-100 dark:border-gray-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-gray-500">Corner Radius</span>
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        {(selectedElement.r ?? 0) >= 99 ? 'Pill' : `${selectedElement.r ?? 0}px`}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: 'Sharp', sub: '0px', value: 0, radiusClass: 'rounded-none' },
                        { label: 'Rounded', sub: '8px', value: 8, radiusClass: 'rounded-md' },
                        { label: 'Smooth', sub: '16px', value: 16, radiusClass: 'rounded-xl' },
                        { label: 'Pill', sub: 'Full', value: 999, radiusClass: 'rounded-full' },
                      ].map((preset) => {
                        const currentR = selectedElement.r ?? 0;
                        const isActive =
                          preset.value >= 99 ? currentR >= 99 : currentR === preset.value;
                        return (
                          <button
                            key={preset.label}
                            onClick={() => {
                              onSnapshot?.();
                              onUpdateElement(selectedElement.id, { r: preset.value } as any);
                            }}
                            className={`min-h-[48px] flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-xl border text-center transition-all ${
                              isActive
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 shadow-xs'
                                : 'border-gray-200 dark:border-gray-700/80 bg-gray-50/70 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                          >
                            <span
                              className={`w-5 h-3.5 border-2 ${preset.radiusClass} ${
                                isActive
                                  ? 'border-blue-600 dark:border-blue-400 bg-blue-500/15'
                                  : 'border-gray-400 dark:border-gray-500'
                              }`}
                            />
                            <span className="text-[11px] font-semibold leading-none">
                              {preset.label}
                            </span>
                            <span className="text-[9px] text-gray-400 font-mono leading-none">
                              {preset.sub}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Shadows Quick-Set Section */}
                {(() => {
                  const activeShadow: 'none' | 'subtle' | 'soft' | 'heavy' = !selectedElement.sh
                    ? 'none'
                    : selectedElement.shadowStyle && selectedElement.shadowStyle !== 'none'
                    ? selectedElement.shadowStyle
                    : (selectedElement.shadowIntensity ?? 12) <= 8
                    ? 'subtle'
                    : (selectedElement.shadowIntensity ?? 12) >= 20
                    ? 'heavy'
                    : 'soft';

                  const shadowOptions: {
                    id: 'none' | 'subtle' | 'soft' | 'heavy';
                    label: string;
                    intensity: number;
                    previewStyle: string;
                  }[] = [
                    { id: 'none', label: 'None', intensity: 0, previewStyle: 'shadow-none' },
                    {
                      id: 'subtle',
                      label: 'Subtle',
                      intensity: 6,
                      previewStyle: 'shadow-[0_1px_3px_rgba(0,0,0,0.16)]',
                    },
                    {
                      id: 'soft',
                      label: 'Soft',
                      intensity: 14,
                      previewStyle: 'shadow-[0_4px_12px_rgba(0,0,0,0.22)]',
                    },
                    {
                      id: 'heavy',
                      label: 'Heavy',
                      intensity: 26,
                      previewStyle: 'shadow-[0_8px_20px_rgba(0,0,0,0.34)]',
                    },
                  ];

                  return (
                    <div className="py-2.5 border-b border-gray-100 dark:border-gray-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-gray-500">Shadows</span>
                        <span className="text-[11px] font-medium capitalize text-gray-400">
                          {activeShadow}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {shadowOptions.map((opt) => {
                          const isActive = activeShadow === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => {
                                onSnapshot?.();
                                onUpdateElement(selectedElement.id, {
                                  sh: opt.id !== 'none',
                                  shadowStyle: opt.id,
                                  shadowIntensity: opt.intensity,
                                });
                              }}
                              className={`min-h-[48px] flex flex-col items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl border transition-all ${
                                isActive
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 shadow-xs'
                                  : 'border-gray-200 dark:border-gray-700/80 bg-gray-50/70 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                            >
                              <span
                                className={`w-6 h-3.5 rounded-sm bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 ${opt.previewStyle}`}
                              />
                              <span className="text-[11px] font-semibold leading-none">
                                {opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Link row (matching screenshot) */}
                <div className="py-2 border-b border-gray-100 dark:border-gray-800">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Link
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-20">Destination</span>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={selectedElement.link || ''}
                      onChange={(e) =>
                        onUpdateElement(selectedElement.id, { link: e.target.value })
                      }
                      className="flex-1 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-xl text-xs outline-hidden ring-1 ring-transparent focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>

                {/* Auto-Layout Section for Grouped / Container Elements */}
                {(selectedElement.groupId || selectedElement.t === 'group' || selectedElement.t === 'artboard' || selectedElements.length > 1) && (
                  <div className="py-2.5 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Layers size={14} className="text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-xs text-gray-800 dark:text-gray-200">Auto-layout</span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                        {selectedElement.autoLayout && selectedElement.autoLayout !== 'none' ? selectedElement.autoLayout.toUpperCase() : 'OFF'}
                      </span>
                    </div>

                    {/* Direction Toggle: None, Vertical, Horizontal */}
                    <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-3 text-xs">
                      <button
                        onClick={() => onAutoLayout && onAutoLayout('none')}
                        className={`py-1.5 rounded-lg font-medium transition-all ${
                          !selectedElement.autoLayout || selectedElement.autoLayout === 'none'
                            ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-xs'
                            : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                      >
                        Freeform
                      </button>
                      <button
                        onClick={() => onAutoLayout && onAutoLayout('vertical', selectedElement.autoLayoutGap ?? 12, selectedElement.autoLayoutPadding ?? 16, selectedElement.autoLayoutAlign ?? 'start')}
                        className={`py-1.5 rounded-lg font-medium flex items-center justify-center gap-1 transition-all ${
                          selectedElement.autoLayout === 'vertical'
                            ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-xs'
                            : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                      >
                        <span>Vertical ↕</span>
                      </button>
                      <button
                        onClick={() => onAutoLayout && onAutoLayout('horizontal', selectedElement.autoLayoutGap ?? 12, selectedElement.autoLayoutPadding ?? 16, selectedElement.autoLayoutAlign ?? 'start')}
                        className={`py-1.5 rounded-lg font-medium flex items-center justify-center gap-1 transition-all ${
                          selectedElement.autoLayout === 'horizontal'
                            ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-xs'
                            : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                      >
                        <span>Horizontal ↔</span>
                      </button>
                    </div>

                    {/* Gap and Alignment controls when active */}
                    {selectedElement.autoLayout && selectedElement.autoLayout !== 'none' && (
                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 font-medium">Item Gap</span>
                          <div className="flex items-center gap-1.5">
                            {[0, 8, 12, 16, 24, 32].map((g) => (
                              <button
                                key={g}
                                onClick={() => onAutoLayout && onAutoLayout(selectedElement.autoLayout as any, g, selectedElement.autoLayoutPadding ?? 16, selectedElement.autoLayoutAlign ?? 'start')}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
                                  (selectedElement.autoLayoutGap ?? 12) === g
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                                }`}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 font-medium">Alignment</span>
                          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
                            {(['start', 'center', 'end'] as const).map((al) => (
                              <button
                                key={al}
                                onClick={() => onAutoLayout && onAutoLayout(selectedElement.autoLayout as any, selectedElement.autoLayoutGap ?? 12, selectedElement.autoLayoutPadding ?? 16, al)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-all ${
                                  (selectedElement.autoLayoutAlign ?? 'start') === al
                                    ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-xs'
                                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                                }`}
                              >
                                {al}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Export Accordion (matching screenshot) */}
                <div className="border-b border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => setIsExportExpanded(!isExportExpanded)}
                    className="w-full flex items-center justify-between py-2 text-left font-semibold text-gray-800 dark:text-gray-200 hover:text-blue-600"
                  >
                    <span>Export</span>
                    {isExportExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {isExportExpanded && (
                    <div className="pb-3 pt-1 flex gap-2">
                      <button
                        onClick={() => {
                          const svgs = generateArtboardSvgs(currentPage);
                          if (svgs.length) {
                            navigator.clipboard.writeText(svgs[0].svg);
                            setCopiedSvg(true);
                            setTimeout(() => setCopiedSvg(false), 2000);
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 dark:bg-gray-800 py-2 rounded-xl text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Copy size={13} />
                        <span>{copiedSvg ? 'Copied SVG!' : 'Copy SVG'}</span>
                      </button>
                      <button
                        onClick={handleDownloadHtml}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 dark:bg-gray-800 py-2 rounded-xl text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Download size={13} />
                        <span>Download HTML</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Advanced Accordion (matching screenshot) */}
                <div className="border-b border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
                    className="w-full flex items-center justify-between py-2 text-left font-semibold text-gray-800 dark:text-gray-200 hover:text-blue-600"
                  >
                    <span>Advanced</span>
                    {isAdvancedExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {isAdvancedExpanded && (
                    <div className="pb-3 pt-1 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Opacity</span>
                        <div className="flex items-center gap-2 w-48">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={selectedElement.op ?? 1}
                            onChange={(e) =>
                              onUpdateElement(selectedElement.id, {
                                op: parseFloat(e.target.value),
                              })
                            }
                            className="flex-1 accent-blue-600"
                          />
                          <span className="font-mono w-10 text-right">
                            {Math.round((selectedElement.op ?? 1) * 100)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500">Rotation</span>
                        <div className="flex items-center gap-2 flex-1 max-w-[240px] justify-end">
                          <input
                            type="range"
                            min="-180"
                            max="180"
                            step="1"
                            value={selectedElement.rot || 0}
                            onChange={(e) =>
                              onUpdateElement(selectedElement.id, {
                                rot: parseInt(e.target.value) || 0,
                              })
                            }
                            className="flex-1 accent-blue-600"
                          />
                          <span className="font-mono w-9 text-right">
                            {selectedElement.rot || 0}°
                          </span>
                          <button
                            onClick={() =>
                              onUpdateElement(selectedElement.id, {
                                rot: (((selectedElement.rot || 0) + 90 + 180) % 360) - 180,
                              })
                            }
                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                            title="Rotate 90°"
                          >
                            <RotateCw size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500">Flip</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              onUpdateElement(selectedElement.id, {
                                flipX: !selectedElement.flipX,
                              })
                            }
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                              selectedElement.flipX
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            <FlipHorizontal2 size={13} />
                            <span>Horizontal</span>
                          </button>
                          <button
                            onClick={() =>
                              onUpdateElement(selectedElement.id, {
                                flipY: !selectedElement.flipY,
                              })
                            }
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                              selectedElement.flipY
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            <FlipVertical2 size={13} />
                            <span>Vertical</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500">Blend Mode</span>
                        <select
                          value={selectedElement.blendMode || 'normal'}
                          onChange={(e) => {
                            onSnapshot?.();
                            onUpdateElement(selectedElement.id, {
                              blendMode: e.target.value as BlendModeType,
                            });
                          }}
                          className="bg-gray-100 dark:bg-gray-800 px-2.5 py-1.5 rounded-lg text-xs font-medium outline-hidden capitalize"
                        >
                          {(
                            [
                              'normal',
                              'multiply',
                              'screen',
                              'overlay',
                              'darken',
                              'lighten',
                              'soft-light',
                            ] as BlendModeType[]
                          ).map((mode) => (
                            <option key={mode} value={mode}>
                              {mode}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Debug section (matching screenshot exactly) */}
                <div className="pt-2">
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
                    Debug
                  </div>
                  <pre className="p-3 bg-gray-50 dark:bg-black/30 rounded-xl text-[11px] font-mono text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-all border border-gray-100 dark:border-gray-800 select-text">
                    {generateElementDebugJson(selectedElement)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* OUTLINE / INTERACTIVE LAYERS TAB */}
        {activeTab === 'Outline' && (
          <div className="space-y-2.5 max-w-xl mx-auto">
            {selectionModeCard}

            <div className="flex items-center justify-between gap-2 px-1">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Layers size={13} className="text-blue-600" />
                <span>
                  Layers on {currentPage.n} ({currentPage.items.length})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {onSelectMultiple && currentPage.items.length > 0 && (
                  <button
                    onClick={() => {
                      const ids = currentPage.items
                        .filter((i) => i.t !== 'artboard' && !i.hidden)
                        .map((i) => i.id);
                      onSelectMultiple(ids);
                    }}
                    className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-[11px] font-semibold text-gray-600 dark:text-gray-300"
                    title="Select all items on page"
                  >
                    Select All
                  </button>
                )}
                {currentPage.items.length > 0 && (
                  <label className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-xl text-xs">
                    <Search size={12} className="text-gray-400" />
                    <input
                      type="text"
                      value={layerQuery}
                      onChange={(e) => setLayerQuery(e.target.value)}
                      placeholder="Filter..."
                      className="w-20 sm:w-28 bg-transparent outline-hidden text-xs"
                    />
                  </label>
                )}
              </div>
            </div>

            {currentPage.items.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Page is empty</p>
            ) : (
              <div className="space-y-1">
                {[...currentPage.items]
                  .reverse()
                  .filter((item) => {
                    const q = layerQuery.trim().toLowerCase();
                    if (!q) return true;
                    const label =
                      item.t === 'artboard' && 'n' in item
                        ? item.n
                        : item.t === 'text' && 'text' in item
                        ? item.text
                        : item.t === 'note' && 'text' in item
                        ? item.text
                        : item.t;
                    return label.toLowerCase().includes(q) || item.t.toLowerCase().includes(q);
                  })
                  .map((item) => {
                    const isSelected = selectedIdSet.has(item.id);
                    const isDragging = dragState?.dragId === item.id;
                    const isDropBefore =
                      dragState &&
                      dragState.dragId !== item.id &&
                      dragState.overId === item.id &&
                      dragState.position === 'before';
                    const isDropAfter =
                      dragState &&
                      dragState.dragId !== item.id &&
                      dragState.overId === item.id &&
                      dragState.position === 'after';

                    const labelText =
                      item.t === 'artboard' && 'n' in item
                        ? item.n
                        : item.t === 'text' && 'text' in item
                        ? item.text.slice(0, 26)
                        : item.t === 'note' && 'text' in item
                        ? item.text.slice(0, 26)
                        : item.t;

                    const swatchColor =
                      'fill' in item && item.fill && item.fill !== 'none'
                        ? item.fill
                        : 'stroke' in item && item.stroke
                        ? item.stroke
                        : '#94a3b8';

                    return (
                      <div
                        key={item.id}
                        ref={(el) => {
                          rowRefs.current[item.id] = el;
                        }}
                        onClick={() => {
                          if (selectionMode === 'multi' && onToggleSelectId) {
                            onToggleSelectId(item.id);
                          } else {
                            onSelectElement(item.id);
                          }
                        }}
                        className={`relative flex items-center justify-between gap-2 px-2 py-2 rounded-xl cursor-pointer text-xs border transition-colors ${
                          isDragging
                            ? 'bg-blue-100/80 dark:bg-blue-900/50 border-blue-400 opacity-75 shadow-sm'
                            : isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold'
                            : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                        } ${item.hidden ? 'opacity-50' : ''} ${
                          isDropBefore ? 'border-t-2 border-t-blue-500' : ''
                        } ${isDropAfter ? 'border-b-2 border-b-blue-500' : ''}`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          {/* Touch + Desktop Drag Handle */}
                          <button
                            type="button"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              setDragState({ dragId: item.id, overId: item.id, position: 'before' });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 -ml-0.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/70 dark:hover:bg-gray-700 cursor-grab active:cursor-grabbing touch-none shrink-0"
                            title="Drag to reorder layer"
                            aria-label="Drag to reorder layer"
                          >
                            <GripVertical size={14} />
                          </button>

                          {/* Type badge & color swatch */}
                          <span
                            className="w-4 h-4 rounded-md border border-black/10 dark:border-white/15 flex items-center justify-center text-[9px] font-mono font-bold shrink-0"
                            style={{
                              backgroundColor:
                                item.t === 'text' ? 'transparent' : swatchColor,
                              color: item.t === 'text' ? swatchColor : undefined,
                            }}
                          >
                            {item.t === 'artboard'
                              ? '#'
                              : item.t === 'text'
                              ? 'T'
                              : item.t === 'image'
                              ? 'I'
                              : ''}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="truncate flex items-center gap-1.5">
                              <span className="truncate">{labelText}</span>
                              {item.groupId && (
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 shrink-0">
                                  GRP
                                </span>
                              )}
                              {item.t === 'artboard' && item.orientationLocked && (
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 shrink-0">
                                  RATIO
                                </span>
                              )}
                              {item.t === 'image' && item.qrValue && (
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shrink-0">
                                  QR
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              {item.t} · {Math.round(item.w)}×{Math.round(item.h)}
                            </div>
                          </div>
                        </div>

                        {/* Quick Z-order steps, Lock, Visibility & Delete */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {onMoveLayerStep && !layerQuery.trim() && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMoveLayerStep(item.id, 'forward');
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-200/60 dark:hover:bg-gray-700 transition-colors"
                                title="Move layer up"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMoveLayerStep(item.id, 'backward');
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-200/60 dark:hover:bg-gray-700 transition-colors"
                                title="Move layer down"
                              >
                                <ArrowDown size={13} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSnapshot?.();
                              onUpdateElement(item.id, { locked: !item.locked });
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              item.locked
                                ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/30'
                                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700'
                            }`}
                            title={item.locked ? 'Unlock layer' : 'Lock layer'}
                          >
                            {item.locked ? <Lock size={13} /> : <Unlock size={13} />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSnapshot?.();
                              onUpdateElement(item.id, { hidden: !item.hidden });
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              item.hidden
                                ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30'
                                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700'
                            }`}
                            title={item.hidden ? 'Show layer' : 'Hide layer'}
                          >
                            {item.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteElement(item.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                            title="Delete layer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* CODE TAB */}
        {activeTab === 'Code' && (
          <div className="space-y-3 max-w-2xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-semibold text-gray-500">
                Self-Contained Clean HTML &amp; SVG Preview
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
                >
                  {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedCode ? 'Copied!' : 'Copy HTML'}</span>
                </button>
                <button
                  onClick={handleDownloadHtml}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Download size={14} />
                  <span>Download .html</span>
                </button>
              </div>
            </div>

            <pre className="p-4 bg-gray-900 text-gray-200 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-[300px] select-text">
              {htmlCode}
            </pre>
          </div>
        )}

        {/* TWEAKS TAB */}
        {activeTab === 'Tweaks' && (
          <div className="space-y-2.5 max-w-md mx-auto">
            {selectionModeCard}

            <div
              onClick={onToggleSmartSnap}
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center gap-2.5">
                <Magnet size={16} className="text-pink-500 shrink-0" />
                <div>
                  <div className="font-semibold text-sm">Smart alignment guides</div>
                  <div className="text-xs text-gray-400">
                    Snap dynamically to nearby elements &amp; artboard centers
                  </div>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                  smartSnap ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-gray-600'
                }`}
              >
                {smartSnap ? '✓' : ''}
              </div>
            </div>

            <div
              onClick={onToggleLayoutGuides}
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border border-gray-100 dark:border-gray-800"
            >
              <div>
                <div className="font-semibold text-sm">Layout guides</div>
                <div className="text-xs text-gray-400">Show inner margins on artboards</div>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                  layoutGuides ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-gray-600'
                }`}
              >
                {layoutGuides ? '✓' : ''}
              </div>
            </div>

            <div
              onClick={onToggleSnapGrid}
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border border-gray-100 dark:border-gray-800"
            >
              <div>
                <div className="font-semibold text-sm">Snap to 8px grid</div>
                <div className="text-xs text-gray-400">Align shapes to 8-pixel intervals</div>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                  snapGrid ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-gray-600'
                }`}
              >
                {snapGrid ? '✓' : ''}
              </div>
            </div>

            <div
              onClick={onFitArtboards}
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border border-gray-100 dark:border-gray-800"
            >
              <div>
                <div className="font-semibold text-sm">Fit artboards</div>
                <div className="text-xs text-gray-400">Center and zoom all artboards to screen</div>
              </div>
              <span className="text-lg">⛶</span>
            </div>

            {onToggleHaptics && (
              <div
                onClick={onToggleHaptics}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border border-gray-100 dark:border-gray-800"
              >
                <div className="flex items-center gap-2.5">
                  <Vibrate size={16} className="text-emerald-500 shrink-0" />
                  <div>
                    <div className="font-semibold text-sm">Mobile haptic vibration</div>
                    <div className="text-xs text-gray-400">
                      Vibrate on grid/guide snap and element drop
                    </div>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                    hapticsEnabled ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {hapticsEnabled ? '✓' : ''}
                </div>
              </div>
            )}

            {onOpenVersionHistory && (
              <div
                onClick={() => {
                  onClose();
                  onOpenVersionHistory();
                }}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border border-gray-100 dark:border-gray-800"
              >
                <div className="flex items-center gap-2.5">
                  <History size={16} className="text-blue-500 shrink-0" />
                  <div>
                    <div className="font-semibold text-sm">Version history</div>
                    <div className="text-xs text-gray-400 tabular-nums">
                      Hourly snapshots &amp; checkpoints ({versionCount} saved)
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400 shrink-0" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
