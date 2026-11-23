import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  CanvasElement,
  DistanceMarker,
  ElementType,
  SelectionMode,
  ToolType,
  Viewport,
} from '../types';
import {
  DEFS,
  escapeHtml,
  fitTextDimensions,
  isInside,
  getBoundingBox,
} from '../utils/helpers';
import { elementToSvg } from '../utils/export';
import { simplifyPoints } from '../utils/pathSmoothing';
import { hapticDrop, hapticSnap, hapticSuccess } from '../utils/haptics';
import {
  Maximize2,
  Pipette,
  X as XIcon,
  LassoSelect,
  Magnet,
  GripHorizontal,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
} from 'lucide-react';

interface CanvasProps {
  elements: CanvasElement[];
  selectedId: number | null;
  selectedIds?: number[];
  tool: ToolType;
  selectionMode?: SelectionMode;
  smartSnap?: boolean;
  viewport: Viewport;
  layoutGuides: boolean;
  snapGrid: boolean;
  isPreview: boolean;
  onSelect: (id: number | null) => void;
  onSelectMultiple?: (ids: number[]) => void;
  onUpdateElement: (id: number, updates: Partial<CanvasElement>) => void;
  onBatchUpdateElements?: (patches: { id: number; updates: Partial<CanvasElement> }[]) => void;
  onCreateElement: (elem: CanvasElement) => void;
  onDiscardElement?: (id: number) => void;
  onUpdateViewport: (viewport: Viewport | ((prev: Viewport) => Viewport)) => void;
  onEditText: (elem: CanvasElement) => void;
  onFitElement: (elem: CanvasElement) => void;
  onSnapshot: () => void;
  onPickColor?: (color: string) => void;
  eyedropperTarget?: 'fill' | 'stroke' | null;
  onCancelEyedropper?: () => void;
  onSwitchEyedropperTarget?: (target: 'fill' | 'stroke') => void;
  onSetSelectionMode?: (mode: SelectionMode) => void;
  onDragStateChange?: (isDragging: boolean) => void;
  onSmartAlignAction?: (action: 'center-h' | 'center-v' | 'space-h' | 'space-v') => void;
  onAutoSnapGroupToArtboard?: (
    elemIds: number[],
    artboardId: number,
    artboardName: string,
    edge: 'left' | 'right' | 'top' | 'bottom' | 'inside',
    snapDx: number,
    snapDy: number
  ) => void;
  isPropertiesOpen?: boolean;
}

interface SmartGuide {
  type: 'x' | 'y';
  pos: number;
  start: number;
  end: number;
  label?: string;
}

interface ApproachTarget {
  type: 'x' | 'y';
  pos: number;
  start: number;
  end: number;
}

interface SpacingTarget {
  type: 'h' | 'v';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  isReference?: boolean;
}

const MemoizedElementSvg = React.memo<{ item: CanvasElement }>(
  ({ item }) => {
    const svgMarkup = useMemo(() => elementToSvg(item), [item]);
    return <g dangerouslySetInnerHTML={{ __html: svgMarkup }} />;
  },
  (prev, next) => prev.item === next.item
);

export const Canvas: React.FC<CanvasProps> = ({
  elements,
  selectedId,
  selectedIds = [],
  tool,
  selectionMode = 'single',
  smartSnap = true,
  viewport,
  layoutGuides,
  snapGrid,
  isPreview,
  onSelect,
  onSelectMultiple,
  onUpdateElement,
  onBatchUpdateElements,
  onCreateElement,
  onDiscardElement,
  onUpdateViewport,
  onEditText,
  onFitElement,
  onSnapshot,
  onPickColor,
  eyedropperTarget,
  onCancelEyedropper,
  onSwitchEyedropperTarget,
  onSetSelectionMode,
  onDragStateChange,
  onSmartAlignAction,
  onAutoSnapGroupToArtboard,
  isPropertiesOpen = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeGuides, setActiveGuides] = useState<SmartGuide[]>([]);
  const [approachTargets, setApproachTargets] = useState<ApproachTarget[]>([]);
  const [spacingTargets, setSpacingTargets] = useState<SpacingTarget[]>([]);
  const [distanceMarkers, setDistanceMarkers] = useState<DistanceMarker[]>([]);
  const [nearArtboardHint, setNearArtboardHint] = useState<{
    artboardId: number;
    artboardName: string;
    edge: 'left' | 'right' | 'top' | 'bottom' | 'inside';
    rail: { x1: number; y1: number; x2: number; y2: number };
  } | null>(null);
  const [smartAlignStatus, setSmartAlignStatus] = useState<{
    active: boolean;
    xLabel: string | null;
    yLabel: string | null;
    spaceLabel: string | null;
  } | null>(null);
  const [marquee, setMarquee] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [hoverColor, setHoverColor] = useState<{ color: string; x: number; y: number } | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const [isPinching, setIsPinching] = useState(false);

  const viewportRef = useRef<Viewport>(viewport);
  viewportRef.current = viewport;
  const lastSnapKeyRef = useRef<string>('');
  const nearArtboardSnapRef = useRef<{
    elemIds: number[];
    artboardId: number;
    artboardName: string;
    edge: 'left' | 'right' | 'top' | 'bottom' | 'inside';
    snapDx: number;
    snapDy: number;
  } | null>(null);
  const moveRafRef = useRef<number | null>(null);
  const pendingMoveRef = useRef<{
    clientX: number;
    clientY: number;
    pointerId: number;
    pointerType: string;
    shiftKey: boolean;
  } | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !/INPUT|TEXTAREA/.test((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (moveRafRef.current !== null) {
        cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = null;
      }
    };
  }, []);

  // Active selected IDs list (combines selectedId and selectedIds)
  const currentSelectedIds = Array.from(
    new Set([...selectedIds, ...(selectedId ? [selectedId] : [])])
  );

  const sampleElementColor = (el: CanvasElement | undefined): string => {
    if (!el) return '#2563eb';
    const extractFill = (): string | null => {
      if (el.radialGradient) {
        if (typeof el.radialGradient !== 'string' && el.radialGradient.stops?.[0]?.color) {
          return el.radialGradient.stops[0].color;
        }
      }
      if ('fill' in el && el.fill && el.fill !== 'none') return el.fill;
      return null;
    };
    if (eyedropperTarget === 'stroke') {
      if ('stroke' in el && el.stroke && el.stroke !== 'none') return el.stroke;
      return extractFill() || '#2563eb';
    } else {
      return extractFill() || ('stroke' in el && el.stroke && el.stroke !== 'none' ? el.stroke : '#2563eb');
    }
  };

  const dragRef = useRef<{
    type: 'pan' | 'move' | 'resize' | 'rotate' | 'create' | 'pen' | 'marquee';
    elemId?: number;
    elemIds?: number[];
    marqueeInitialIds?: number[];
    tappedCandidateId?: number;
    toggledOffId?: number;
    handle?: string;
    startX: number;
    startY: number;
    startScreenX?: number;
    startScreenY?: number;
    pointerType?: string;
    snapshotTaken?: boolean;
    initialElem?: CanvasElement;
    initialElems?: { elem: CanvasElement; startX: number; startY: number }[];
    children?: { elem: CanvasElement; startX: number; startY: number }[];
    initialViewport?: Viewport;
    createdElem?: CanvasElement;
    penAbsPts?: [number, number][];
    penSmooth?: boolean;
    hasMoved?: boolean;
    centerPt?: { x: number; y: number };
    initBBox?: { x: number; y: number; w: number; h: number };
  } | null>(null);

  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{
    dist: number;
    startZ: number;
    midX: number;
    midY: number;
    initialViewport: Viewport;
  } | null>(null);
  const lastTapRef = useRef<{ id: number; time: number }>({ id: 0, time: 0 });

  const anchorPinchGesture = () => {
    if (activePointers.current.size < 2) {
      pinchRef.current = null;
      setIsPinching(false);
      return;
    }
    const pts = Array.from(activePointers.current.values());
    const dist = Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
    const midX = (pts[0].x + pts[1].x) / 2;
    const midY = (pts[0].y + pts[1].y) / 2;
    const curVp = viewportRef.current;
    pinchRef.current = {
      dist,
      startZ: curVp.z,
      midX,
      midY,
      initialViewport: { ...curVp },
    };
    setIsPinching(true);
  };

  const snap = (val: number) => {
    return snapGrid ? Math.round(val / 8) * 8 : val;
  };

  // Screen to Canvas coordinate transform
  const screenToCanvas = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - viewport.x) / viewport.z,
      y: (clientY - rect.top - viewport.y) / viewport.z,
    };
  };

  // Zoom centered at cursor/screen coordinates
  const zoomAt = (screenX: number, screenY: number, newZ: number) => {
    const clampedZ = Math.min(4, Math.max(0.12, newZ));
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cursorX = screenX - rect.left;
    const cursorY = screenY - rect.top;

    onUpdateViewport((prev) => {
      const scaleRatio = clampedZ / prev.z;
      return {
        x: cursorX - (cursorX - prev.x) * scaleRatio,
        y: cursorY - (cursorY - prev.y) * scaleRatio,
        z: clampedZ,
      };
    });
  };

  // Wheel zoom and pan (bound once, reads live viewportRef for zero listener churn)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY < 0 ? 1.08 : 0.92;
        zoomAt(e.clientX, e.clientY, viewportRef.current.z * factor);
      } else {
        onUpdateViewport((prev) => ({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isPreview) return;
    try {
      containerRef.current?.setPointerCapture?.(e.pointerId);
    } catch {
      // Ignore synthetic pointer capture errors
    }
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Multi-touch pinch & two-finger pan (cancel accidental 1-finger action/creation when 2nd+ finger lands)
    if (activePointers.current.size >= 2) {
      if (
        dragRef.current &&
        (dragRef.current.type === 'create' || dragRef.current.type === 'pen') &&
        dragRef.current.elemId &&
        (!dragRef.current.hasMoved || (dragRef.current.penAbsPts?.length ?? 0) <= 3)
      ) {
        onDiscardElement?.(dragRef.current.elemId);
      }
      dragRef.current = null;
      setMarquee(null);
      setActiveGuides([]);
      setDistanceMarkers([]);
      anchorPinchGesture();
      return;
    }

    const canvasPt = screenToCanvas(e.clientX, e.clientY);
    const target = e.target as HTMLElement;
    const handle = target.getAttribute('data-handle');
    const elementIdAttr = target.closest('[data-id]')?.getAttribute('data-id');
    const clickedId = elementIdAttr ? parseInt(elementIdAttr) : null;

    // Pan tool (or holding Spacebar)
    if (tool === 'hand' || spacePressed) {
      dragRef.current = {
        type: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        initialViewport: { ...viewport },
      };
      return;
    }

    // Eyedropper color picking
    if (tool === 'eyedropper') {
      const el = clickedId ? elements.find((i) => i.id === clickedId) : undefined;
      const sampledColor = sampleElementColor(el);
      setHoverColor(null);
      if (onPickColor) {
        onPickColor(sampledColor);
      }
      return;
    }

    // Marquee / Lasso selection:
    // - Always active on empty canvas or unselected artboard interior
    // - In 'multi' selectionMode, also active when starting drag over any unselected element
    const clickedElem = clickedId ? elements.find((i) => i.id === clickedId) : null;
    const isArtboardInterior =
      clickedElem &&
      clickedElem.t === 'artboard' &&
      clickedId !== null &&
      !currentSelectedIds.includes(clickedId) &&
      canvasPt.y - clickedElem.y > 36;

    const startLassoInMulti =
      selectionMode === 'multi' &&
      (!clickedId || (clickedId !== null && !currentSelectedIds.includes(clickedId)));

    if (tool === 'select' && (!clickedId || isArtboardInterior || startLassoInMulti) && !handle) {
      if (!e.shiftKey && selectionMode !== 'multi') {
        onSelect(null);
        if (onSelectMultiple) onSelectMultiple([]);
      }
      dragRef.current = {
        type: 'marquee',
        startX: canvasPt.x,
        startY: canvasPt.y,
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        pointerType: e.pointerType,
        elemId: clickedId || undefined,
        tappedCandidateId:
          selectionMode === 'multi' && clickedId && clickedElem?.t !== 'artboard'
            ? clickedId
            : undefined,
        marqueeInitialIds: e.shiftKey ? currentSelectedIds : [],
      };
      return;
    }

    // Rotation handle (only unlocked elements & non-orientation-locked artboards)
    if (tool === 'select' && handle === 'rot' && currentSelectedIds.length > 0) {
      const selectedElems = elements.filter(
        (i) =>
          currentSelectedIds.includes(i.id) &&
          !i.locked &&
          !(i.t === 'artboard' && i.orientationLocked)
      );
      if (selectedElems.length > 0) {
        const bbox = getBoundingBox(selectedElems);
        const centerPt = {
          x: bbox.x + bbox.w / 2,
          y: bbox.y + bbox.h / 2,
        };
        dragRef.current = {
          type: 'rotate',
          elemIds: selectedElems.map((i) => i.id),
          startX: canvasPt.x,
          startY: canvasPt.y,
          startScreenX: e.clientX,
          startScreenY: e.clientY,
          snapshotTaken: false,
          initialElems: selectedElems.map((i) => ({ elem: { ...i }, startX: i.x, startY: i.y })),
          centerPt,
        };
        onDragStateChange?.(true);
        return;
      }
    }

    // Smart Align floating handle drag for multi-selection
    if (tool === 'select' && handle === 'smart-align' && currentSelectedIds.length > 1) {
      const movableElems = elements.filter(
        (i) => currentSelectedIds.includes(i.id) && !i.locked
      );
      if (movableElems.length > 0) {
        let children: { elem: CanvasElement; startX: number; startY: number }[] = [];
        movableElems.forEach((sel) => {
          if (sel.t === 'artboard') {
            const artChildren = elements
              .filter(
                (i) =>
                  i.t !== 'artboard' &&
                  !i.locked &&
                  !currentSelectedIds.includes(i.id) &&
                  isInside(i, sel)
              )
              .map((i) => ({ elem: i, startX: i.x, startY: i.y }));
            children = [...children, ...artChildren];
          }
        });
        lastSnapKeyRef.current = '';
        dragRef.current = {
          type: 'move',
          elemIds: movableElems.map((i) => i.id),
          startX: canvasPt.x,
          startY: canvasPt.y,
          startScreenX: e.clientX,
          startScreenY: e.clientY,
          pointerType: e.pointerType,
          snapshotTaken: false,
          initBBox: getBoundingBox(movableElems),
          initialElems: movableElems.map((i) => ({ elem: { ...i }, startX: i.x, startY: i.y })),
          children,
        };
        onDragStateChange?.(true);
        return;
      }
    }

    // Resize Handle (only unlocked elements & non-orientation-locked artboards)
    if (tool === 'select' && handle && currentSelectedIds.length > 0) {
      const selectedElems = elements.filter(
        (i) =>
          currentSelectedIds.includes(i.id) &&
          !i.locked &&
          !(i.t === 'artboard' && i.orientationLocked)
      );
      if (selectedElems.length > 0) {
        const bbox = getBoundingBox(selectedElems);
        lastSnapKeyRef.current = '';
        dragRef.current = {
          type: 'resize',
          elemIds: selectedElems.map((i) => i.id),
          handle,
          startX: canvasPt.x,
          startY: canvasPt.y,
          startScreenX: e.clientX,
          startScreenY: e.clientY,
          snapshotTaken: false,
          initBBox: bbox,
          initialElems: selectedElems.map((i) => ({ elem: { ...i }, startX: i.x, startY: i.y })),
        };
        onDragStateChange?.(true);
        return;
      }
    }

    // Selecting and moving an element
    if (tool === 'select' && clickedId) {
      const targetElem = elements.find((i) => i.id === clickedId);
      if (!targetElem) return;

      // Handle multi-select with Shift key or Multi-Selection Mode
      let nextSelectedIds: number[] = [];
      let toggledOffId: number | undefined;
      if (e.shiftKey) {
        if (currentSelectedIds.includes(clickedId)) {
          nextSelectedIds = currentSelectedIds.filter((id) => id !== clickedId);
        } else {
          nextSelectedIds = [...currentSelectedIds, clickedId];
        }
      } else if (selectionMode === 'multi' && currentSelectedIds.includes(clickedId)) {
        // Keep selected for drag-moving, or toggle off on tap-release without moving
        nextSelectedIds = currentSelectedIds;
        toggledOffId = clickedId;
      } else {
        if (targetElem.groupId) {
          nextSelectedIds = elements
            .filter((i) => i.groupId === targetElem.groupId && !i.hidden)
            .map((i) => i.id);
        } else if (currentSelectedIds.includes(clickedId) && currentSelectedIds.length > 1) {
          nextSelectedIds = currentSelectedIds;
        } else {
          nextSelectedIds = [clickedId];
        }
      }

      if (onSelectMultiple) {
        onSelectMultiple(nextSelectedIds);
      }
      onSelect(nextSelectedIds[0] || null);

      // Double-tap or double-click to edit text
      const now = Date.now();
      if (
        !targetElem.locked &&
        (targetElem.t === 'text' || targetElem.t === 'note' || targetElem.t === 'artboard') &&
        lastTapRef.current.id === clickedId &&
        now - lastTapRef.current.time < 380
      ) {
        onEditText(targetElem);
        return;
      }
      lastTapRef.current = { id: clickedId, time: now };

      // Only initiate drag if at least one selected element is unlocked
      const movableElems = elements.filter((i) => nextSelectedIds.includes(i.id) && !i.locked);
      if (movableElems.length === 0) {
        return;
      }

      // Children of any selected unlocked artboards
      let children: { elem: CanvasElement; startX: number; startY: number }[] = [];
      movableElems.forEach((sel) => {
        if (sel.t === 'artboard') {
          const artChildren = elements
            .filter((i) => i.t !== 'artboard' && !i.locked && !nextSelectedIds.includes(i.id) && isInside(i, sel))
            .map((i) => ({ elem: i, startX: i.x, startY: i.y }));
          children = [...children, ...artChildren];
        }
      });

      lastSnapKeyRef.current = '';
      dragRef.current = {
        type: 'move',
        elemIds: movableElems.map((i) => i.id),
        toggledOffId,
        startX: canvasPt.x,
        startY: canvasPt.y,
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        pointerType: e.pointerType,
        snapshotTaken: false,
        initBBox: getBoundingBox(movableElems),
        initialElems: movableElems.map((i) => ({ elem: { ...i }, startX: i.x, startY: i.y })),
        children,
      };
      onDragStateChange?.(true);
      return;
    }

    // Creating text directly
    if (tool === 'text') {
      onSnapshot();
      const newTextElem: CanvasElement = {
        id: Date.now(),
        t: 'text',
        x: snap(canvasPt.x),
        y: snap(canvasPt.y),
        w: 160,
        h: 40,
        text: 'New Text',
        fs: 26,
        fill: '#0f172a',
        b: true,
        ff: 'system-ui, -apple-system, sans-serif',
        op: 1,
      };
      fitTextDimensions(newTextElem);
      onCreateElement(newTextElem);
      onSelect(newTextElem.id);
      if (onSelectMultiple) onSelectMultiple([newTextElem.id]);
      onEditText(newTextElem);
      return;
    }

    // Creating pencil/pen path (store pts in local coords relative to path bounding box x, y)
    if (tool === 'pencil' || tool === 'pen') {
      onSnapshot();
      const isSmoothPen = tool === 'pen';
      const newPath: CanvasElement = {
        id: Date.now(),
        t: 'path',
        pts: [[0, 0]],
        stroke: isSmoothPen ? '#0f172a' : '#2563eb',
        sw: isSmoothPen ? 5 : 3,
        strokeStyle: 'solid',
        smooth: isSmoothPen,
        x: canvasPt.x,
        y: canvasPt.y,
        w: 4,
        h: 4,
        op: 1,
      };
      onCreateElement(newPath);
      dragRef.current = {
        type: 'pen',
        elemId: newPath.id,
        startX: canvasPt.x,
        startY: canvasPt.y,
        createdElem: newPath,
        penAbsPts: [[canvasPt.x, canvasPt.y]],
        penSmooth: isSmoothPen,
      };
      return;
    }

    // Creating other vector shapes (artboard, rect, oval, note, line, arrow)
    onSnapshot();
    const newElem: CanvasElement = {
      id: Date.now(),
      t: tool as ElementType,
      x: snap(canvasPt.x),
      y: snap(canvasPt.y),
      w: 0,
      h: 0,
      op: 1,
      rot: 0,
      fill: tool === 'note' ? '#fef08a' : tool === 'artboard' ? '#ffffff' : '#2563eb',
      stroke: tool === 'line' || tool === 'arrow' ? '#0f172a' : undefined,
      sw: tool === 'line' || tool === 'arrow' ? 3 : 0,
      r: tool === 'rect' ? 12 : undefined,
      text: tool === 'note' ? 'Quick note' : undefined,
      fs: tool === 'note' ? 15 : undefined,
      tc: tool === 'note' ? '#1e293b' : undefined,
      sh: tool === 'artboard' || tool === 'note',
      n: tool === 'artboard' ? `Artboard ${elements.filter((i) => i.t === 'artboard').length + 1}` : undefined,
    } as CanvasElement;

    onCreateElement(newElem);
    onSelect(newElem.id);
    if (onSelectMultiple) onSelectMultiple([newElem.id]);
    dragRef.current = {
      type: 'create',
      elemId: newElem.id,
      startX: canvasPt.x,
      startY: canvasPt.y,
      createdElem: newElem,
    };
  };

  // Pointer Move (rAF-coalesced for 60fps smoothness on 120Hz/240Hz mobile screens)
  const handlePointerMove = (e: React.PointerEvent) => {
    // Eyedropper hover inspection works even without pressing mouse button down
    if (tool === 'eyedropper' && activePointers.current.size === 0) {
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-id]');
      const id = target ? parseInt(target.getAttribute('data-id') || '0', 10) : null;
      const el = id ? elements.find((i) => i.id === id) : undefined;
      setHoverColor({ color: sampleElementColor(el), x: e.clientX, y: e.clientY });
      return;
    }

    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Multi-touch Pinch + Simultaneous Two-Finger Pan on Mobile/Tablet
    if (pinchRef.current && activePointers.current.size >= 2 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const pts = Array.from(activePointers.current.values());
      const dist = Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
      const curMidX = (pts[0].x + pts[1].x) / 2;
      const curMidY = (pts[0].y + pts[1].y) / 2;
      const scaleChange = dist / pinchRef.current.dist;
      const initVp = pinchRef.current.initialViewport;
      const newZ = Math.min(4, Math.max(0.12, pinchRef.current.startZ * scaleChange));

      const canvasMidX = (pinchRef.current.midX - rect.left - initVp.x) / initVp.z;
      const canvasMidY = (pinchRef.current.midY - rect.top - initVp.y) / initVp.z;

      onUpdateViewport({
        x: curMidX - rect.left - canvasMidX * newZ,
        y: curMidY - rect.top - canvasMidY * newZ,
        z: newZ,
      });
      return;
    }

    // Eyedropper hover color inspection while dragging/touching
    if (tool === 'eyedropper') {
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-id]');
      const id = target ? parseInt(target.getAttribute('data-id') || '0', 10) : null;
      const el = id ? elements.find((i) => i.id === id) : undefined;
      setHoverColor({ color: sampleElementColor(el), x: e.clientX, y: e.clientY });
      return;
    }

    if (!dragRef.current) return;

    // For freehand pen drawing, sample immediately so fast curves stay faithful
    if (dragRef.current.type === 'pen') {
      processDragPointerMove({
        clientX: e.clientX,
        clientY: e.clientY,
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        shiftKey: e.shiftKey,
      });
      return;
    }

    // Coalesce high-frequency move/resize/rotate/marquee/pan events to 1 update per display frame
    pendingMoveRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      shiftKey: e.shiftKey,
    };
    if (moveRafRef.current === null) {
      moveRafRef.current = window.requestAnimationFrame(() => {
        moveRafRef.current = null;
        const latest = pendingMoveRef.current;
        if (latest && dragRef.current) {
          processDragPointerMove(latest);
        }
      });
    }
  };

  const processDragPointerMove = (e: {
    clientX: number;
    clientY: number;
    pointerId: number;
    pointerType: string;
    shiftKey: boolean;
  }) => {
    if (!dragRef.current) return;
    const drag = dragRef.current;

    // Tap-slop & deferred snapshot guard for touch/mouse so finger taps don't cause accidental micro-drags or blank undo entries
    if (!drag.hasMoved && (drag.type === 'move' || drag.type === 'marquee')) {
      const distPx = Math.hypot(
        e.clientX - (drag.startScreenX ?? e.clientX),
        e.clientY - (drag.startScreenY ?? e.clientY)
      );
      const slop = drag.pointerType === 'touch' || e.pointerType === 'touch' ? 6 : 2.5;
      if (distPx < slop) {
        return;
      }
      if (drag.type === 'move' && !drag.snapshotTaken) {
        onSnapshot();
        drag.snapshotTaken = true;
      }
    }

    if ((drag.type === 'resize' || drag.type === 'rotate') && !drag.snapshotTaken) {
      onSnapshot();
      drag.snapshotTaken = true;
    }

    drag.hasMoved = true;

    // Pan
    if (drag.type === 'pan' && drag.initialViewport) {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      onUpdateViewport({
        ...drag.initialViewport,
        x: drag.initialViewport.x + dx,
        y: drag.initialViewport.y + dy,
      });
      return;
    }

    const canvasPt = screenToCanvas(e.clientX, e.clientY);

    // Marquee Selection Box
    if (drag.type === 'marquee') {
      const mBox = {
        x1: Math.min(drag.startX, canvasPt.x),
        y1: Math.min(drag.startY, canvasPt.y),
        x2: Math.max(drag.startX, canvasPt.x),
        y2: Math.max(drag.startY, canvasPt.y),
      };
      setMarquee(mBox);

      // Select all visible non-artboard elements whose normalized bounding box intersects marquee
      const intersectedIds = elements
        .filter((i) => {
          if (i.t === 'artboard' || i.hidden) return false;
          const elMinX = Math.min(i.x, i.x + i.w);
          const elMaxX = Math.max(i.x, i.x + i.w);
          const elMinY = Math.min(i.y, i.y + i.h);
          const elMaxY = Math.max(i.y, i.y + i.h);
          return (
            elMaxX >= mBox.x1 &&
            elMinX <= mBox.x2 &&
            elMaxY >= mBox.y1 &&
            elMinY <= mBox.y2
          );
        })
        .map((i) => i.id);

      const mergedIds = Array.from(
        new Set([...(drag.marqueeInitialIds || []), ...intersectedIds])
      );

      if (onSelectMultiple) {
        onSelectMultiple(mergedIds);
      }
      onSelect(mergedIds[0] || null);
      return;
    }

    // Rotation
    if (drag.type === 'rotate' && drag.elemIds && drag.centerPt && drag.initialElems) {
      const angleRad = Math.atan2(canvasPt.y - drag.centerPt.y, canvasPt.x - drag.centerPt.x);
      let deg = Math.round((angleRad * 180) / Math.PI) + 90;
      if (snapGrid && Math.abs(deg % 15) < 3) {
        deg = Math.round(deg / 15) * 15;
        const rotKey = `rot:${deg}`;
        if (lastSnapKeyRef.current !== rotKey) {
          lastSnapKeyRef.current = rotKey;
          hapticSnap();
        }
      } else {
        lastSnapKeyRef.current = '';
      }
      const patches = drag.initialElems.map(({ elem }) => ({
        id: elem.id,
        updates: { rot: deg } as Partial<CanvasElement>,
      }));
      if (onBatchUpdateElements) {
        onBatchUpdateElements(patches);
      } else {
        patches.forEach((p) => onUpdateElement(p.id, p.updates));
      }
      return;
    }

    // Moving elements (with Collective Multi-Select Smart Align, Relative Spacing Targets & Haptic Snap)
    if (drag.type === 'move' && drag.elemIds && drag.initialElems) {
      const dx = canvasPt.x - drag.startX;
      const dy = canvasPt.y - drag.startY;

      const groupInit = drag.initBBox || getBoundingBox(drag.initialElems.map((i) => i.elem));
      const groupW = groupInit.w;
      const groupH = groupInit.h;

      const rawGroupX = groupInit.x + dx;
      const rawGroupY = groupInit.y + dy;
      let groupNewX = snap(rawGroupX);
      let groupNewY = snap(rawGroupY);

      const detectedGuides: SmartGuide[] = [];
      const detectedApproaches: ApproachTarget[] = [];
      const detectedSpacing: SpacingTarget[] = [];
      const detectedDistanceMarkers: DistanceMarker[] = [];

      const threshold = Math.min(10, Math.max(4, 7 / viewport.z));
      const approachRange = threshold * 3.8;
      const isMultiMove = drag.initialElems.length > 1;

      const primary = drag.initialElems[0];
      const parentArtboard = elements.find(
        (i) =>
          i.t === 'artboard' &&
          !drag.elemIds?.includes(i.id) &&
          isInside(
            { ...primary.elem, x: groupNewX, y: groupNewY, w: groupW, h: groupH },
            i
          )
      );

      let snapXLabel: string | null = null;
      let snapYLabel: string | null = null;
      let snapSpaceLabel: string | null = null;
      const snapKeyParts: string[] = [];

      if (snapGrid) {
        snapKeyParts.push(`gx:${groupNewX}`, `gy:${groupNewY}`);
      }

      if (smartSnap) {
        let bestDx = threshold + 0.01;
        let snappedX = groupNewX;
        let matchedXTarget: number | null = null;
        let matchedXEdgeLabel = '';

        let bestDy = threshold + 0.01;
        let snappedY = groupNewY;
        let matchedYTarget: number | null = null;
        let matchedYEdgeLabel = '';

        const xAnchorsDrag = [
          { offset: 0, edge: 'Left' },
          { offset: groupW / 2, edge: 'Center' },
          { offset: groupW, edge: 'Right' },
        ];
        const yAnchorsDrag = [
          { offset: 0, edge: 'Top' },
          { offset: groupH / 2, edge: 'Middle' },
          { offset: groupH, edge: 'Bottom' },
        ];

        const targetsToSnap = elements.filter(
          (o) => !drag.elemIds!.includes(o.id) && !o.hidden
        );

        for (const other of targetsToSnap) {
          const oxPoints = [other.x, other.x + other.w / 2, other.x + other.w];
          const oyPoints = [other.y, other.y + other.h / 2, other.y + other.h];

          for (const dAnchor of xAnchorsDrag) {
            const dragVal = groupNewX + dAnchor.offset;
            for (const tVal of oxPoints) {
              const diff = Math.abs(dragVal - tVal);
              if (diff < bestDx) {
                bestDx = diff;
                snappedX = tVal - dAnchor.offset;
                matchedXTarget = tVal;
                matchedXEdgeLabel = other.t === 'artboard' ? `${dAnchor.edge} · Board` : dAnchor.edge;
              } else if (diff < approachRange && detectedApproaches.length < 4) {
                detectedApproaches.push({
                  type: 'x',
                  pos: tVal,
                  start: Math.min(groupNewY, other.y) - 8,
                  end: Math.max(groupNewY + groupH, other.y + other.h) + 8,
                });
              }
            }
          }

          for (const dAnchor of yAnchorsDrag) {
            const dragVal = groupNewY + dAnchor.offset;
            for (const tVal of oyPoints) {
              const diff = Math.abs(dragVal - tVal);
              if (diff < bestDy) {
                bestDy = diff;
                snappedY = tVal - dAnchor.offset;
                matchedYTarget = tVal;
                matchedYEdgeLabel = other.t === 'artboard' ? `${dAnchor.edge} · Board` : dAnchor.edge;
              } else if (diff < approachRange && detectedApproaches.length < 4) {
                detectedApproaches.push({
                  type: 'y',
                  pos: tVal,
                  start: Math.min(groupNewX, other.x) - 8,
                  end: Math.max(groupNewX + groupW, other.x + other.w) + 8,
                });
              }
            }
          }
        }

        // Relative Sibling Equal-Spacing Snap Targets
        const nonArtSiblings = targetsToSnap.filter((o) => o.t !== 'artboard');

        // Existing Horizontal sibling gaps
        if (nonArtSiblings.length >= 2) {
          const hGaps: { gap: number; a: CanvasElement; b: CanvasElement; midY: number }[] = [];
          const vGaps: { gap: number; a: CanvasElement; b: CanvasElement; midX: number }[] = [];

          for (let i = 0; i < nonArtSiblings.length; i++) {
            for (let j = i + 1; j < nonArtSiblings.length; j++) {
              const a = nonArtSiblings[i];
              const b = nonArtSiblings[j];
              const vOverlap = Math.min(a.y + a.h, b.y + b.h) > Math.max(a.y, b.y);
              if (vOverlap) {
                const [leftEl, rightEl] = a.x <= b.x ? [a, b] : [b, a];
                const g = Math.round(rightEl.x - (leftEl.x + leftEl.w));
                if (g >= 4 && g <= 160) {
                  const midY = (Math.max(leftEl.y, rightEl.y) + Math.min(leftEl.y + leftEl.h, rightEl.y + rightEl.h)) / 2;
                  hGaps.push({ gap: g, a: leftEl, b: rightEl, midY });
                }
              }
              const hOverlap = Math.min(a.x + a.w, b.x + b.w) > Math.max(a.x, b.x);
              if (hOverlap) {
                const [topEl, botEl] = a.y <= b.y ? [a, b] : [b, a];
                const g = Math.round(botEl.y - (topEl.y + topEl.h));
                if (g >= 4 && g <= 160) {
                  const midX = (Math.max(topEl.x, botEl.x) + Math.min(topEl.x + topEl.w, botEl.x + botEl.w)) / 2;
                  vGaps.push({ gap: g, a: topEl, b: botEl, midX });
                }
              }
            }
          }

          // Match dragged group to equal horizontal gap beside a sibling
          for (const sib of nonArtSiblings) {
            const vOverlap = Math.min(groupNewY + groupH, sib.y + sib.h) > Math.max(groupNewY, sib.y);
            if (!vOverlap) continue;
            const overlapMidY = (Math.max(groupNewY, sib.y) + Math.min(groupNewY + groupH, sib.y + sib.h)) / 2;

            for (const hg of hGaps) {
              if (hg.a.id === sib.id || hg.b.id === sib.id) {
                const rightCandidate = sib.x + sib.w + hg.gap;
                const diffR = Math.abs(rawGroupX - rightCandidate);
                if (diffR < bestDx) {
                  bestDx = diffR;
                  snappedX = rightCandidate;
                  matchedXTarget = null;
                  snapSpaceLabel = `Gap = ${hg.gap}px`;
                  snapKeyParts.push(`spX:${hg.gap}:${sib.id}`);
                  detectedSpacing.push(
                    {
                      type: 'h',
                      x1: hg.a.x + hg.a.w,
                      y1: hg.midY,
                      x2: hg.b.x,
                      y2: hg.midY,
                      label: `=${hg.gap}px`,
                      isReference: true,
                    },
                    {
                      type: 'h',
                      x1: sib.x + sib.w,
                      y1: overlapMidY,
                      x2: rightCandidate,
                      y2: overlapMidY,
                      label: `=${hg.gap}px`,
                    }
                  );
                }

                const leftCandidate = sib.x - hg.gap - groupW;
                const diffL = Math.abs(rawGroupX - leftCandidate);
                if (diffL < bestDx) {
                  bestDx = diffL;
                  snappedX = leftCandidate;
                  matchedXTarget = null;
                  snapSpaceLabel = `Gap = ${hg.gap}px`;
                  snapKeyParts.push(`spX:${hg.gap}:${sib.id}`);
                  detectedSpacing.push(
                    {
                      type: 'h',
                      x1: hg.a.x + hg.a.w,
                      y1: hg.midY,
                      x2: hg.b.x,
                      y2: hg.midY,
                      label: `=${hg.gap}px`,
                      isReference: true,
                    },
                    {
                      type: 'h',
                      x1: leftCandidate + groupW,
                      y1: overlapMidY,
                      x2: sib.x,
                      y2: overlapMidY,
                      label: `=${hg.gap}px`,
                    }
                  );
                }
              }
            }

            // Equal vertical spacing
            const hOverlap = Math.min(groupNewX + groupW, sib.x + sib.w) > Math.max(groupNewX, sib.x);
            if (hOverlap) {
              const overlapMidX = (Math.max(groupNewX, sib.x) + Math.min(groupNewX + groupW, sib.x + sib.w)) / 2;
              for (const vg of vGaps) {
                if (vg.a.id === sib.id || vg.b.id === sib.id) {
                  const bottomCandidate = sib.y + sib.h + vg.gap;
                  const diffB = Math.abs(rawGroupY - bottomCandidate);
                  if (diffB < bestDy) {
                    bestDy = diffB;
                    snappedY = bottomCandidate;
                    matchedYTarget = null;
                    snapSpaceLabel = `Gap = ${vg.gap}px`;
                    snapKeyParts.push(`spY:${vg.gap}:${sib.id}`);
                    detectedSpacing.push(
                      {
                        type: 'v',
                        x1: vg.midX,
                        y1: vg.a.y + vg.a.h,
                        x2: vg.midX,
                        y2: vg.b.y,
                        label: `=${vg.gap}px`,
                        isReference: true,
                      },
                      {
                        type: 'v',
                        x1: overlapMidX,
                        y1: sib.y + sib.h,
                        x2: overlapMidX,
                        y2: bottomCandidate,
                        label: `=${vg.gap}px`,
                      }
                    );
                  }

                  const topCandidate = sib.y - vg.gap - groupH;
                  const diffT = Math.abs(rawGroupY - topCandidate);
                  if (diffT < bestDy) {
                    bestDy = diffT;
                    snappedY = topCandidate;
                    matchedYTarget = null;
                    snapSpaceLabel = `Gap = ${vg.gap}px`;
                    snapKeyParts.push(`spY:${vg.gap}:${sib.id}`);
                    detectedSpacing.push(
                      {
                        type: 'v',
                        x1: vg.midX,
                        y1: vg.a.y + vg.a.h,
                        x2: vg.midX,
                        y2: vg.b.y,
                        label: `=${vg.gap}px`,
                        isReference: true,
                      },
                      {
                        type: 'v',
                        x1: overlapMidX,
                        y1: topCandidate + groupH,
                        x2: overlapMidX,
                        y2: sib.y,
                        label: `=${vg.gap}px`,
                      }
                    );
                  }
                }
              }
            }
          }
        }

        if (bestDx <= threshold) {
          groupNewX = Math.round(snappedX * 10) / 10;
          if (matchedXTarget !== null) {
            snapXLabel = matchedXEdgeLabel;
            snapKeyParts.push(`x:${Math.round(matchedXTarget * 10)}`);
            let minY = groupNewY;
            let maxY = groupNewY + groupH;
            for (const other of targetsToSnap) {
              if (
                Math.abs(other.x - matchedXTarget) < 0.8 ||
                Math.abs(other.x + other.w / 2 - matchedXTarget) < 0.8 ||
                Math.abs(other.x + other.w - matchedXTarget) < 0.8
              ) {
                minY = Math.min(minY, other.y);
                maxY = Math.max(maxY, other.y + other.h);
              }
            }
            detectedGuides.push({
              type: 'x',
              pos: matchedXTarget,
              start: minY - 12,
              end: maxY + 12,
              label: matchedXEdgeLabel,
            });
          }
        }

        if (bestDy <= threshold) {
          groupNewY = Math.round(snappedY * 10) / 10;
          if (matchedYTarget !== null) {
            snapYLabel = matchedYEdgeLabel;
            snapKeyParts.push(`y:${Math.round(matchedYTarget * 10)}`);
            let minX = groupNewX;
            let maxX = groupNewX + groupW;
            for (const other of targetsToSnap) {
              if (
                Math.abs(other.y - matchedYTarget) < 0.8 ||
                Math.abs(other.y + other.h / 2 - matchedYTarget) < 0.8 ||
                Math.abs(other.y + other.h - matchedYTarget) < 0.8
              ) {
                minX = Math.min(minX, other.x);
                maxX = Math.max(maxX, other.x + other.w);
              }
            }
            detectedGuides.push({
              type: 'y',
              pos: matchedYTarget,
              start: minX - 12,
              end: maxX + 12,
              label: matchedYEdgeLabel,
            });
          }
        }
      }

      // Trigger mobile haptic vibration when locking onto a new snap line / grid cell
      const nextSnapKey = snapKeyParts.join('|');
      if (nextSnapKey && nextSnapKey !== lastSnapKeyRef.current) {
        hapticSnap();
      }
      lastSnapKeyRef.current = nextSnapKey;

      const groupCenterX = groupNewX + groupW / 2;
      const groupCenterY = groupNewY + groupH / 2;

      // Distance to artboard edges (plus equal-margin callouts when centered inside artboard!)
      if (parentArtboard) {
        const leftDist = groupNewX - parentArtboard.x;
        const rightDist = parentArtboard.x + parentArtboard.w - (groupNewX + groupW);
        const topDist = groupNewY - parentArtboard.y;
        const bottomDist = parentArtboard.y + parentArtboard.h - (groupNewY + groupH);
        const symmetricH = Math.abs(leftDist - rightDist) < 1.2 && leftDist > 2;
        const symmetricV = Math.abs(topDist - bottomDist) < 1.2 && topDist > 2;

        if (symmetricH) {
          const marginLabel = `=${Math.round(leftDist)}px`;
          detectedSpacing.push(
            {
              type: 'h',
              x1: parentArtboard.x,
              y1: groupCenterY,
              x2: groupNewX,
              y2: groupCenterY,
              label: marginLabel,
            },
            {
              type: 'h',
              x1: groupNewX + groupW,
              y1: groupCenterY,
              x2: parentArtboard.x + parentArtboard.w,
              y2: groupCenterY,
              label: marginLabel,
            }
          );
          if (!snapSpaceLabel) snapSpaceLabel = `Margins = ${Math.round(leftDist)}px`;
        } else {
          if (leftDist > 0 && leftDist < 120) {
            detectedDistanceMarkers.push({
              type: 'h',
              x1: parentArtboard.x,
              y1: groupCenterY,
              x2: groupNewX,
              y2: groupCenterY,
              distance: Math.round(leftDist),
              label: `${Math.round(leftDist)}px`,
            });
          }
          if (rightDist > 0 && rightDist < 120) {
            detectedDistanceMarkers.push({
              type: 'h',
              x1: groupNewX + groupW,
              y1: groupCenterY,
              x2: parentArtboard.x + parentArtboard.w,
              y2: groupCenterY,
              distance: Math.round(rightDist),
              label: `${Math.round(rightDist)}px`,
            });
          }
        }

        if (symmetricV) {
          const marginLabel = `=${Math.round(topDist)}px`;
          detectedSpacing.push(
            {
              type: 'v',
              x1: groupCenterX,
              y1: parentArtboard.y,
              x2: groupCenterX,
              y2: groupNewY,
              label: marginLabel,
            },
            {
              type: 'v',
              x1: groupCenterX,
              y1: groupNewY + groupH,
              x2: groupCenterX,
              y2: parentArtboard.y + parentArtboard.h,
              label: marginLabel,
            }
          );
          if (!snapSpaceLabel) snapSpaceLabel = `Margins = ${Math.round(topDist)}px`;
        } else if (topDist > 0 && topDist < 120) {
          detectedDistanceMarkers.push({
            type: 'v',
            x1: groupCenterX,
            y1: parentArtboard.y,
            x2: groupCenterX,
            y2: groupNewY,
            distance: Math.round(topDist),
            label: `${Math.round(topDist)}px`,
          });
        }
      }

      // Distance Markers between nearby elements
      for (const other of elements) {
        if (drag.elemIds.includes(other.id) || other.t === 'artboard' || other.hidden) continue;

        const gapLeft = groupNewX - (other.x + other.w);
        const hasVOverlap =
          Math.min(groupNewY + groupH, other.y + other.h) > Math.max(groupNewY, other.y);

        if (gapLeft > 0 && gapLeft < 140 && hasVOverlap) {
          const midY = (Math.max(groupNewY, other.y) + Math.min(groupNewY + groupH, other.y + other.h)) / 2;
          detectedDistanceMarkers.push({
            type: 'h',
            x1: other.x + other.w,
            y1: midY,
            x2: groupNewX,
            y2: midY,
            distance: Math.round(gapLeft),
            label: `${Math.round(gapLeft)}px`,
          });
        }

        const gapRight = other.x - (groupNewX + groupW);
        if (gapRight > 0 && gapRight < 140 && hasVOverlap) {
          const midY = (Math.max(groupNewY, other.y) + Math.min(groupNewY + groupH, other.y + other.h)) / 2;
          detectedDistanceMarkers.push({
            type: 'h',
            x1: groupNewX + groupW,
            y1: midY,
            x2: other.x,
            y2: midY,
            distance: Math.round(gapRight),
            label: `${Math.round(gapRight)}px`,
          });
        }

        const gapTop = groupNewY - (other.y + other.h);
        const hasHOverlap =
          Math.min(groupNewX + groupW, other.x + other.w) > Math.max(groupNewX, other.x);

        if (gapTop > 0 && gapTop < 140 && hasHOverlap) {
          const midX = (Math.max(groupNewX, other.x) + Math.min(groupNewX + groupW, other.x + other.w)) / 2;
          detectedDistanceMarkers.push({
            type: 'v',
            x1: midX,
            y1: other.y + other.h,
            x2: midX,
            y2: groupNewY,
            distance: Math.round(gapTop),
            label: `${Math.round(gapTop)}px`,
          });
        }

        const gapBottom = other.y - (groupNewY + groupH);
        if (gapBottom > 0 && gapBottom < 140 && hasHOverlap) {
          const midX = (Math.max(groupNewX, other.x) + Math.min(groupNewX + groupW, other.x + other.w)) / 2;
          detectedDistanceMarkers.push({
            type: 'v',
            x1: midX,
            y1: groupNewY + groupH,
            x2: midX,
            y2: other.y,
            distance: Math.round(gapBottom),
            label: `${Math.round(gapBottom)}px`,
          });
        }
      }

      // Detect 'Snap to Nearest Artboard' edge proximity when dragging a group of non-artboard elements
      const isGroupDrag =
        drag.initialElems.every((item) => item.elem.t !== 'artboard') &&
        (drag.initialElems.length > 1 ||
          drag.initialElems.some((item) => typeof item.elem.groupId === 'number'));

      if (isGroupDrag) {
        const artboards = elements.filter(
          (i) => i.t === 'artboard' && !i.hidden && !drag.elemIds!.includes(i.id)
        );
        const edgeZone = Math.min(34, Math.max(18, 26 / viewport.z));
        let bestCandidate: {
          artboard: CanvasElement;
          edge: 'left' | 'right' | 'top' | 'bottom' | 'inside';
          dist: number;
          snapDx: number;
          snapDy: number;
          rail: { x1: number; y1: number; x2: number; y2: number };
        } | null = null;

        const gL = groupNewX;
        const gR = groupNewX + groupW;
        const gT = groupNewY;
        const gB = groupNewY + groupH;

        for (const ab of artboards) {
          const aL = ab.x;
          const aR = ab.x + ab.w;
          const aT = ab.y;
          const aB = ab.y + ab.h;

          const nearVertSpan = gB >= aT - edgeZone && gT <= aB + edgeZone;
          const nearHorizSpan = gR >= aL - edgeZone && gL <= aR + edgeZone;

          // 1. Near Left Edge (approaching from outside right edge of group OR straddling/aligning left)
          if (nearVertSpan) {
            const dLeftAlign = Math.abs(gL - aL);
            const dRightToLeft = Math.abs(gR - aL);
            if (dLeftAlign <= edgeZone || dRightToLeft <= edgeZone) {
              const dist = Math.min(dLeftAlign, dRightToLeft);
              const clampedY = Math.max(aT, Math.min(aB - groupH, gT));
              const dyPull = Math.abs(clampedY - gT) < 64 ? clampedY - gT : 0;
              if (!bestCandidate || dist < bestCandidate.dist) {
                bestCandidate = {
                  artboard: ab,
                  edge: 'left',
                  dist,
                  snapDx: aL - gL,
                  snapDy: dyPull,
                  rail: { x1: aL, y1: aT, x2: aL, y2: aB },
                };
              }
            }

            // 2. Near Right Edge
            const dRightAlign = Math.abs(gR - aR);
            const dLeftToRight = Math.abs(gL - aR);
            if (dRightAlign <= edgeZone || dLeftToRight <= edgeZone) {
              const dist = Math.min(dRightAlign, dLeftToRight);
              const clampedY = Math.max(aT, Math.min(aB - groupH, gT));
              const dyPull = Math.abs(clampedY - gT) < 64 ? clampedY - gT : 0;
              if (!bestCandidate || dist < bestCandidate.dist) {
                bestCandidate = {
                  artboard: ab,
                  edge: 'right',
                  dist,
                  snapDx: aR - groupW - gL,
                  snapDy: dyPull,
                  rail: { x1: aR, y1: aT, x2: aR, y2: aB },
                };
              }
            }
          }

          // 3. Near Top Edge
          if (nearHorizSpan) {
            const dTopAlign = Math.abs(gT - aT);
            const dBottomToTop = Math.abs(gB - aT);
            if (dTopAlign <= edgeZone || dBottomToTop <= edgeZone) {
              const dist = Math.min(dTopAlign, dBottomToTop);
              const clampedX = Math.max(aL, Math.min(aR - groupW, gL));
              const dxPull = Math.abs(clampedX - gL) < 64 ? clampedX - gL : 0;
              if (!bestCandidate || dist < bestCandidate.dist) {
                bestCandidate = {
                  artboard: ab,
                  edge: 'top',
                  dist,
                  snapDx: dxPull,
                  snapDy: aT - gT,
                  rail: { x1: aL, y1: aT, x2: aR, y2: aT },
                };
              }
            }

            // 4. Near Bottom Edge
            const dBottomAlign = Math.abs(gB - aB);
            const dTopToBottom = Math.abs(gT - aB);
            if (dBottomAlign <= edgeZone || dTopToBottom <= edgeZone) {
              const dist = Math.min(dBottomAlign, dTopToBottom);
              const clampedX = Math.max(aL, Math.min(aR - groupW, gL));
              const dxPull = Math.abs(clampedX - gL) < 64 ? clampedX - gL : 0;
              if (!bestCandidate || dist < bestCandidate.dist) {
                bestCandidate = {
                  artboard: ab,
                  edge: 'bottom',
                  dist,
                  snapDx: dxPull,
                  snapDy: aB - groupH - gT,
                  rail: { x1: aL, y1: aB, x2: aR, y2: aB },
                };
              }
            }
          }
        }

        if (bestCandidate) {
          const abName =
            bestCandidate.artboard.t === 'artboard' && 'n' in bestCandidate.artboard
              ? bestCandidate.artboard.n
              : 'Artboard';
          nearArtboardSnapRef.current = {
            elemIds: drag.elemIds,
            artboardId: bestCandidate.artboard.id,
            artboardName: abName,
            edge: bestCandidate.edge,
            snapDx: Math.round(bestCandidate.snapDx * 10) / 10,
            snapDy: Math.round(bestCandidate.snapDy * 10) / 10,
          };
          setNearArtboardHint({
            artboardId: bestCandidate.artboard.id,
            artboardName: abName,
            edge: bestCandidate.edge,
            rail: bestCandidate.rail,
          });
          if (!snapSpaceLabel) {
            snapSpaceLabel = `Snap → ${abName}`;
          }
        } else {
          nearArtboardSnapRef.current = null;
          setNearArtboardHint(null);
        }
      } else {
        nearArtboardSnapRef.current = null;
        setNearArtboardHint(null);
      }

      setActiveGuides(detectedGuides);
      setApproachTargets(isMultiMove ? detectedApproaches : []);
      setSpacingTargets(detectedSpacing.slice(0, 4));
      setDistanceMarkers(detectedDistanceMarkers.slice(0, 4));
      if (isMultiMove) {
        setSmartAlignStatus({
          active: true,
          xLabel: snapXLabel,
          yLabel: snapYLabel,
          spaceLabel: snapSpaceLabel,
        });
      }

      // Effective delta from group bounding box movement
      const effectiveDx = groupNewX - groupInit.x;
      const effectiveDy = groupNewY - groupInit.y;

      const patches: { id: number; updates: Partial<CanvasElement> }[] = drag.initialElems.map(
        ({ elem, startX, startY }) => ({
          id: elem.id,
          updates: {
            x: Math.round((startX + effectiveDx) * 10) / 10,
            y: Math.round((startY + effectiveDy) * 10) / 10,
          },
        })
      );

      if (drag.children && drag.children.length > 0) {
        drag.children.forEach((child) => {
          patches.push({
            id: child.elem.id,
            updates: {
              x: Math.round((child.startX + effectiveDx) * 10) / 10,
              y: Math.round((child.startY + effectiveDy) * 10) / 10,
            },
          });
        });
      }

      if (onBatchUpdateElements) {
        onBatchUpdateElements(patches);
      } else {
        patches.forEach((p) => onUpdateElement(p.id, p.updates));
      }
      return;
    }

    // Resizing element (Single or Bulk Group Bounding Box - all 8 handles)
    if (drag.type === 'resize' && drag.elemIds && drag.initBBox && drag.initialElems) {
      const init = drag.initBBox;
      const h = drag.handle || '';
      const dx = canvasPt.x - drag.startX;
      const dy = canvasPt.y - drag.startY;
      const minSize = 16;

      let newLeft = init.x;
      let newTop = init.y;
      let newRight = init.x + init.w;
      let newBottom = init.y + init.h;

      if (h.includes('l')) {
        newLeft = Math.min(init.x + init.w - minSize, snap(init.x + dx));
      }
      if (h.includes('r')) {
        newRight = Math.max(init.x + minSize, snap(init.x + init.w + dx));
      }
      if (h.includes('t')) {
        newTop = Math.min(init.y + init.h - minSize, snap(init.y + dy));
      }
      if (h.includes('b')) {
        newBottom = Math.max(init.y + minSize, snap(init.y + init.h + dy));
      }

      let newX = newLeft;
      let newY = newTop;
      let newW = Math.max(minSize, newRight - newLeft);
      let newH = Math.max(minSize, newBottom - newTop);

      if (snapGrid) {
        const resSnapKey = `rs:${Math.round(newW)}x${Math.round(newH)}`;
        if (lastSnapKeyRef.current !== resSnapKey) {
          lastSnapKeyRef.current = resSnapKey;
          hapticSnap();
        }
      }

      // Proportional lock when Shift held or element has aspectLocked enabled (for corners)
      const isCorner = h.length === 2;
      const isAspectLocked =
        drag.initialElems.length === 1 && !!drag.initialElems[0].elem.aspectLocked;
      if (isCorner && (e.shiftKey || isAspectLocked) && init.w > 0 && init.h > 0) {
        const aspect = init.w / init.h;
        if (newW / newH > aspect) {
          newW = Math.max(minSize, newH * aspect);
        } else {
          newH = Math.max(minSize, newW / aspect);
        }
        if (h.includes('l')) newX = init.x + init.w - newW;
        if (h.includes('t')) newY = init.y + init.h - newH;
      }

      const scaleX = init.w > 0 ? newW / init.w : 1;
      const scaleY = init.h > 0 ? newH / init.h : 1;

      const patches: { id: number; updates: Partial<CanvasElement> }[] = drag.initialElems.map(
        ({ elem, startX, startY }) => {
          const relX = startX - init.x;
          const relY = startY - init.y;
          const isVectorLine = elem.t === 'line' || elem.t === 'arrow';
          const nextW = isVectorLine
            ? Math.round(elem.w * scaleX * 10) / 10
            : Math.max(6, Math.round(elem.w * scaleX * 10) / 10);
          const nextH = isVectorLine
            ? Math.round(elem.h * scaleY * 10) / 10
            : Math.max(6, Math.round(elem.h * scaleY * 10) / 10);
          const extraUpdates: Partial<CanvasElement> =
            elem.t === 'path'
              ? {
                  pts: elem.pts.map(([px, py]) => [
                    Math.round(px * scaleX * 10) / 10,
                    Math.round(py * scaleY * 10) / 10,
                  ]),
                }
              : {};

          return {
            id: elem.id,
            updates: {
              x: Math.round((newX + relX * scaleX) * 10) / 10,
              y: Math.round((newY + relY * scaleY) * 10) / 10,
              w: nextW,
              h: nextH,
              ...extraUpdates,
            },
          };
        }
      );

      if (onBatchUpdateElements) {
        onBatchUpdateElements(patches);
      } else {
        patches.forEach((p) => onUpdateElement(p.id, p.updates));
      }
      return;
    }

    // Creating shape by dragging
    if (drag.type === 'create' && drag.elemId) {
      const minX = Math.min(drag.startX, canvasPt.x);
      const minY = Math.min(drag.startY, canvasPt.y);
      const w = Math.abs(canvasPt.x - drag.startX);
      const h = Math.abs(canvasPt.y - drag.startY);

      if (drag.createdElem?.t === 'line' || drag.createdElem?.t === 'arrow') {
        onUpdateElement(drag.elemId, {
          w: canvasPt.x - drag.startX,
          h: canvasPt.y - drag.startY,
        });
      } else {
        onUpdateElement(drag.elemId, {
          x: snap(minX),
          y: snap(minY),
          w: Math.max(8, snap(w)),
          h: Math.max(8, snap(h)),
        });
      }
      return;
    }

    // Freehand pen drawing (120Hz local buffer -> normalized bounding box + smooth points)
    if (drag.type === 'pen' && drag.elemId && drag.penAbsPts) {
      const absPts = drag.penAbsPts;
      const lastPt = absPts[absPts.length - 1];
      if (Math.hypot(canvasPt.x - lastPt[0], canvasPt.y - lastPt[1]) * viewport.z > 2.5) {
        absPts.push([canvasPt.x, canvasPt.y]);
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const [ax, ay] of absPts) {
          if (ax < minX) minX = ax;
          if (ay < minY) minY = ay;
          if (ax > maxX) maxX = ax;
          if (ay > maxY) maxY = ay;
        }
        onUpdateElement(drag.elemId, {
          x: Math.round(minX * 10) / 10,
          y: Math.round(minY * 10) / 10,
          w: Math.max(4, Math.round((maxX - minX) * 10) / 10),
          h: Math.max(4, Math.round((maxY - minY) * 10) / 10),
          pts: absPts.map(([ax, ay]) => [
            Math.round((ax - minX) * 10) / 10,
            Math.round((ay - minY) * 10) / 10,
          ]),
        } as any);
      }
    }
  };

  // Pointer Up / Cancel
  const handlePointerUp = (e: React.PointerEvent) => {
    if (moveRafRef.current !== null) {
      window.cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = null;
      // Flush any trailing coordinate cleanly before drop if non-pen drag
      if (pendingMoveRef.current && dragRef.current && dragRef.current.type !== 'pen') {
        processDragPointerMove(pendingMoveRef.current);
      }
    }
    pendingMoveRef.current = null;

    try {
      containerRef.current?.releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignore release errors
    }
    activePointers.current.delete(e.pointerId);

    if (activePointers.current.size >= 2) {
      // Re-anchor smoothly if 3+ fingers were down and one lifted
      anchorPinchGesture();
    } else {
      pinchRef.current = null;
      setIsPinching(false);
    }

    const pendingArtboardSnap = nearArtboardSnapRef.current;
    nearArtboardSnapRef.current = null;

    setActiveGuides([]);
    setApproachTargets([]);
    setSpacingTargets([]);
    setDistanceMarkers([]);
    setNearArtboardHint(null);
    setSmartAlignStatus(null);
    setMarquee(null);
    setHoverColor(null);
    lastSnapKeyRef.current = '';
    onDragStateChange?.(false);

    if (!dragRef.current) return;
    const drag = dragRef.current;
    dragRef.current = null;

    if (
      drag.type === 'move' &&
      drag.hasMoved &&
      pendingArtboardSnap &&
      onAutoSnapGroupToArtboard
    ) {
      onAutoSnapGroupToArtboard(
        pendingArtboardSnap.elemIds,
        pendingArtboardSnap.artboardId,
        pendingArtboardSnap.artboardName,
        pendingArtboardSnap.edge,
        pendingArtboardSnap.snapDx,
        pendingArtboardSnap.snapDy
      );
      hapticSuccess();
    } else if (
      (drag.hasMoved &&
        (drag.type === 'move' ||
          drag.type === 'resize' ||
          drag.type === 'rotate' ||
          drag.type === 'create' ||
          drag.type === 'pen')) ||
      (drag.type === 'create' && !drag.hasMoved)
    ) {
      hapticDrop();
    }

    // Finalize Pen/Pencil path with Ramer-Douglas-Peucker simplification & tight bounding box
    if (drag.type === 'pen' && drag.elemId && drag.penAbsPts && drag.penAbsPts.length > 2) {
      const tolerance = drag.penSmooth ? 2.2 / Math.max(0.4, viewport.z) : 0.8 / Math.max(0.4, viewport.z);
      const simplified = simplifyPoints(drag.penAbsPts, tolerance);
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const [ax, ay] of simplified) {
        if (ax < minX) minX = ax;
        if (ay < minY) minY = ay;
        if (ax > maxX) maxX = ax;
        if (ay > maxY) maxY = ay;
      }
      onUpdateElement(drag.elemId, {
        x: Math.round(minX * 10) / 10,
        y: Math.round(minY * 10) / 10,
        w: Math.max(4, Math.round((maxX - minX) * 10) / 10),
        h: Math.max(4, Math.round((maxY - minY) * 10) / 10),
        pts: simplified.map(([ax, ay]) => [
          Math.round((ax - minX) * 10) / 10,
          Math.round((ay - minY) * 10) / 10,
        ]),
        smooth: drag.penSmooth,
      } as any);
    }

    // Tap in Multi-Select mode: toggle tapped item in/out of selection without needing Shift key!
    if (drag.type === 'marquee' && !drag.hasMoved) {
      if (selectionMode === 'multi' && drag.tappedCandidateId) {
        const nextIds = currentSelectedIds.includes(drag.tappedCandidateId)
          ? currentSelectedIds.filter((id) => id !== drag.tappedCandidateId)
          : [...currentSelectedIds, drag.tappedCandidateId];
        onSelectMultiple?.(nextIds);
        onSelect(nextIds[0] || null);
      } else if (drag.elemId) {
        onSelect(drag.elemId);
        onSelectMultiple?.([drag.elemId]);
      } else if (selectionMode === 'multi') {
        onSelect(null);
        onSelectMultiple?.([]);
      }
    }

    if (drag.type === 'move' && !drag.hasMoved && drag.toggledOffId) {
      const nextIds = currentSelectedIds.filter((id) => id !== drag.toggledOffId);
      onSelectMultiple?.(nextIds);
      onSelect(nextIds[0] || null);
    }

    // Tap to create default dimension
    if (drag.type === 'create' && drag.elemId && !drag.hasMoved) {
      const defaults: Record<string, [number, number]> = {
        artboard: [380, 780],
        rect: [180, 96],
        oval: [110, 110],
        note: [200, 150],
        line: [160, 0],
        arrow: [160, 0],
      };
      const def = defaults[drag.createdElem?.t || 'rect'] || [180, 96];
      onUpdateElement(drag.elemId, { w: def[0], h: def[1] });
    }
  };

  const selectedElements = elements.filter((i) => currentSelectedIds.includes(i.id));
  const selectionBBox = selectedElements.length > 0 ? getBoundingBox(selectedElements) : null;

  const selectedGroupPaths = useMemo(() => {
    if (isPreview || selectedElements.length === 0) return [];
    const activeGroupIds = new Set<number>();
    selectedElements.forEach((el) => {
      if (typeof el.groupId === 'number') {
        activeGroupIds.add(el.groupId);
      }
    });
    if (activeGroupIds.size === 0) return [];

    const paths: {
      groupId: number;
      points: { id: number; cx: number; cy: number }[];
      pointsAttr: string;
    }[] = [];

    activeGroupIds.forEach((groupId) => {
      const members = elements.filter((el) => el.groupId === groupId && !el.hidden);
      if (members.length < 2) return;

      const remaining = members.map((m) => ({
        id: m.id,
        cx: m.x + m.w / 2,
        cy: m.y + m.h / 2,
      }));

      // Order spatially via nearest-neighbor chain from top-leftmost member for a clean, legible path
      remaining.sort((a, b) => a.cy + a.cx * 0.5 - (b.cy + b.cx * 0.5));
      const ordered = [remaining.shift()!];
      while (remaining.length > 0) {
        const last = ordered[ordered.length - 1];
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < remaining.length; i++) {
          const d = Math.hypot(remaining[i].cx - last.cx, remaining[i].cy - last.cy);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }
        ordered.push(remaining.splice(bestIdx, 1)[0]);
      }

      paths.push({
        groupId,
        points: ordered,
        pointsAttr: ordered.map((p) => `${p.cx},${p.cy}`).join(' '),
      });
    });

    return paths;
  }, [isPreview, elements, selectedElements]);

  const allSelectedLocked =
    selectedElements.length > 0 && selectedElements.every((el) => !!el.locked);
  const hasOrientationLockedArtboard = selectedElements.some(
    (el) => el.t === 'artboard' && !!el.orientationLocked
  );
  const lockedArtboard =
    selectedElements.length === 1 &&
    selectedElements[0].t === 'artboard' &&
    selectedElements[0].orientationLocked
      ? selectedElements[0]
      : null;
  const orientationBadgeText = lockedArtboard
    ? `Resize Locked · ${(lockedArtboard.lockedOrientation || (lockedArtboard.w >= lockedArtboard.h ? 'landscape' : 'portrait')) === 'landscape' ? 'Landscape' : 'Portrait'}`
    : '';

  // Resize handle renderer (44px touch-friendly hit target for mobile/tablet accuracy)
  const renderHandle = (
    handleName: string,
    hx: number,
    hy: number,
    cursorClass: string
  ) => {
    const handleSize = 11 / viewport.z;
    const hitSize = 44 / viewport.z;

    return (
      <g
        key={handleName}
        transform={`translate(${hx}, ${hy})`}
        className={cursorClass}
      >
        <rect
          data-handle={handleName}
          x={-hitSize / 2}
          y={-hitSize / 2}
          width={hitSize}
          height={hitSize}
          fill="transparent"
        />
        <rect
          x={-handleSize / 2}
          y={-handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="#ffffff"
          stroke="#2563eb"
          strokeWidth={2 / viewport.z}
          rx={2 / viewport.z}
          style={{ pointerEvents: 'none' }}
        />
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => setHoverColor(null)}
      className={`fixed inset-0 top-14 select-none touch-none overflow-hidden transition-colors ${
        isPreview
          ? 'bg-slate-900 top-0'
          : 'bg-[#ececea] dark:bg-[#18181a]'
      }`}
      style={{
        cursor:
          tool === 'hand' || spacePressed
            ? 'grab'
            : tool === 'select'
            ? 'default'
            : 'crosshair',
      }}
    >
      <svg className="w-full h-full block pointer-events-none">
        <defs>
          <g dangerouslySetInnerHTML={{ __html: DEFS }} />
          {snapGrid && (
            <pattern
              id="canvas-snap-grid"
              width={16 * viewport.z}
              height={16 * viewport.z}
              patternUnits="userSpaceOnUse"
              x={viewport.x % (16 * viewport.z)}
              y={viewport.y % (16 * viewport.z)}
            >
              <circle
                cx={1}
                cy={1}
                r={Math.max(0.75, Math.min(1.6, 1.1 * viewport.z))}
                fill="currentColor"
                className="text-gray-400/45 dark:text-gray-500/45"
              />
            </pattern>
          )}
        </defs>
        {snapGrid && !isPreview && (
          <rect width="100%" height="100%" fill="url(#canvas-snap-grid)" />
        )}

        {/* Transformed Canvas Root */}
        <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.z})`}>
          {/* 1. Render Artboards (Memoized per element for 60fps smoothness) */}
          {elements
            .filter((item) => item.t === 'artboard' && !item.hidden)
            .map((artboard) => (
              <g key={artboard.id} data-id={artboard.id} className="pointer-events-auto">
                <MemoizedElementSvg item={artboard} />

                {/* Artboard Header Label */}
                {!isPreview && (
                  <g transform={`translate(${artboard.x}, ${artboard.y})`}>
                    <rect
                      y={-32}
                      width={artboard.w}
                      height={28}
                      fill="transparent"
                      className="cursor-pointer"
                    />
                    <text
                      y={-12}
                      fontSize={14}
                      fontWeight="600"
                      fill="#64748b"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {escapeHtml(artboard.t === 'artboard' && 'n' in artboard ? artboard.n : 'Artboard')}
                    </text>
                  </g>
                )}

                {/* Layout Guides */}
                {layoutGuides && !isPreview && (
                  <rect
                    x={artboard.x + 16}
                    y={artboard.y + 16}
                    width={artboard.w - 32}
                    height={artboard.h - 32}
                    fill="none"
                    stroke="#2563eb"
                    strokeOpacity={0.3}
                    strokeDasharray={`${6 / viewport.z}`}
                    strokeWidth={1 / viewport.z}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
              </g>
            ))}

          {/* 2. Render Non-Artboard Elements (Memoized per element for zero drag/pan lag) */}
          {elements
            .filter((item) => item.t !== 'artboard' && !item.hidden)
            .map((item) => {
              const isSelected = currentSelectedIds.includes(item.id);
              return (
                <g
                  key={item.id}
                  data-id={item.id}
                  className="pointer-events-auto cursor-pointer"
                >
                  <MemoizedElementSvg item={item} />
                  {/* Subtle highlight if part of a multi-selection */}
                  {isSelected && currentSelectedIds.length > 1 && (
                    <rect
                      x={Math.min(item.x, item.x + item.w)}
                      y={Math.min(item.y, item.y + item.h)}
                      width={Math.max(1, Math.abs(item.w))}
                      height={Math.max(1, Math.abs(item.h))}
                      fill="rgba(37,99,235,0.06)"
                      stroke="#2563eb"
                      strokeWidth={1 / viewport.z}
                      strokeDasharray={`${3 / viewport.z}`}
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                </g>
              );
            })}

          {/* 2b. Persistent Group-Path Indicator Lines for Selected Grouped Elements */}
          {!isPreview &&
            selectedGroupPaths.map((gp) => (
              <g
                key={`group-path-${gp.groupId}`}
                data-group-path={gp.groupId}
                className="group-path"
                style={{ pointerEvents: 'none' }}
              >
                <polyline
                  points={gp.pointsAttr}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeOpacity={0.22}
                  strokeWidth={4 / viewport.z}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points={gp.pointsAttr}
                  fill="none"
                  stroke="#7c3aed"
                  strokeOpacity={0.78}
                  strokeWidth={1.6 / viewport.z}
                  strokeDasharray={`${5 / viewport.z},${4 / viewport.z}`}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {gp.points.map((pt, idx) => (
                  <circle
                    key={`gp-node-${gp.groupId}-${pt.id}-${idx}`}
                    cx={pt.cx}
                    cy={pt.cy}
                    r={3.2 / viewport.z}
                    fill="#ffffff"
                    stroke="#7c3aed"
                    strokeOpacity={0.9}
                    strokeWidth={1.5 / viewport.z}
                  />
                ))}
              </g>
            ))}

          {/* 3. Smart Align Approach Rails, Active Alignment Guides & Relative Spacing Targets */}
          {approachTargets.map((target, idx) => (
            <line
              key={`approach-${idx}`}
              x1={target.type === 'x' ? target.pos : target.start}
              y1={target.type === 'y' ? target.pos : target.start}
              x2={target.type === 'x' ? target.pos : target.end}
              y2={target.type === 'y' ? target.pos : target.end}
              stroke="#06b6d4"
              strokeOpacity={0.45}
              strokeWidth={1.25 / viewport.z}
              strokeDasharray={`${3 / viewport.z},${4 / viewport.z}`}
              style={{ pointerEvents: 'none' }}
            />
          ))}

          {activeGuides.map((guide, idx) => (
            <g key={`guide-${idx}`} style={{ pointerEvents: 'none' }}>
              <line
                x1={guide.type === 'x' ? guide.pos : guide.start}
                y1={guide.type === 'y' ? guide.pos : guide.start}
                x2={guide.type === 'x' ? guide.pos : guide.end}
                y2={guide.type === 'y' ? guide.pos : guide.end}
                stroke="#f43f5e"
                strokeWidth={1.5 / viewport.z}
                strokeDasharray={`${4 / viewport.z}`}
              />
              <circle
                cx={guide.type === 'x' ? guide.pos : guide.start}
                cy={guide.type === 'y' ? guide.pos : guide.start}
                r={3 / viewport.z}
                fill="#f43f5e"
              />
              <circle
                cx={guide.type === 'x' ? guide.pos : guide.end}
                cy={guide.type === 'y' ? guide.pos : guide.end}
                r={3 / viewport.z}
                fill="#f43f5e"
              />
            </g>
          ))}

          {spacingTargets.map((st, idx) => {
            const midX = (st.x1 + st.x2) / 2;
            const midY = (st.y1 + st.y2) / 2;
            const labelW = Math.max(40, st.label.length * 7.5 + 12) / viewport.z;
            const labelH = 19 / viewport.z;
            const color = st.isReference ? '#0ea5e9' : '#10b981';

            return (
              <g key={`spacing-target-${idx}`} style={{ pointerEvents: 'none' }}>
                <line
                  x1={st.x1}
                  y1={st.y1}
                  x2={st.x2}
                  y2={st.y2}
                  stroke={color}
                  strokeWidth={1.6 / viewport.z}
                />
                {st.type === 'h' ? (
                  <>
                    <line x1={st.x1} y1={st.y1 - 6 / viewport.z} x2={st.x1} y2={st.y1 + 6 / viewport.z} stroke={color} strokeWidth={1.5 / viewport.z} />
                    <line x1={st.x2} y1={st.y2 - 6 / viewport.z} x2={st.x2} y2={st.y2 + 6 / viewport.z} stroke={color} strokeWidth={1.5 / viewport.z} />
                  </>
                ) : (
                  <>
                    <line x1={st.x1 - 6 / viewport.z} y1={st.y1} x2={st.x1 + 6 / viewport.z} y2={st.y1} stroke={color} strokeWidth={1.5 / viewport.z} />
                    <line x1={st.x2 - 6 / viewport.z} y1={st.y2} x2={st.x2 + 6 / viewport.z} y2={st.y2} stroke={color} strokeWidth={1.5 / viewport.z} />
                  </>
                )}
                <rect
                  x={midX - labelW / 2}
                  y={midY - labelH / 2}
                  width={labelW}
                  height={labelH}
                  rx={4 / viewport.z}
                  fill={color}
                />
                <text
                  x={midX}
                  y={midY + 3.8 / viewport.z}
                  textAnchor="middle"
                  fontSize={10 / viewport.z}
                  fontWeight="bold"
                  fill="#ffffff"
                  fontFamily="ui-monospace, Menlo, monospace"
                >
                  {st.label}
                </text>
              </g>
            );
          })}

          {distanceMarkers.map((marker, idx) => {
            const midX = (marker.x1 + marker.x2) / 2;
            const midY = (marker.y1 + marker.y2) / 2;
            const labelWidth = Math.max(34, marker.label.length * 8 + 12) / viewport.z;
            const labelHeight = 20 / viewport.z;

            return (
              <g key={`marker-${idx}`} style={{ pointerEvents: 'none' }}>
                <line
                  x1={marker.x1}
                  y1={marker.y1}
                  x2={marker.x2}
                  y2={marker.y2}
                  stroke="#f43f5e"
                  strokeWidth={1.5 / viewport.z}
                />
                {marker.type === 'h' ? (
                  <>
                    <line
                      x1={marker.x1}
                      y1={marker.y1 - 6 / viewport.z}
                      x2={marker.x1}
                      y2={marker.y1 + 6 / viewport.z}
                      stroke="#f43f5e"
                      strokeWidth={1.5 / viewport.z}
                    />
                    <line
                      x1={marker.x2}
                      y1={marker.y2 - 6 / viewport.z}
                      x2={marker.x2}
                      y2={marker.y2 + 6 / viewport.z}
                      stroke="#f43f5e"
                      strokeWidth={1.5 / viewport.z}
                    />
                  </>
                ) : (
                  <>
                    <line
                      x1={marker.x1 - 6 / viewport.z}
                      y1={marker.y1}
                      x2={marker.x1 + 6 / viewport.z}
                      y2={marker.y1}
                      stroke="#f43f5e"
                      strokeWidth={1.5 / viewport.z}
                    />
                    <line
                      x1={marker.x2 - 6 / viewport.z}
                      y1={marker.y2}
                      x2={marker.x2 + 6 / viewport.z}
                      y2={marker.y2}
                      stroke="#f43f5e"
                      strokeWidth={1.5 / viewport.z}
                    />
                  </>
                )}
                <rect
                  x={midX - labelWidth / 2}
                  y={midY - labelHeight / 2}
                  width={labelWidth}
                  height={labelHeight}
                  rx={4 / viewport.z}
                  fill="#f43f5e"
                />
                <text
                  x={midX}
                  y={midY + 4 / viewport.z}
                  textAnchor="middle"
                  fontSize={10.5 / viewport.z}
                  fontWeight="bold"
                  fill="#ffffff"
                  fontFamily="ui-monospace, Menlo, monospace"
                >
                  {marker.label}
                </text>
              </g>
            );
          })}

          {/* 3b. Nearest Artboard Edge Magnetic Snap Highlight */}
          {nearArtboardHint && (
            <g style={{ pointerEvents: 'none' }}>
              <line
                x1={nearArtboardHint.rail.x1}
                y1={nearArtboardHint.rail.y1}
                x2={nearArtboardHint.rail.x2}
                y2={nearArtboardHint.rail.y2}
                stroke="#06b6d4"
                strokeOpacity={0.35}
                strokeWidth={8 / viewport.z}
                strokeLinecap="round"
              />
              <line
                x1={nearArtboardHint.rail.x1}
                y1={nearArtboardHint.rail.y1}
                x2={nearArtboardHint.rail.x2}
                y2={nearArtboardHint.rail.y2}
                stroke="#0891b2"
                strokeWidth={2.2 / viewport.z}
                strokeDasharray={`${6 / viewport.z},${4 / viewport.z}`}
                strokeLinecap="round"
              />
              {(() => {
                const lx = (nearArtboardHint.rail.x1 + nearArtboardHint.rail.x2) / 2;
                const ly = (nearArtboardHint.rail.y1 + nearArtboardHint.rail.y2) / 2;
                const pillText = `Snap → ${nearArtboardHint.artboardName}`;
                const pillW = Math.max(104, pillText.length * 6.8 + 16) / viewport.z;
                const pillH = 22 / viewport.z;
                return (
                  <g transform={`translate(${lx}, ${ly})`}>
                    <rect
                      x={-pillW / 2}
                      y={-pillH / 2}
                      width={pillW}
                      height={pillH}
                      rx={6 / viewport.z}
                      fill="#0e7490"
                    />
                    <text
                      x={0}
                      y={4 / viewport.z}
                      textAnchor="middle"
                      fontSize={10.5 / viewport.z}
                      fontWeight="bold"
                      fill="#ffffff"
                      fontFamily="system-ui, sans-serif"
                    >
                      {pillText}
                    </text>
                  </g>
                );
              })()}
            </g>
          )}

          {/* 3. Selection Box & Handles for Selected Elements / Group */}
          {selectionBBox && !isPreview && (
            <g
              transform={`translate(${selectionBBox.x}, ${selectionBBox.y})`}
              className="pointer-events-auto"
            >
              {/* Outer boundary stroke */}
              <rect
                x={0}
                y={0}
                width={selectionBBox.w}
                height={selectionBBox.h}
                fill="none"
                stroke={
                  allSelectedLocked
                    ? '#f59e0b'
                    : hasOrientationLockedArtboard
                    ? '#6366f1'
                    : '#2563eb'
                }
                strokeWidth={1.5 / viewport.z}
                strokeDasharray={
                  allSelectedLocked || hasOrientationLockedArtboard
                    ? `${5 / viewport.z}`
                    : undefined
                }
                style={{ pointerEvents: 'none' }}
              />

              {/* Group / Multi-selection / Locked / Orientation Lock Tag */}
              {(currentSelectedIds.length > 1 ||
                allSelectedLocked ||
                hasOrientationLockedArtboard) && (
                <g transform={`translate(0, ${-24 / viewport.z})`}>
                  <rect
                    width={
                      (orientationBadgeText
                        ? Math.max(132, orientationBadgeText.length * 6.8 + 16)
                        : allSelectedLocked
                        ? 98
                        : 90) / viewport.z
                    }
                    height={20 / viewport.z}
                    rx={5 / viewport.z}
                    fill={
                      allSelectedLocked
                        ? '#d97706'
                        : hasOrientationLockedArtboard
                        ? '#4f46e5'
                        : '#2563eb'
                    }
                  />
                  <text
                    x={
                      (orientationBadgeText
                        ? Math.max(132, orientationBadgeText.length * 6.8 + 16) / 2
                        : allSelectedLocked
                        ? 49
                        : 45) / viewport.z
                    }
                    y={14 / viewport.z}
                    textAnchor="middle"
                    fontSize={11 / viewport.z}
                    fontWeight="bold"
                    fill="#ffffff"
                    fontFamily="system-ui, sans-serif"
                  >
                    {allSelectedLocked
                      ? `Locked${currentSelectedIds.length > 1 ? ` (${currentSelectedIds.length})` : ''}`
                      : orientationBadgeText
                      ? orientationBadgeText
                      : hasOrientationLockedArtboard
                      ? `${currentSelectedIds.length} Selected · Orientation Locked`
                      : `${currentSelectedIds.length} Selected`}
                  </text>
                </g>
              )}

              {/* Rotation & Resize Handles (hidden when locked or orientation-locked) */}
              {!allSelectedLocked && !hasOrientationLockedArtboard && (
                <>
                  <line
                    x1={selectionBBox.w / 2}
                    y1={0}
                    x2={selectionBBox.w / 2}
                    y2={-20 / viewport.z}
                    stroke="#2563eb"
                    strokeWidth={1.5 / viewport.z}
                  />
                  <g
                    transform={`translate(${selectionBBox.w / 2}, ${-20 / viewport.z})`}
                    className="cursor-crosshair"
                  >
                    <circle
                      data-handle="rot"
                      r={22 / viewport.z}
                      fill="transparent"
                    />
                    <circle
                      r={5 / viewport.z}
                      fill="#ffffff"
                      stroke="#2563eb"
                      strokeWidth={2 / viewport.z}
                      style={{ pointerEvents: 'none' }}
                    />
                  </g>

                  {/* 4 Corner Handles */}
                  {renderHandle('tl', 0, 0, 'cursor-nwse-resize')}
                  {renderHandle('tr', selectionBBox.w, 0, 'cursor-nesw-resize')}
                  {renderHandle('bl', 0, selectionBBox.h, 'cursor-nesw-resize')}
                  {renderHandle('br', selectionBBox.w, selectionBBox.h, 'cursor-nwse-resize')}

                  {/* 4 Edge Handles */}
                  {selectionBBox.w > 40 &&
                    renderHandle('t', selectionBBox.w / 2, 0, 'cursor-ns-resize')}
                  {selectionBBox.w > 40 &&
                    renderHandle('b', selectionBBox.w / 2, selectionBBox.h, 'cursor-ns-resize')}
                  {selectionBBox.h > 40 &&
                    renderHandle('l', 0, selectionBBox.h / 2, 'cursor-ew-resize')}
                  {selectionBBox.h > 40 &&
                    renderHandle('r', selectionBBox.w, selectionBBox.h / 2, 'cursor-ew-resize')}
                </>
              )}
            </g>
          )}

          {/* Marquee Selection Drag Box */}
          {marquee && (
            <g style={{ pointerEvents: 'none' }}>
              <rect
                x={marquee.x1}
                y={marquee.y1}
                width={marquee.x2 - marquee.x1}
                height={marquee.y2 - marquee.y1}
                fill="rgba(37,99,235,0.10)"
                stroke="#2563eb"
                strokeWidth={1.5 / viewport.z}
                strokeDasharray={`${4 / viewport.z}`}
              />
              {currentSelectedIds.length > 0 && (
                <g transform={`translate(${marquee.x2}, ${marquee.y2 + 6 / viewport.z})`}>
                  <rect
                    width={72 / viewport.z}
                    height={18 / viewport.z}
                    rx={4 / viewport.z}
                    fill="#2563eb"
                  />
                  <text
                    x={36 / viewport.z}
                    y={12.5 / viewport.z}
                    textAnchor="middle"
                    fontSize={10 / viewport.z}
                    fontWeight="bold"
                    fill="#ffffff"
                    fontFamily="system-ui, sans-serif"
                  >
                    {currentSelectedIds.length} items
                  </text>
                </g>
              )}
            </g>
          )}
        </g>
      </svg>

      {/* Multi-Select / Lasso Mode Banner */}
      {tool === 'select' && selectionMode === 'multi' && !isPreview && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-blue-600/95 text-white px-3.5 py-1.5 rounded-full shadow-xl border border-white/20 backdrop-blur-md text-xs font-semibold whitespace-nowrap"
        >
          <LassoSelect size={14} className="shrink-0" />
          <span>Multi / Lasso Mode ({currentSelectedIds.length} selected)</span>
          {onSetSelectionMode && (
            <button
              onClick={() => onSetSelectionMode('single')}
              className="ml-1 px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-[11px] transition-colors"
            >
              Done
            </button>
          )}
        </div>
      )}

      {/* Eyedropper Active HUD Banner */}
      {tool === 'eyedropper' && !isPreview && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-gray-900/95 dark:bg-gray-800/95 text-white px-3.5 py-2 rounded-2xl shadow-2xl border border-white/15 backdrop-blur-md text-xs font-medium"
        >
          <Pipette size={15} className="text-blue-400 shrink-0" />
          <span className="whitespace-nowrap">Tap element to sample</span>
          <div className="flex bg-white/10 p-0.5 rounded-lg">
            <button
              onClick={() => onSwitchEyedropperTarget && onSwitchEyedropperTarget('fill')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                eyedropperTarget !== 'stroke'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Fill
            </button>
            <button
              onClick={() => onSwitchEyedropperTarget && onSwitchEyedropperTarget('stroke')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                eyedropperTarget === 'stroke'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Stroke
            </button>
          </div>
          {onCancelEyedropper && (
            <button
              onClick={onCancelEyedropper}
              className="p-1 hover:bg-white/15 rounded-lg text-gray-300 hover:text-white transition-colors"
              title="Cancel Eyedropper (Esc)"
            >
              <XIcon size={14} />
            </button>
          )}
        </div>
      )}

      {/* Eyedropper Floating Color Loupe */}
      {tool === 'eyedropper' && hoverColor && !isPreview && (
        <div
          className="fixed z-50 pointer-events-none flex items-center gap-2 bg-white dark:bg-gray-900 px-2.5 py-1.5 rounded-full shadow-xl border border-gray-200 dark:border-gray-700"
          style={{
            left: `${Math.min(window.innerWidth - 115, hoverColor.x + 14)}px`,
            top: `${Math.max(64, hoverColor.y - 36)}px`,
          }}
        >
          <span
            className="w-4 h-4 rounded-full border border-black/15 shrink-0"
            style={{ backgroundColor: hoverColor.color }}
          />
          <span className="font-mono text-[11px] font-bold text-gray-800 dark:text-gray-100 uppercase">
            {hoverColor.color}
          </span>
        </div>
      )}

      {/* Smart Align Floating Handle for Multi-Selection (Drag Handle + Real-Time Snap Targets) */}
      {!isPreview &&
        currentSelectedIds.length > 1 &&
        selectionBBox &&
        !allSelectedLocked &&
        (() => {
          const boxCenterX = viewport.x + (selectionBBox.x + selectionBBox.w / 2) * viewport.z;
          const boxBottomY = viewport.y + (selectionBBox.y + selectionBBox.h) * viewport.z;
          const boxTopY = viewport.y + selectionBBox.y * viewport.z;
          const winW = typeof window !== 'undefined' ? window.innerWidth : 400;
          const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
          const isActivelyDraggingMulti = Boolean(smartAlignStatus?.active);
          const isLocked = Boolean(
            smartAlignStatus?.xLabel ||
              smartAlignStatus?.yLabel ||
              smartAlignStatus?.spaceLabel
          );

          // Offset vertically relative to Canvas top-14 (canvas y=0 is screen y=56)
          const canvasTopSafe = 58;
          const sheetReserve = isPropertiesOpen ? Math.min(Math.round(winH * 0.46), 360) + 56 : 134;
          const canvasBottomSafe = Math.max(canvasTopSafe + 48, winH - sheetReserve);
          const desiredY = isActivelyDraggingMulti
            ? boxTopY > canvasTopSafe + 54
              ? boxTopY - 46
              : Math.min(canvasBottomSafe, boxBottomY + 14)
            : Math.min(canvasBottomSafe, Math.max(canvasTopSafe, boxBottomY + 14));
          const clampedX = Math.max(136, Math.min(winW - 136, boxCenterX));

          return (
            <div
              className="absolute z-20 -translate-x-1/2 flex items-center gap-1 bg-white/95 dark:bg-[#222226]/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/90 dark:border-gray-700/80 px-1.5 py-1 select-none"
              style={{
                left: `${clampedX}px`,
                top: `${desiredY}px`,
              }}
            >
              {/* Tactile Drag Handle */}
              <div
                data-handle="smart-align"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold touch-none cursor-grab active:cursor-grabbing transition-colors whitespace-nowrap ${
                  isLocked
                    ? 'bg-emerald-600 text-white'
                    : isActivelyDraggingMulti
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600'
                }`}
                title="Drag Smart Align handle to snap relative spacing & edges"
              >
                <GripHorizontal size={13} className="pointer-events-none shrink-0" />
                <Magnet size={12} className="pointer-events-none shrink-0" />
                <span className="pointer-events-none">Smart Align</span>
              </div>

              {isActivelyDraggingMulti ? (
                <div className="flex items-center gap-1 px-1.5 text-[11px] font-mono tabular-nums whitespace-nowrap">
                  {smartAlignStatus?.spaceLabel ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {smartAlignStatus.spaceLabel}
                    </span>
                  ) : smartAlignStatus?.xLabel || smartAlignStatus?.yLabel ? (
                    <span className="text-rose-500 font-semibold">
                      {[smartAlignStatus.xLabel, smartAlignStatus.yLabel]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  ) : (
                    <span className="text-gray-400">Free move</span>
                  )}
                </div>
              ) : (
                onSmartAlignAction && (
                  <div
                    className="flex items-center gap-0.5 pl-0.5 border-l border-gray-200 dark:border-gray-700"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        hapticDrop();
                        onSmartAlignAction('center-h');
                      }}
                      className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 transition-colors"
                      title="Align Centers Horizontally"
                      aria-label="Align Centers Horizontally"
                    >
                      <AlignCenterHorizontal size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        hapticDrop();
                        onSmartAlignAction('center-v');
                      }}
                      className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 transition-colors"
                      title="Align Middle Vertically"
                      aria-label="Align Middle Vertically"
                    >
                      <AlignCenterVertical size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        hapticDrop();
                        onSmartAlignAction('space-h');
                      }}
                      className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-emerald-600 transition-colors"
                      title="Distribute Horizontal Spacing"
                      aria-label="Distribute Horizontal Spacing"
                    >
                      <AlignHorizontalDistributeCenter size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        hapticDrop();
                        onSmartAlignAction('space-v');
                      }}
                      className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-emerald-600 transition-colors"
                      title="Distribute Vertical Spacing"
                      aria-label="Distribute Vertical Spacing"
                    >
                      <AlignVerticalDistributeCenter size={14} />
                    </button>
                  </div>
                )
              )}
            </div>
          );
        })()}

      {/* Pinch-to-Zoom Live Percentage HUD */}
      {isPinching && !isPreview && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center gap-2 bg-gray-900/90 dark:bg-gray-800/95 text-white px-3.5 py-1.5 rounded-full shadow-xl border border-white/15 backdrop-blur-md text-xs font-mono font-bold">
          <span>Zoom</span>
          <span className="text-blue-400">{Math.round(viewport.z * 100)}%</span>
        </div>
      )}

      {/* Floating expand button on top-right of visible artboard headers */}
      {!isPreview &&
        elements
          .filter((item) => item.t === 'artboard' && !item.hidden)
          .map((artboard) => {
            const screenX = viewport.x + (artboard.x + artboard.w) * viewport.z;
            const screenY = viewport.y + artboard.y * viewport.z;
            if (
              screenY < 86 ||
              screenY > window.innerHeight - 90 ||
              screenX < 36 ||
              screenX > window.innerWidth + 12
            ) {
              return null;
            }
            return (
              <button
                key={`btn-fit-${artboard.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onFitElement(artboard);
                }}
                className="absolute z-10 p-1.5 text-gray-500 hover:text-blue-600 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xs rounded-lg shadow-xs transition-colors border border-gray-200/60 dark:border-gray-700/60"
                style={{
                  left: `${screenX - 28}px`,
                  top: `${screenY - 32}px`,
                }}
                title="Fit artboard to screen"
              >
                <Maximize2 size={13} />
              </button>
            );
          })}
    </div>
  );
};
