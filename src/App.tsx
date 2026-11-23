/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  AlignmentType,
  CanvasElement,
  DesignTemplate,
  DevicePreset,
  DistributionType,
  Page,
  ProjectState,
  SelectionMode,
  ToolType,
  VersionSnapshot,
  Viewport,
} from './types';
import {
  alignElements,
  applyAutoLayout,
  createInitialSeed,
  distributeElements,
  fitTextDimensions,
  getBoundingBox,
  isInside,
  STORAGE_KEY,
} from './utils/helpers';
import {
  extractDominantColors,
  extractPaletteFromCanvas,
  generateComplementaryPalette,
  mergeSmartPalette,
} from './utils/colorExtract';
import {
  getHapticsEnabled,
  hapticDrop,
  hapticSuccess,
  setHapticsEnabled as persistHapticsEnabled,
} from './utils/haptics';
import {
  clearAllVersionSnapshots,
  deleteVersionSnapshot,
  loadVersionHistory,
  maybeRecordHourlySnapshot,
  recordManualSnapshot,
  recordPreRestoreSnapshot,
} from './utils/versionHistory';
import { Header } from './components/Header';
import { FloatingPills } from './components/FloatingPills';
import { Canvas } from './components/Canvas';
import { ContextToolbar } from './components/ContextToolbar';
import { BottomSheet, BottomSheetTab } from './components/BottomSheet';
import { ExportModal } from './components/ExportModal';
import { PagesModal } from './components/PagesModal';
import { ToolsSheet } from './components/ToolsSheet';
import { ZoomSheet } from './components/ZoomSheet';
import { CommentsModal } from './components/CommentsModal';
import { PreviewOverlay } from './components/PreviewOverlay';
import { PromptModal } from './components/PromptModal';
import { TemplatesModal } from './components/TemplatesModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { VersionHistoryModal } from './components/VersionHistoryModal';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Load state from localStorage or seed
  const [project, setProject] = useState<ProjectState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not load stored project, initializing demo:', e);
    }
    return createInitialSeed();
  });

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [tool, setTool] = useState<ToolType>('select');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single');
  const [viewport, setViewport] = useState<Viewport>({ x: 40, y: 40, z: 0.52 });
  const [layoutGuides, setLayoutGuides] = useState<boolean>(true);
  const [snapGrid, setSnapGrid] = useState<boolean>(false);
  const [smartSnap, setSmartSnap] = useState<boolean>(true);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState<boolean>(false);
  const [sheetTab, setSheetTab] = useState<BottomSheetTab>('Properties');
  const [isPreview, setIsPreview] = useState<boolean>(false);

  // Modals state
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isPagesOpen, setIsPagesOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [versionHistory, setVersionHistory] = useState<VersionSnapshot[]>(() =>
    loadVersionHistory()
  );
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => getHapticsEnabled());
  const [isCanvasDragging, setIsCanvasDragging] = useState(false);
  const [eyedropperTarget, setEyedropperTarget] = useState<'fill' | 'stroke' | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [autoSnappedArtboard, setAutoSnappedArtboard] = useState<{
    artboardId: number;
    artboardName: string;
    edge: string;
    timestamp: number;
  } | null>(null);
  const isInitialMountRef = useRef(true);

  // Prompt modal for editing text / renaming
  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    title: string;
    value: string;
    onSubmit: (val: string) => void;
  }>({
    isOpen: false,
    title: '',
    value: '',
    onSubmit: () => {},
  });

  // Undo / Redo history & Clipboard
  const historyRef = useRef<string[]>([]);
  const futureRef = useRef<string[]>([]);
  const clipboardRef = useRef<CanvasElement[]>([]);
  const copiedStyleRef = useRef<Partial<CanvasElement> | null>(null);
  const [canPasteStyle, setCanPasteStyle] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetIdRef = useRef<number | null>(null);
  const viewportRef = useRef<Viewport>(viewport);
  viewportRef.current = viewport;
  const projectRef = useRef<ProjectState>(project);
  projectRef.current = project;

  // Active page shortcut
  const currentPageIndex = Math.min(project.pi, project.pages.length - 1);
  const currentPage = project.pages[currentPageIndex] || project.pages[0];

  // Save to localStorage (debounced watcher handles high-frequency drags/resizes smoothly at 60fps)
  const saveToStorage = useCallback((newState: ProjectState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (err) {
      console.error('Storage quota exceeded:', err);
    }
  }, []);

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      saveToStorage(project);
    }, 350);
    return () => clearTimeout(timer);
  }, [project, saveToStorage]);

  useEffect(() => {
    if (!autoSnappedArtboard) return;
    const timer = setTimeout(() => {
      setAutoSnappedArtboard(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [autoSnappedArtboard]);

  useEffect(() => {
    if (!selectedId && selectedIds.length === 0) {
      setAutoSnappedArtboard(null);
    }
  }, [selectedId, selectedIds.length]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveToStorage(projectRef.current);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveToStorage]);

  // Hourly Version History auto-snapshot watcher (persists to localStorage)
  useEffect(() => {
    const checkHourly = () => {
      const { updated, created } = maybeRecordHourlySnapshot(projectRef.current);
      if (created) {
        setVersionHistory(updated);
      }
    };
    checkHourly();
    const interval = setInterval(checkHourly, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Show quick toast notification
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  // Push snapshot for undo
  const pushSnapshot = useCallback(() => {
    historyRef.current.push(JSON.stringify(project));
    if (historyRef.current.length > 30) {
      historyRef.current.shift();
    }
    futureRef.current = [];
  }, [project]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) {
      showToast('Nothing to undo');
      return;
    }
    futureRef.current.push(JSON.stringify(project));
    const previous = JSON.parse(historyRef.current.pop()!);
    setProject(previous);
    saveToStorage(previous);
    setSelectedId(null);
    setSelectedIds([]);
    showToast('Undo');
  }, [project, saveToStorage]);

  // Redo
  const handleRedo = useCallback(() => {
    if (futureRef.current.length === 0) {
      showToast('Nothing to redo');
      return;
    }
    historyRef.current.push(JSON.stringify(project));
    const next = JSON.parse(futureRef.current.pop()!);
    setProject(next);
    saveToStorage(next);
    setSelectedId(null);
    setSelectedIds([]);
    showToast('Redo');
  }, [project, saveToStorage]);

  // Reactive auto-layout recalculation when children are resized or added
  const recalculateAutoLayouts = (items: CanvasElement[], triggerIds: number[]): CanvasElement[] => {
    let nextItems = items;
    const processedGroups = new Set<number>();
    const processedArtboards = new Set<number>();

    triggerIds.forEach((tid) => {
      const el = nextItems.find((i) => i.id === tid);
      if (!el) return;

      // 1. Grouped auto-layout elements
      if (el.groupId && el.autoLayout && el.autoLayout !== 'none' && !processedGroups.has(el.groupId)) {
        processedGroups.add(el.groupId);
        const siblings = nextItems.filter((i) => i.groupId === el.groupId);
        nextItems = applyAutoLayout(
          nextItems,
          siblings,
          el.autoLayout,
          el.autoLayoutGap ?? 12,
          0,
          el.autoLayoutAlign ?? 'start'
        );
      }

      // 2. Artboard container auto-layout
      if (el.t !== 'artboard') {
        const parentArt = nextItems.find(
          (i) => i.t === 'artboard' && i.autoLayout && i.autoLayout !== 'none' && isInside(el, i)
        );
        if (parentArt && parentArt.autoLayout && parentArt.autoLayout !== 'none' && !processedArtboards.has(parentArt.id)) {
          processedArtboards.add(parentArt.id);
          const children = nextItems.filter((i) => i.t !== 'artboard' && isInside(i, parentArt));
          nextItems = applyAutoLayout(
            nextItems,
            children,
            parentArt.autoLayout,
            parentArt.autoLayoutGap ?? 12,
            parentArt.autoLayoutPadding ?? 16,
            parentArt.autoLayoutAlign ?? 'start',
            parentArt
          );
        }
      }
    });

    return nextItems;
  };

  // Update single element on active page (deferred localStorage save prevents pointermove lag)
  const updateElement = useCallback(
    (id: number, updates: Partial<CanvasElement>) => {
      const shouldReflow =
        'w' in updates ||
        'h' in updates ||
        'text' in updates ||
        'fs' in updates ||
        'fw' in updates ||
        'ls' in updates ||
        'b' in updates ||
        'it' in updates;

      setProject((prev) => {
        const pages = [...prev.pages];
        const page = { ...pages[prev.pi] };
        let items = page.items.map((item) => {
          if (item.id === id) {
            const updated = { ...item, ...updates } as CanvasElement;
            fitTextDimensions(updated);
            return updated;
          }
          return item;
        });
        if (shouldReflow) {
          items = recalculateAutoLayouts(items, [id]);
        }
        page.items = items;
        pages[prev.pi] = page;
        return { ...prev, pages };
      });
    },
    []
  );

  // Single-pass batch update for 60fps multi-item & artboard-children drags/resizes
  const batchUpdateElements = useCallback(
    (patches: { id: number; updates: Partial<CanvasElement> }[]) => {
      if (patches.length === 0) return;
      const patchMap = new Map<number, Partial<CanvasElement>>();
      let shouldReflow = false;
      const ids: number[] = [];

      for (const p of patches) {
        patchMap.set(p.id, p.updates);
        ids.push(p.id);
        if (
          !shouldReflow &&
          ('w' in p.updates ||
            'h' in p.updates ||
            'text' in p.updates ||
            'fs' in p.updates ||
            'fw' in p.updates ||
            'ls' in p.updates ||
            'b' in p.updates ||
            'it' in p.updates)
        ) {
          shouldReflow = true;
        }
      }

      setProject((prev) => {
        const pages = [...prev.pages];
        const page = { ...pages[prev.pi] };
        let items = page.items.map((item) => {
          const patch = patchMap.get(item.id);
          if (!patch) return item;
          const updated = { ...item, ...patch } as CanvasElement;
          fitTextDimensions(updated);
          return updated;
        });
        if (shouldReflow) {
          items = recalculateAutoLayouts(items, ids);
        }
        page.items = items;
        pages[prev.pi] = page;
        return { ...prev, pages };
      });
    },
    []
  );

  // Bulk update multiple elements on active page
  const updateElementsBulk = useCallback(
    (ids: number[], updates: Partial<CanvasElement>) => {
      if (ids.length === 0) return;
      const shouldReflow =
        'w' in updates ||
        'h' in updates ||
        'text' in updates ||
        'fs' in updates ||
        'fw' in updates ||
        'ls' in updates ||
        'b' in updates ||
        'it' in updates;

      setProject((prev) => {
        const pages = [...prev.pages];
        const page = { ...pages[prev.pi] };
        let items = page.items.map((item) => {
          if (ids.includes(item.id)) {
            const updated = { ...item, ...updates } as CanvasElement;
            fitTextDimensions(updated);
            return updated;
          }
          return item;
        });
        if (shouldReflow) {
          items = recalculateAutoLayouts(items, ids);
        }
        page.items = items;
        pages[prev.pi] = page;
        return { ...prev, pages };
      });
    },
    []
  );

  // Create new element on active page (also triggers container auto-layout if applicable)
  const createElement = useCallback(
    (elem: CanvasElement) => {
      setProject((prev) => {
        const pages = [...prev.pages];
        const page = { ...pages[prev.pi] };
        let items = [...page.items, elem];
        items = recalculateAutoLayouts(items, [elem.id]);
        page.items = items;
        pages[prev.pi] = page;
        const nextState = { ...prev, pages };
        saveToStorage(nextState);
        return nextState;
      });
    },
    [saveToStorage]
  );

  // Quietly remove an accidental zero-drag element when a 2-finger pinch begins
  const discardElement = useCallback(
    (id: number) => {
      setProject((prev) => {
        const pages = [...prev.pages];
        const page = { ...pages[prev.pi] };
        page.items = page.items.filter((i) => i.id !== id);
        pages[prev.pi] = page;
        const nextState = { ...prev, pages };
        saveToStorage(nextState);
        return nextState;
      });
    },
    [saveToStorage]
  );

  // Duplicate element (single or multi-selection)
  const duplicateElement = useCallback(
    (id: number) => {
      const targetIds =
        selectedIds.length > 1 && selectedIds.includes(id) ? selectedIds : [id];
      const targetElems = currentPage.items.filter((i) => targetIds.includes(i.id));
      if (targetElems.length === 0) return;
      pushSnapshot();

      const stamp = Date.now();
      const groupMap = new Map<number, number>();
      const duplicatedItems: CanvasElement[] = targetElems.map((item, idx) => {
        const clone: CanvasElement = {
          ...JSON.parse(JSON.stringify(item)),
          id: stamp + idx,
          x: item.x + 24,
          y: item.y + 24,
          n: 'n' in item ? `${item.n} copy` : undefined,
        };
        if (clone.groupId) {
          if (!groupMap.has(clone.groupId)) {
            groupMap.set(clone.groupId, stamp + 1000 + groupMap.size);
          }
          clone.groupId = groupMap.get(clone.groupId);
        }
        return clone;
      });

      const newIds = duplicatedItems.map((d) => d.id);

      setProject((prev) => {
        const pages = [...prev.pages];
        const page = { ...pages[prev.pi] };
        let items = [...page.items, ...duplicatedItems];
        items = recalculateAutoLayouts(items, newIds);
        page.items = items;
        pages[prev.pi] = page;
        const nextState = { ...prev, pages };
        saveToStorage(nextState);
        return nextState;
      });

      setSelectedId(newIds[0]);
      setSelectedIds(newIds);
      showToast(duplicatedItems.length > 1 ? `Duplicated ${duplicatedItems.length} items` : 'Duplicated');
    },
    [currentPage, selectedIds, pushSnapshot, saveToStorage]
  );

  // Bring forward by 1 step (supports multi-selection)
  const bringForward = useCallback(
    (id: number) => {
      const targetIds =
        selectedIds.length > 1 && selectedIds.includes(id) ? selectedIds : [id];
      const targetSet = new Set(targetIds);
      const items = [...currentPage.items];
      let moved = false;
      for (let i = items.length - 2; i >= 0; i--) {
        if (targetSet.has(items[i].id) && !targetSet.has(items[i + 1].id)) {
          [items[i], items[i + 1]] = [items[i + 1], items[i]];
          moved = true;
        }
      }
      if (!moved) {
        showToast('Already at front');
        return;
      }
      pushSnapshot();
      setProject((prev) => {
        const pages = [...prev.pages];
        pages[prev.pi] = { ...pages[prev.pi], items };
        const nextState = { ...prev, pages };
        saveToStorage(nextState);
        return nextState;
      });
      showToast('Moved forward');
    },
    [selectedIds, currentPage.items, pushSnapshot, saveToStorage]
  );

  // Send backward by 1 step (supports multi-selection)
  const sendBackward = useCallback(
    (id: number) => {
      const targetIds =
        selectedIds.length > 1 && selectedIds.includes(id) ? selectedIds : [id];
      const targetSet = new Set(targetIds);
      const items = [...currentPage.items];
      let moved = false;
      for (let i = 1; i < items.length; i++) {
        if (targetSet.has(items[i].id) && !targetSet.has(items[i - 1].id)) {
          [items[i], items[i - 1]] = [items[i - 1], items[i]];
          moved = true;
        }
      }
      if (!moved) {
        showToast('Already at back');
        return;
      }
      pushSnapshot();
      setProject((prev) => {
        const pages = [...prev.pages];
        pages[prev.pi] = { ...pages[prev.pi], items };
        const nextState = { ...prev, pages };
        saveToStorage(nextState);
        return nextState;
      });
      showToast('Moved backward');
    },
    [selectedIds, currentPage.items, pushSnapshot, saveToStorage]
  );

  // Select all elements contained inside an artboard
  const handleSelectArtboardChildren = useCallback(
    (artboardId: number) => {
      const artboard = currentPage.items.find((i) => i.id === artboardId && i.t === 'artboard');
      if (!artboard) return;
      const childIds = currentPage.items
        .filter((i) => i.t !== 'artboard' && !i.hidden && isInside(i, artboard))
        .map((i) => i.id);
      if (childIds.length === 0) {
        showToast('No items inside this artboard');
        return;
      }
      setSelectedIds(childIds);
      setSelectedId(childIds[0]);
      showToast(`Selected ${childIds.length} item${childIds.length > 1 ? 's' : ''}`);
    },
    [currentPage.items]
  );

  // Bring to front (supports multi-selection)
  const bringToFront = useCallback(
    (id: number) => {
      const targetIds =
        selectedIds.length > 1 && selectedIds.includes(id) ? selectedIds : [id];
      pushSnapshot();
      setProject((prev) => {
        const pages = [...prev.pages];
        const page = { ...pages[prev.pi] };
        const moving = page.items.filter((i) => targetIds.includes(i.id));
        if (moving.length === 0) return prev;
        page.items = page.items.filter((i) => !targetIds.includes(i.id)).concat(moving);
        pages[prev.pi] = page;
        const nextState = { ...prev, pages };
        saveToStorage(nextState);
        return nextState;
      });
      showToast('Brought to front');
    },
    [selectedIds, pushSnapshot, saveToStorage]
  );

  // Send to back (supports multi-selection)
  const sendToBack = useCallback(
    (id: number) => {
      const targetIds =
        selectedIds.length > 1 && selectedIds.includes(id) ? selectedIds : [id];
      pushSnapshot();
      setProject((prev) => {
        const pages = [...prev.pages];
        const page = { ...pages[prev.pi] };
        const moving = page.items.filter((i) => targetIds.includes(i.id));
        if (moving.length === 0) return prev;
        page.items = moving.concat(page.items.filter((i) => !targetIds.includes(i.id)));
        pages[prev.pi] = page;
        const nextState = { ...prev, pages };
        saveToStorage(nextState);
        return nextState;
      });
      showToast('Sent to back');
    },
    [selectedIds, pushSnapshot, saveToStorage]
  );

  // Drag-and-drop reorder layer inside BottomSheet Outline (list renders reversed z-order)
  const handleReorderLayers = useCallback(
    (draggedId: number, targetId: number, position: 'before' | 'after') => {
      if (draggedId === targetId) return;
      pushSnapshot();
      setProject((prev) => {
        const pages = [...prev.pages];
        const page = { ...pages[prev.pi] };
        const draggedItem = page.items.find((i) => i.id === draggedId);
        if (!draggedItem) return prev;

        const remaining = page.items.filter((i) => i.id !== draggedId);
        const targetIdx = remaining.findIndex((i) => i.id === targetId);
        if (targetIdx === -1) return prev;

        // Visual 'before' (higher in Outline list) = higher z-index = right after targetIdx
        // Visual 'after' (lower in Outline list) = lower z-index = right before targetIdx
        const insertIdx = position === 'before' ? targetIdx + 1 : targetIdx;
        remaining.splice(insertIdx, 0, draggedItem);
        page.items = remaining;
        pages[prev.pi] = page;
        return { ...prev, pages };
      });
      showToast('Reordered layer');
    },
    [pushSnapshot]
  );

  // Toggle individual item in multi-selection mode (for Layers panel clicks)
  const handleToggleSelectId = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      setSelectedId(next.length > 0 ? next[next.length - 1] : null);
      return next;
    });
  }, []);

  // Delete element (supports multi-selection)
  const deleteElement = useCallback(
    (id: number) => {
      const targetIds =
        selectedIds.length > 1 && selectedIds.includes(id) ? selectedIds : [id];
      pushSnapshot();
      setProject((prev) => {
        const pages = [...prev.pages];
        const page = { ...pages[prev.pi] };
        page.items = page.items.filter((i) => !targetIds.includes(i.id));
        pages[prev.pi] = page;
        const nextState = { ...prev, pages };
        saveToStorage(nextState);
        return nextState;
      });
      setSelectedId(null);
      setSelectedIds([]);
      showToast(targetIds.length > 1 ? `Deleted ${targetIds.length} items` : 'Deleted');
    },
    [selectedIds, pushSnapshot, saveToStorage]
  );

  // Group selected elements into a single entity / shared group
  const handleGroupSelected = useCallback(() => {
    const ids = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
    if (ids.length <= 1) {
      showToast('Select multiple elements (Shift+Click) to group');
      return;
    }
    pushSnapshot();
    const newGroupId = Date.now();
    setProject((prev) => {
      const pages = [...prev.pages];
      const page = { ...pages[prev.pi] };
      page.items = page.items.map((item) => {
        if (ids.includes(item.id)) {
          return { ...item, groupId: newGroupId };
        }
        return item;
      });
      pages[prev.pi] = page;
      const nextState = { ...prev, pages };
      saveToStorage(nextState);
      return nextState;
    });
    showToast(`Grouped ${ids.length} items (⌘G)`);
  }, [selectedIds, selectedId, pushSnapshot, saveToStorage]);

  // Ungroup selected elements
  const handleUngroupSelected = useCallback(() => {
    const ids = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
    if (ids.length === 0) return;

    const targetElements = currentPage.items.filter((i) => ids.includes(i.id));
    const groupIdsToClear = new Set<number>();
    targetElements.forEach((el) => {
      if (el.groupId) groupIdsToClear.add(el.groupId);
    });

    if (groupIdsToClear.size === 0) {
      showToast('Selected elements are not grouped');
      return;
    }

    pushSnapshot();
    setProject((prev) => {
      const pages = [...prev.pages];
      const page = { ...pages[prev.pi] };
      page.items = page.items.map((item) => {
        if (item.groupId && groupIdsToClear.has(item.groupId)) {
          const copy = { ...item };
          delete copy.groupId;
          return copy;
        }
        return item;
      });
      pages[prev.pi] = page;
      const nextState = { ...prev, pages };
      saveToStorage(nextState);
      return nextState;
    });
    showToast('Ungrouped (⌘⇧G)');
  }, [selectedIds, selectedId, currentPage.items, pushSnapshot, saveToStorage]);

  // Alignment handler (left, center, right, top, middle, bottom)
  const handleAlign = useCallback(
    (alignment: AlignmentType) => {
      const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
      if (ids.length === 0) return;

      const primary = currentPage.items.find((i) => i.id === ids[0]);
      const parentArtboard =
        ids.length === 1 && primary && primary.t !== 'artboard'
          ? currentPage.items.find((i) => i.t === 'artboard' && isInside(primary, i))
          : undefined;

      if (ids.length === 1 && !parentArtboard) {
        showToast('Select 2+ elements or place element inside an artboard to align');
        return;
      }

      pushSnapshot();
      setProject((prev) => {
        const pages = [...prev.pages];
        const page = { ...pages[prev.pi] };
        page.items = alignElements(page.items, ids, alignment, parentArtboard);
        pages[prev.pi] = page;
        const nextState = { ...prev, pages };
        saveToStorage(nextState);
        return nextState;
      });
      showToast(`Aligned ${alignment}`);
    },
    [selectedIds, selectedId, currentPage.items, pushSnapshot, saveToStorage]
  );

  // Distribution handler (equal horizontal or vertical spacing)
  const handleDistribute = useCallback(
    (axis: DistributionType) => {
      const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
      if (ids.length < 2) {
        showToast('Select at least 2 elements to distribute spacing');
        return;
      }

      const firstItem = currentPage.items.find((i) => i.id === ids[0]);
      const parentArtboard =
        ids.length === 2 && firstItem
          ? currentPage.items.find((i) => i.t === 'artboard' && isInside(firstItem, i))
          : undefined;

      if (ids.length === 2 && !parentArtboard) {
        showToast('Select 3+ elements (or 2 inside an artboard) to distribute');
        return;
      }

      pushSnapshot();
      setProject((prev) => {
        const pages = [...prev.pages];
        const page = { ...pages[prev.pi] };
        page.items = distributeElements(page.items, ids, axis, parentArtboard);
        pages[prev.pi] = page;
        const nextState = { ...prev, pages };
        saveToStorage(nextState);
        return nextState;
      });
      showToast(`Distributed ${axis}ly`);
    },
    [selectedIds, selectedId, currentPage.items, pushSnapshot, saveToStorage]
  );

  // Automatic Snap to Nearest Artboard when a group/multi-selection is dropped near an artboard edge
  const handleAutoSnapGroupToArtboard = useCallback(
    (
      elemIds: number[],
      artboardId: number,
      artboardName: string,
      edge: 'left' | 'right' | 'top' | 'bottom' | 'inside',
      snapDx: number,
      snapDy: number
    ) => {
      if (elemIds.length === 0) return;
      const dx = Math.round(snapDx * 10) / 10;
      const dy = Math.round(snapDy * 10) / 10;
      if (dx !== 0 || dy !== 0) {
        const idSet = new Set(elemIds);
        setProject((prev) => {
          const pages = [...prev.pages];
          const page = { ...pages[prev.pi] };
          page.items = page.items.map((item) =>
            idSet.has(item.id)
              ? {
                  ...item,
                  x: Math.round((item.x + dx) * 10) / 10,
                  y: Math.round((item.y + dy) * 10) / 10,
                }
              : item
          );
          pages[prev.pi] = page;
          const nextState: ProjectState = { ...prev, pages };
          saveToStorage(nextState);
          return nextState;
        });
      }
      setAutoSnappedArtboard({
        artboardId,
        artboardName,
        edge,
        timestamp: Date.now(),
      });
      showToast(`Auto-snapped group to ${artboardName} (${edge} edge)`);
    },
    [saveToStorage]
  );

  // Manual or contextual Snap to Nearest Artboard ('edge' | 'inset' | 'center')
  const handleSnapSelectionToNearestArtboard = useCallback(
    (mode: 'edge' | 'inset' | 'center' = 'edge') => {
      const rawIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
      const targetItems = currentPage.items.filter(
        (i) => rawIds.includes(i.id) && i.t !== 'artboard' && !i.locked
      );
      if (targetItems.length === 0) {
        showToast('Select non-locked elements to snap to an artboard');
        return;
      }

      const artboards = currentPage.items.filter((i) => i.t === 'artboard' && !i.hidden);
      if (artboards.length === 0) {
        showToast('No artboard found on this page');
        return;
      }

      const bbox = getBoundingBox(targetItems);
      const gcx = bbox.x + bbox.w / 2;
      const gcy = bbox.y + bbox.h / 2;

      let nearest = artboards[0];
      let bestDist = Infinity;
      let bestCenterDist = Infinity;
      for (const ab of artboards) {
        const dx = Math.max(ab.x - gcx, 0, gcx - (ab.x + ab.w));
        const dy = Math.max(ab.y - gcy, 0, gcy - (ab.y + ab.h));
        const dist = Math.hypot(dx, dy);
        const cDist = Math.hypot(ab.x + ab.w / 2 - gcx, ab.y + ab.h / 2 - gcy);
        if (dist < bestDist - 0.5 || (Math.abs(dist - bestDist) <= 0.5 && cDist < bestCenterDist)) {
          bestDist = dist;
          bestCenterDist = cDist;
          nearest = ab;
        }
      }

      let snapDx = 0;
      let snapDy = 0;
      let snappedEdge: 'left' | 'right' | 'top' | 'bottom' | 'inside' = 'inside';

      if (mode === 'center') {
        snapDx = nearest.x + nearest.w / 2 - gcx;
        snapDy = nearest.y + nearest.h / 2 - gcy;
        snappedEdge = 'inside';
      } else if (mode === 'inset') {
        const pad = 16;
        if (bbox.w <= nearest.w - pad * 2) {
          const minX = nearest.x + pad;
          const maxX = nearest.x + nearest.w - pad - bbox.w;
          const clampedX = Math.max(minX, Math.min(maxX, bbox.x));
          snapDx = clampedX - bbox.x;
        } else {
          snapDx = nearest.x + nearest.w / 2 - gcx;
        }
        if (bbox.h <= nearest.h - pad * 2) {
          const minY = nearest.y + pad;
          const maxY = nearest.y + nearest.h - pad - bbox.h;
          const clampedY = Math.max(minY, Math.min(maxY, bbox.y));
          snapDy = clampedY - bbox.y;
        } else {
          snapDy = nearest.y + nearest.h / 2 - gcy;
        }
        snappedEdge = 'inside';
      } else {
        const candidates: { edge: 'left' | 'right' | 'top' | 'bottom'; dist: number }[] = [
          { edge: 'left', dist: Math.abs(bbox.x - nearest.x) },
          { edge: 'right', dist: Math.abs(bbox.x + bbox.w - (nearest.x + nearest.w)) },
          { edge: 'top', dist: Math.abs(bbox.y - nearest.y) },
          { edge: 'bottom', dist: Math.abs(bbox.y + bbox.h - (nearest.y + nearest.h)) },
        ];
        candidates.sort((a, b) => a.dist - b.dist);
        const closest = candidates[0].edge;
        snappedEdge = closest;

        if (closest === 'left' || closest === 'right') {
          snapDx =
            closest === 'left'
              ? nearest.x - bbox.x
              : nearest.x + nearest.w - (bbox.x + bbox.w);
          const minY = nearest.y;
          const maxY = Math.max(nearest.y, nearest.y + nearest.h - bbox.h);
          const clampedY = Math.max(minY, Math.min(maxY, bbox.y));
          snapDy = clampedY - bbox.y;
        } else {
          snapDy =
            closest === 'top'
              ? nearest.y - bbox.y
              : nearest.y + nearest.h - (bbox.y + bbox.h);
          const minX = nearest.x;
          const maxX = Math.max(nearest.x, nearest.x + nearest.w - bbox.w);
          const clampedX = Math.max(minX, Math.min(maxX, bbox.x));
          snapDx = clampedX - bbox.x;
        }
      }

      const rx = Math.round(snapDx * 10) / 10;
      const ry = Math.round(snapDy * 10) / 10;
      const targetIdSet = new Set(targetItems.map((i) => i.id));
      const abName = (nearest as any).n || 'Artboard';

      if (rx !== 0 || ry !== 0) {
        pushSnapshot();
        setProject((prev) => {
          const pages = [...prev.pages];
          const page = { ...pages[prev.pi] };
          page.items = page.items.map((item) =>
            targetIdSet.has(item.id)
              ? {
                  ...item,
                  x: Math.round((item.x + rx) * 10) / 10,
                  y: Math.round((item.y + ry) * 10) / 10,
                }
              : item
          );
          pages[prev.pi] = page;
          const nextState: ProjectState = { ...prev, pages };
          saveToStorage(nextState);
          return nextState;
        });
      }

      hapticSuccess();
      setAutoSnappedArtboard({
        artboardId: nearest.id,
        artboardName: abName,
        edge: snappedEdge,
        timestamp: Date.now(),
      });
      showToast(
        mode === 'center'
          ? `Centered inside ${abName}`
          : mode === 'inset'
          ? `Snapped inside ${abName} (16px inset)`
          : `Snapped to ${abName} (${snappedEdge} edge)`
      );
    },
    [selectedIds, selectedId, currentPage.items, pushSnapshot, saveToStorage]
  );

  // Auto-layout handler for grouped or container elements
  const handleAutoLayout = useCallback(
    (
      direction: 'none' | 'vertical' | 'horizontal',
      gap: number = 12,
      padding: number = 16,
      align: 'start' | 'center' | 'end' = 'start'
    ) => {
      const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
      if (ids.length === 0) return;

      pushSnapshot();

      setProject((prev) => {
        const pages = [...prev.pages];
        const page = { ...pages[prev.pi] };
        let items = [...page.items];

        const primary = items.find((i) => i.id === ids[0]);
        if (!primary) return prev;

        // Ensure groupId if multiple items selected without a groupId
        let activeGroupId = primary.groupId;
        if (!activeGroupId && ids.length > 1 && primary.t !== 'artboard') {
          activeGroupId = Date.now();
          items = items.map((item) =>
            ids.includes(item.id) ? { ...item, groupId: activeGroupId } : item
          );
        }

        if (primary.t === 'artboard') {
          items = items.map((item) =>
            item.id === primary.id
              ? {
                  ...item,
                  autoLayout: direction,
                  autoLayoutGap: gap,
                  autoLayoutPadding: padding,
                  autoLayoutAlign: align,
                }
              : item
          );
          if (direction !== 'none') {
            const children = items.filter((i) => i.t !== 'artboard' && isInside(i, primary));
            items = applyAutoLayout(items, children, direction, gap, padding, align, primary);
          }
        } else if (activeGroupId) {
          items = items.map((item) =>
            item.groupId === activeGroupId
              ? {
                  ...item,
                  autoLayout: direction,
                  autoLayoutGap: gap,
                  autoLayoutPadding: padding,
                  autoLayoutAlign: align,
                }
              : item
          );
          if (direction !== 'none') {
            const groupChildren = items.filter((i) => i.groupId === activeGroupId);
            items = applyAutoLayout(items, groupChildren, direction, gap, 0, align);
          }
        }

        page.items = items;
        pages[prev.pi] = page;
        const nextState = { ...prev, pages };
        saveToStorage(nextState);
        return nextState;
      });

      showToast(direction === 'none' ? 'Auto-layout: Freeform' : `Auto-layout: ${direction}`);
    },
    [selectedIds, selectedId, pushSnapshot, saveToStorage]
  );

  // Eyedropper start & sample handlers
  const handleStartEyedropper = useCallback((targetProp: 'fill' | 'stroke') => {
    setEyedropperTarget(targetProp);
    setTool('eyedropper');
    showToast(`Eyedropper active: tap canvas to pick ${targetProp} color`);
  }, []);

  const handlePickColor = useCallback(
    (color: string) => {
      const targetProp = eyedropperTarget || 'fill';
      const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
      if (ids.length > 0) {
        pushSnapshot();
        const updates: Partial<CanvasElement> =
          targetProp === 'stroke'
            ? ({ stroke: color } as any)
            : ({ fill: color, gradientFill: undefined, radialGradient: undefined } as any);
        updateElementsBulk(ids, updates);
        showToast(`Applied ${targetProp}: ${color}`);
      } else {
        showToast(`Sampled color: ${color}`);
      }
      setEyedropperTarget(null);
      setTool('select');
    },
    [eyedropperTarget, selectedIds, selectedId, pushSnapshot, updateElementsBulk]
  );

  // Canva-style Copy Style & Paste Style
  const handleCopyStyle = useCallback((el: CanvasElement) => {
    const styleObj: Record<string, any> = {
      op: el.op,
      blendMode: el.blendMode,
      sh: el.sh,
      shadowStyle: el.shadowStyle,
      shadowIntensity: el.shadowIntensity,
    };
    if ('fill' in el) styleObj.fill = el.fill;
    if ('gradientFill' in el) styleObj.gradientFill = el.gradientFill;
    if (el.radialGradient) styleObj.radialGradient = JSON.parse(JSON.stringify(el.radialGradient));
    if ('stroke' in el) styleObj.stroke = el.stroke;
    if ('sw' in el) styleObj.sw = el.sw;
    if ('strokeStyle' in el) styleObj.strokeStyle = el.strokeStyle;
    if ('r' in el) styleObj.r = el.r;
    copiedStyleRef.current = styleObj as Partial<CanvasElement>;
    setCanPasteStyle(true);
    showToast('Copied style');
  }, []);

  const handlePasteStyle = useCallback(() => {
    const copied = copiedStyleRef.current;
    if (!copied) return;
    const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    if (ids.length === 0) return;
    pushSnapshot();
    updateElementsBulk(ids, copied);
    showToast('Pasted style');
  }, [selectedIds, selectedId, pushSnapshot, updateElementsBulk]);

  // Fit elements to view (reads live projectRef so delayed calls after page switch always fit the new page)
  const fitArtboards = useCallback(
    (targetElem?: CanvasElement) => {
      const liveProject = projectRef.current;
      const livePage =
        liveProject.pages[Math.min(liveProject.pi, liveProject.pages.length - 1)] ||
        liveProject.pages[0];
      const items = livePage?.items || [];
      const artboards = items.filter((i) => i.t === 'artboard');
      const list = targetElem ? [targetElem] : artboards.length > 0 ? artboards : items;
      if (!list.length) return;

      const bbox = getBoundingBox(list);
      const windowW = window.innerWidth;
      const windowH = window.innerHeight;
      const headerH = isPreview ? 0 : 56;
      const topInset = isPreview ? 24 : 74;
      const bottomInset = isPreview
        ? 24
        : isPropertiesOpen
        ? Math.min(Math.round(windowH * 0.46), 360) + 20
        : 84;
      const padX = windowW < 640 ? 32 : 56;

      const availW = Math.max(180, windowW - padX);
      const availH = Math.max(180, windowH - headerH - topInset - bottomInset);

      const scaleX = availW / bbox.w;
      const scaleY = availH / bbox.h;
      const fitZoom = Math.min(1.8, Math.max(0.15, Math.min(scaleX, scaleY)));

      const nextX = (windowW - bbox.w * fitZoom) / 2 - bbox.x * fitZoom;
      const nextY = topInset + (availH - bbox.h * fitZoom) / 2 - bbox.y * fitZoom;

      setViewport({ x: nextX, y: nextY, z: fitZoom });
    },
    [isPreview, isPropertiesOpen]
  );

  // Insert a selected design template from 50+ library
  const handleInsertTemplate = useCallback(
    (template: DesignTemplate) => {
      pushSnapshot();
      const artboards = currentPage.items.filter((i) => i.t === 'artboard');
      let startX = 40;
      let startY = 40;
      if (artboards.length > 0) {
        const rightmost = Math.max(...artboards.map((a) => a.x + a.w));
        startX = rightmost + 60;
        startY = artboards[0].y;
      }

      const artboardId = Date.now();
      const firstElem = template.elements[0];
      const hasFullBleedBackdrop =
        firstElem &&
        firstElem.t === 'rect' &&
        (firstElem.x ?? 0) === 0 &&
        (firstElem.y ?? 0) === 0 &&
        Math.abs((firstElem.w ?? 0) - template.w) <= 2 &&
        Math.abs((firstElem.h ?? 0) - template.h) <= 2;

      // Promote full-bleed background rect directly onto the artboard so dragging the card/page
      // moves the entire artboard + child elements together cohesively without detaching the backdrop.
      const newArtboard: CanvasElement = {
        id: artboardId,
        t: 'artboard',
        n: template.title,
        x: startX,
        y: startY,
        w: template.w,
        h: template.h,
        fill: hasFullBleedBackdrop && 'fill' in firstElem && firstElem.fill ? firstElem.fill : '#f8fafc',
        ...(hasFullBleedBackdrop && 'gradientFill' in firstElem && firstElem.gradientFill
          ? { gradientFill: firstElem.gradientFill }
          : {}),
        ...(hasFullBleedBackdrop && firstElem.radialGradient
          ? { radialGradient: JSON.parse(JSON.stringify(firstElem.radialGradient)) }
          : {}),
        ...(hasFullBleedBackdrop && 'r' in firstElem && firstElem.r !== undefined
          ? { r: firstElem.r }
          : {}),
        ...(hasFullBleedBackdrop && 'stroke' in firstElem && firstElem.stroke
          ? { stroke: firstElem.stroke }
          : {}),
        ...(hasFullBleedBackdrop && 'sw' in firstElem && firstElem.sw !== undefined
          ? { sw: firstElem.sw }
          : {}),
        ...(hasFullBleedBackdrop && 'strokeStyle' in firstElem && firstElem.strokeStyle
          ? { strokeStyle: firstElem.strokeStyle }
          : {}),
        sh: hasFullBleedBackdrop && firstElem.sh !== undefined ? firstElem.sh : true,
        shadowStyle: hasFullBleedBackdrop ? firstElem.shadowStyle : undefined,
        shadowIntensity:
          hasFullBleedBackdrop && firstElem.shadowIntensity !== undefined
            ? firstElem.shadowIntensity
            : 12,
        op: hasFullBleedBackdrop && firstElem.op !== undefined ? firstElem.op : 1,
        rot: 0,
      };

      const childTemplates = hasFullBleedBackdrop
        ? template.elements.slice(1)
        : template.elements;

      const newItems: CanvasElement[] = childTemplates.map((item, idx) => ({
        ...item,
        id: artboardId + idx + 1,
        x: startX + (item.x ?? 0),
        y: startY + (item.y ?? 0),
      } as CanvasElement));

      const allNew = [newArtboard, ...newItems];

      setProject((prev) => {
        const pages = [...prev.pages];
        const page = { ...pages[prev.pi] };
        page.items = [...page.items, ...allNew];
        pages[prev.pi] = page;
        const nextState = { ...prev, pages };
        saveToStorage(nextState);
        return nextState;
      });

      setSelectedId(artboardId);
      setSelectedIds([artboardId]);
      setIsTemplatesOpen(false);
      showToast(`Added ${template.title}`);
      setTimeout(() => fitArtboards(newArtboard), 80);
    },
    [currentPage, pushSnapshot, saveToStorage, fitArtboards]
  );

  // Auto-fit on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      fitArtboards();
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/INPUT|TEXTAREA/.test((e.target as HTMLElement)?.tagName)) return;

      const isMod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (isMod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (isMod && key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (isMod && key === 'g') {
        e.preventDefault();
        if (e.shiftKey) handleUngroupSelected();
        else handleGroupSelected();
      } else if (isMod && key === 'd') {
        if (selectedId) {
          e.preventDefault();
          duplicateElement(selectedId);
        }
      } else if (isMod && key === 'c') {
        const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
        if (ids.length > 0) {
          e.preventDefault();
          clipboardRef.current = JSON.parse(
            JSON.stringify(currentPage.items.filter((i) => ids.includes(i.id)))
          );
          showToast(`Copied ${clipboardRef.current.length} item(s)`);
        }
      } else if (isMod && key === 'v' && clipboardRef.current.length > 0) {
        e.preventDefault();
        pushSnapshot();
        const stamp = Date.now();
        const pasted = clipboardRef.current.map((item, idx) => ({
          ...JSON.parse(JSON.stringify(item)),
          id: stamp + idx,
          x: item.x + 28,
          y: item.y + 28,
        }));
        const pastedIds = pasted.map((p) => p.id);
        setProject((prev) => {
          const pages = [...prev.pages];
          const page = { ...pages[prev.pi] };
          page.items = [...page.items, ...pasted];
          pages[prev.pi] = page;
          const nextState = { ...prev, pages };
          saveToStorage(nextState);
          return nextState;
        });
        setSelectedIds(pastedIds);
        setSelectedId(pastedIds[0]);
        clipboardRef.current = pasted;
        showToast(`Pasted ${pasted.length} item(s)`);
      } else if (isMod && key === 'a') {
        e.preventDefault();
        const allIds = currentPage.items
          .filter((i) => i.t !== 'artboard' && !i.hidden)
          .map((i) => i.id);
        setSelectedIds(allIds);
        setSelectedId(allIds[0] || null);
        if (allIds.length > 0) showToast(`Selected ${allIds.length} items`);
      } else if (isMod && key === '0') {
        e.preventDefault();
        fitArtboards();
      } else if (isMod && (e.key === ']' || e.code === 'BracketRight')) {
        if (selectedId) {
          e.preventDefault();
          if (e.shiftKey) bringToFront(selectedId);
          else bringForward(selectedId);
        }
      } else if (isMod && (e.key === '[' || e.code === 'BracketLeft')) {
        if (selectedId) {
          e.preventDefault();
          if (e.shiftKey) sendToBack(selectedId);
          else sendBackward(selectedId);
        }
      } else if (isMod && key === 'l') {
        const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
        if (ids.length > 0) {
          e.preventDefault();
          const first = currentPage.items.find((i) => i.id === ids[0]);
          const nextLocked = !first?.locked;
          pushSnapshot();
          updateElementsBulk(ids, { locked: nextLocked });
          showToast(nextLocked ? 'Locked' : 'Unlocked');
        }
      } else if (
        (e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight' ||
          e.key === 'ArrowUp' ||
          e.key === 'ArrowDown') &&
        (selectedId || selectedIds.length > 0)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
        setProject((prev) => {
          const pages = [...prev.pages];
          const page = { ...pages[prev.pi] };
          page.items = page.items.map((item) =>
            ids.includes(item.id) && !item.locked
              ? { ...item, x: item.x + dx, y: item.y + dy }
              : item
          );
          pages[prev.pi] = page;
          const nextState = { ...prev, pages };
          saveToStorage(nextState);
          return nextState;
        });
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          pushSnapshot();
          setProject((prev) => {
            const pages = [...prev.pages];
            const page = { ...pages[prev.pi] };
            page.items = page.items.filter((i) => !selectedIds.includes(i.id));
            pages[prev.pi] = page;
            const nextState = { ...prev, pages };
            saveToStorage(nextState);
            return nextState;
          });
          setSelectedId(null);
          setSelectedIds([]);
          showToast('Deleted selected');
        } else if (selectedId) {
          e.preventDefault();
          deleteElement(selectedId);
        }
      } else if (e.key === 'Escape') {
        setSelectedId(null);
        setSelectedIds([]);
        setTool('select');
        setEyedropperTarget(null);
        setIsPropertiesOpen(false);
      } else if (!isMod && key === 'v') {
        setTool('select');
      } else if (!isMod && key === 'h') {
        setTool('hand');
      } else if (!isMod && key === 'i') {
        handleStartEyedropper('fill');
      } else if (!isMod && key === 't') {
        setTool('text');
      } else if (!isMod && key === 'r') {
        setTool('rect');
      } else if (!isMod && key === 'o') {
        setTool('oval');
      } else if (!isMod && key === 'l') {
        setTool('line');
      } else if (!isMod && key === 'p') {
        setTool('pen');
      } else if (!isMod && key === 'a') {
        setTool('artboard');
      } else if (e.key === '+' || e.key === '=') {
        setViewport((prev) => ({ ...prev, z: Math.min(4, prev.z * 1.2) }));
      } else if (e.key === '-') {
        setViewport((prev) => ({ ...prev, z: Math.max(0.1, prev.z / 1.2) }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedId,
    selectedIds,
    currentPage.items,
    deleteElement,
    handleUndo,
    handleRedo,
    handleGroupSelected,
    handleUngroupSelected,
    handleStartEyedropper,
    duplicateElement,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    updateElementsBulk,
    fitArtboards,
    pushSnapshot,
    saveToStorage,
  ]);

  // Image Upload handler with automatic Smart Palette extraction
  const handleImageFile = (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Optimize image resolution if too huge
        const maxDimension = 1400;
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL(
            file.type === 'image/png' ? 'image/png' : 'image/jpeg',
            0.88
          );
          const extractedColors = extractPaletteFromCanvas(canvas, 6);

          pushSnapshot();

          if (replaceTargetIdRef.current) {
            const targetId = replaceTargetIdRef.current;
            replaceTargetIdRef.current = null;
            setProject((prev) => {
              const pages = [...prev.pages];
              const page = { ...pages[prev.pi] };
              page.items = page.items.map((item) =>
                item.id === targetId
                  ? ({
                      ...item,
                      src: dataUrl,
                      h: Math.round(180 * (canvas.height / canvas.width)),
                      palette: extractedColors,
                    } as CanvasElement)
                  : item
              );
              pages[prev.pi] = page;
              const nextState: ProjectState = {
                ...prev,
                pages,
                smartPalette: mergeSmartPalette(prev.smartPalette, extractedColors, 16),
              };
              saveToStorage(nextState);
              return nextState;
            });
            showToast(
              extractedColors.length > 0
                ? `Image replaced · ${extractedColors.length} colors added to Smart Palette`
                : 'Image replaced'
            );
          } else {
            const vp = viewportRef.current;
            const centerX = (window.innerWidth / 2 - vp.x) / vp.z;
            const centerY = (window.innerHeight / 2 - vp.y) / vp.z;
            const displayW = Math.min(300, canvas.width);
            const displayH = Math.round(displayW * (canvas.height / canvas.width));

            const newImageElem: CanvasElement = {
              id: Date.now(),
              t: 'image',
              src: dataUrl,
              x: Math.round(centerX - displayW / 2),
              y: Math.round(centerY - displayH / 2),
              w: displayW,
              h: displayH,
              op: 1,
              r: 8,
              fm: 'xMidYMid slice',
              palette: extractedColors,
            };

            setProject((prev) => {
              const pages = [...prev.pages];
              const page = { ...pages[prev.pi] };
              let items = [...page.items, newImageElem];
              items = recalculateAutoLayouts(items, [newImageElem.id]);
              page.items = items;
              pages[prev.pi] = page;
              const nextState: ProjectState = {
                ...prev,
                pages,
                smartPalette: mergeSmartPalette(prev.smartPalette, extractedColors, 16),
              };
              saveToStorage(nextState);
              return nextState;
            });

            setSelectedId(newImageElem.id);
            setSelectedIds([newImageElem.id]);
            setTool('select');
            showToast(
              extractedColors.length > 0
                ? `Image added · ${extractedColors.length} Smart Palette colors`
                : 'Image added'
            );
          }
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // On-demand Smart Palette extraction for any existing image on canvas
  const handleExtractImagePalette = useCallback(
    async (elementId: number) => {
      const target = currentPage.items.find((i) => i.id === elementId && i.t === 'image');
      if (!target || target.t !== 'image') return;
      const colors = await extractDominantColors(target.src, 6);
      if (colors.length === 0) {
        showToast('Could not extract colors from this image');
        return;
      }
      setProject((prev) => {
        const pages = [...prev.pages];
        const page = { ...pages[prev.pi] };
        page.items = page.items.map((item) =>
          item.id === elementId ? ({ ...item, palette: colors } as CanvasElement) : item
        );
        pages[prev.pi] = page;
        const nextState: ProjectState = {
          ...prev,
          pages,
          smartPalette: mergeSmartPalette(prev.smartPalette, colors, 16),
        };
        saveToStorage(nextState);
        return nextState;
      });
      showToast(`Extracted ${colors.length} dominant colors`);
    },
    [currentPage.items, saveToStorage]
  );

  const handleClearSmartPalette = useCallback(() => {
    setProject((prev) => {
      const nextState: ProjectState = { ...prev, smartPalette: [] };
      saveToStorage(nextState);
      return nextState;
    });
    showToast('Cleared Smart Palette');
  }, [saveToStorage]);

  const paletteRollCountRef = useRef(0);

  const handleRandomizePalette = useCallback(() => {
    const targetIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    const targetSet = new Set(targetIds);
    const fillableIds = currentPage.items
      .filter(
        (item) =>
          targetSet.has(item.id) &&
          (item.t === 'artboard' ||
            item.t === 'rect' ||
            item.t === 'oval' ||
            item.t === 'text' ||
            item.t === 'note')
      )
      .map((item) => item.id);

    if (fillableIds.length === 0) {
      showToast('Select shapes, text, cards, or notes to randomize their fill palette');
      return;
    }

    const currentSmart = project.smartPalette || [];
    // Collect fallback colors from canvas elements only when project.smartPalette is empty
    const canvasSeedColors: string[] = [];
    if (currentSmart.length === 0) {
      for (const item of currentPage.items) {
        if ('fill' in item && item.fill && item.fill !== 'none' && item.fill !== 'transparent') {
          canvasSeedColors.push(item.fill);
        }
        if (item.t === 'image' && item.palette?.length) {
          canvasSeedColors.push(...item.palette);
        }
      }
    }

    paletteRollCountRef.current += 1;
    const complementary = generateComplementaryPalette(
      currentSmart,
      Math.max(fillableIds.length, 6),
      canvasSeedColors,
      paletteRollCountRef.current
    );

    if (complementary.length === 0) return;

    pushSnapshot();
    const assignedColorById = new Map<number, string>();
    fillableIds.forEach((id, idx) => {
      assignedColorById.set(id, complementary[idx % complementary.length]);
    });

    setProject((prev) => {
      const pages = [...prev.pages];
      const page = { ...pages[prev.pi] };
      page.items = page.items.map((item) => {
        const nextFill = assignedColorById.get(item.id);
        if (!nextFill) return item;
        return {
          ...item,
          fill: nextFill,
          gradientFill: undefined,
          radialGradient: undefined,
        } as CanvasElement;
      });
      pages[prev.pi] = page;
      const nextState: ProjectState = { ...prev, pages };
      saveToStorage(nextState);
      return nextState;
    });

    hapticDrop();
    showToast(
      currentSmart.length > 0
        ? `Applied complementary Smart Palette to ${fillableIds.length} element${fillableIds.length > 1 ? 's' : ''}`
        : `Applied complementary palette to ${fillableIds.length} element${fillableIds.length > 1 ? 's' : ''}`
    );
  }, [selectedIds, selectedId, currentPage.items, project.smartPalette, pushSnapshot, saveToStorage]);

  // Add generated QR Code as crisp vector-framed image element on canvas
  const handleAddQrCode = useCallback(
    (qrDataUrl: string, value: string, radius = 10) => {
      pushSnapshot();
      const selectedItem = currentPage.items.find((i) => i.id === selectedId);
      const targetArtboard =
        selectedItem?.t === 'artboard'
          ? selectedItem
          : currentPage.items.find((i) => i.t === 'artboard');

      const qrSize = 156;
      let posX: number;
      let posY: number;
      if (targetArtboard) {
        posX = Math.round(targetArtboard.x + targetArtboard.w / 2 - qrSize / 2);
        posY = Math.round(targetArtboard.y + targetArtboard.h / 2 - qrSize / 2);
      } else {
        const vp = viewportRef.current;
        posX = Math.round((window.innerWidth / 2 - vp.x) / vp.z - qrSize / 2);
        posY = Math.round((window.innerHeight / 2 - vp.y) / vp.z - qrSize / 2);
      }

      const qrElem: CanvasElement = {
        id: Date.now(),
        t: 'image',
        src: qrDataUrl,
        qrValue: value,
        x: posX,
        y: posY,
        w: qrSize,
        h: qrSize,
        op: 1,
        r: radius,
        aspectLocked: true,
        fm: 'xMidYMid meet',
        sh: true,
        shadowStyle: 'subtle',
        shadowIntensity: 6,
      };

      createElement(qrElem);
      setSelectedId(qrElem.id);
      setSelectedIds([qrElem.id]);
      setTool('select');
      showToast('QR Code added to canvas');
    },
    [currentPage.items, selectedId, pushSnapshot, createElement]
  );

  const handleImageFileRef = useRef(handleImageFile);
  handleImageFileRef.current = handleImageFile;

  // Drag and drop or paste image to canvas
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => e.preventDefault();
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer?.files[0];
      if (file && file.type.startsWith('image/')) {
        handleImageFileRef.current(file);
      }
    };
    const handlePaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files || []).find((f) => f.type.startsWith('image/'));
      if (file) {
        handleImageFileRef.current(file);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  const handleAddDevicePreset = (preset: DevicePreset) => {
    pushSnapshot();
    const artboardCount = currentPage.items.filter((i) => i.t === 'artboard').length;
    const artboards = currentPage.items.filter((i) => i.t === 'artboard');
    const lastArtboard = artboards[artboards.length - 1];
    const newX = lastArtboard ? lastArtboard.x + lastArtboard.w + 40 : 40;
    const newY = lastArtboard ? lastArtboard.y : 40;

    const newArtboard: CanvasElement = {
      id: Date.now(),
      t: 'artboard',
      n: `${preset.name} (${artboardCount + 1})`,
      x: newX,
      y: newY,
      w: preset.w,
      h: preset.h,
      fill: '#ffffff',
      sh: true,
      shadowIntensity: 12,
      op: 1,
      rot: 0,
    };

    createElement(newArtboard);
    setSelectedId(newArtboard.id);
    setSelectedIds([newArtboard.id]);
    showToast(`Added ${preset.name}`);
    setTimeout(() => fitArtboards(newArtboard), 60);
  };

  const handleAddTemplateComponent = (compType: string) => {
    pushSnapshot();
    const firstArtboard = currentPage.items.find((i) => i.t === 'artboard');
    const baseX = firstArtboard ? firstArtboard.x + 24 : 60;
    const baseY = firstArtboard ? firstArtboard.y + 120 : 100;
    const baseW = firstArtboard ? Math.min(332, firstArtboard.w - 48) : 320;

    if (compType === 'btn-primary') {
      const btnId = Date.now();
      const btnRect: CanvasElement = {
        id: btnId,
        t: 'rect',
        x: baseX,
        y: baseY,
        w: baseW,
        h: 48,
        fill: '#2563eb',
        gradientFill: 'url(#grad-gamura-blue)',
        r: 14,
        sh: true,
        shadowIntensity: 12,
      };
      const btnText: CanvasElement = {
        id: btnId + 1,
        t: 'text',
        x: baseX + Math.round(baseW / 2) - 45,
        y: baseY + 14,
        w: 90,
        h: 20,
        text: 'Action Button',
        fs: 15,
        b: true,
        fill: '#ffffff',
      };
      createElement(btnRect);
      createElement(btnText);
      setSelectedId(btnRect.id);
      setSelectedIds([btnRect.id, btnText.id]);
      showToast('Added Primary Button');
    } else if (compType === 'card-feature') {
      const cardId = Date.now();
      const cardRect: CanvasElement = {
        id: cardId,
        t: 'rect',
        x: baseX,
        y: baseY,
        w: baseW,
        h: 110,
        fill: '#ffffff',
        r: 18,
        sh: true,
        shadowIntensity: 10,
      };
      const titleText: CanvasElement = {
        id: cardId + 1,
        t: 'text',
        x: baseX + 18,
        y: baseY + 18,
        w: 180,
        h: 24,
        text: 'Interactive Card',
        fs: 16,
        b: true,
        fill: '#0f172a',
      };
      const descText: CanvasElement = {
        id: cardId + 2,
        t: 'text',
        x: baseX + 18,
        y: baseY + 46,
        w: 240,
        h: 36,
        text: 'Customizable card with clean drop shadow\nand responsive vector sizing.',
        fs: 12,
        b: false,
        fill: '#64748b',
      };
      createElement(cardRect);
      createElement(titleText);
      createElement(descText);
      setSelectedId(cardRect.id);
      setSelectedIds([cardRect.id, titleText.id, descText.id]);
      showToast('Added Feature Card');
    } else if (compType === 'search-bar') {
      const sId = Date.now();
      const searchRect: CanvasElement = {
        id: sId,
        t: 'rect',
        x: baseX,
        y: baseY,
        w: baseW,
        h: 46,
        fill: '#f1f5f9',
        stroke: '#e2e8f0',
        sw: 1.5,
        r: 23,
      };
      const searchText: CanvasElement = {
        id: sId + 1,
        t: 'text',
        x: baseX + 20,
        y: baseY + 14,
        w: 160,
        h: 20,
        text: 'Search anything...',
        fs: 14,
        b: false,
        fill: '#94a3b8',
      };
      createElement(searchRect);
      createElement(searchText);
      setSelectedId(searchRect.id);
      setSelectedIds([searchRect.id, searchText.id]);
      showToast('Added Search Bar');
    } else if (compType === 'nav-bar') {
      const navId = Date.now();
      const navRect: CanvasElement = {
        id: navId,
        t: 'rect',
        x: baseX,
        y: baseY,
        w: baseW,
        h: 56,
        fill: '#0f172a',
        r: 20,
        sh: true,
        shadowIntensity: 18,
      };
      createElement(navRect);
      setSelectedId(navRect.id);
      setSelectedIds([navRect.id]);
      showToast('Added Nav Bar');
    }
  };

  const selectedElement = currentPage.items.find((i) => i.id === selectedId) || null;

  const nearestArtboardInfo = useMemo(() => {
    const activeIds =
      selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    const activeNonArtboards = currentPage.items.filter(
      (i) => activeIds.includes(i.id) && i.t !== 'artboard' && !i.hidden
    );
    const artboards = currentPage.items.filter((i) => i.t === 'artboard' && !i.hidden);

    if (activeNonArtboards.length === 0 || artboards.length === 0) {
      return { nearestArtboardName: null as string | null, isNearArtboardEdge: false };
    }

    const bbox = getBoundingBox(activeNonArtboards);
    const gcx = bbox.x + bbox.w / 2;
    const gcy = bbox.y + bbox.h / 2;

    let nearest = artboards[0];
    let bestDist = Infinity;
    let bestCenterDist = Infinity;
    for (const ab of artboards) {
      const dx = Math.max(ab.x - gcx, 0, gcx - (ab.x + ab.w));
      const dy = Math.max(ab.y - gcy, 0, gcy - (ab.y + ab.h));
      const dist = Math.hypot(dx, dy);
      const cDist = Math.hypot(ab.x + ab.w / 2 - gcx, ab.y + ab.h / 2 - gcy);
      if (dist < bestDist - 0.5 || (Math.abs(dist - bestDist) <= 0.5 && cDist < bestCenterDist)) {
        bestDist = dist;
        bestCenterDist = cDist;
        nearest = ab;
      }
    }

    const threshold = 34;
    const overlapsY = bbox.y + bbox.h >= nearest.y - threshold && bbox.y <= nearest.y + nearest.h + threshold;
    const overlapsX = bbox.x + bbox.w >= nearest.x - threshold && bbox.x <= nearest.x + nearest.w + threshold;

    const nearLeft = overlapsY && Math.abs(bbox.x - nearest.x) <= threshold;
    const nearRight = overlapsY && Math.abs(bbox.x + bbox.w - (nearest.x + nearest.w)) <= threshold;
    const nearTop = overlapsX && Math.abs(bbox.y - nearest.y) <= threshold;
    const nearBottom = overlapsX && Math.abs(bbox.y + bbox.h - (nearest.y + nearest.h)) <= threshold;

    return {
      nearestArtboardName: (nearest as any).n || 'Artboard',
      isNearArtboardEdge: nearLeft || nearRight || nearTop || nearBottom,
    };
  }, [currentPage.items, selectedId, selectedIds]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#ececea] dark:bg-[#18181a] font-sans antialiased text-gray-900 dark:text-gray-100 select-none">
      {/* Hidden File Input for Image Uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
          e.target.value = '';
        }}
      />

      {/* Main Top Header */}
      {!isPreview && (
        <Header
          title={project.name}
          onTitleChange={(newTitle) => {
            pushSnapshot();
            setProject((prev) => {
              const updated = { ...prev, name: newTitle };
              saveToStorage(updated);
              return updated;
            });
          }}
          commentCount={currentPage.cm.length}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
          onOpenComments={() => setIsCommentsOpen(true)}
          onOpenExport={() => setIsExportOpen(true)}
          onOpenVersionHistory={() => setIsVersionHistoryOpen(true)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          onDuplicatePage={() => {
            pushSnapshot();
            const duplicatedPage: Page = {
              ...JSON.parse(JSON.stringify(currentPage)),
              id: `p_${Date.now()}`,
              n: `${currentPage.n} copy`,
            };
            setProject((prev) => {
              const updated = {
                ...prev,
                pages: [...prev.pages, duplicatedPage],
                pi: prev.pages.length,
              };
              saveToStorage(updated);
              return updated;
            });
            showToast('Page duplicated');
          }}
          onClearPage={() => {
            pushSnapshot();
            setProject((prev) => {
              const pages = [...prev.pages];
              pages[prev.pi] = { ...pages[prev.pi], items: [] };
              const updated = { ...prev, pages };
              saveToStorage(updated);
              return updated;
            });
            setSelectedId(null);
            setSelectedIds([]);
            showToast('Page cleared (⌘Z to undo)');
          }}
          onNewProject={() => {
            pushSnapshot();
            const newSeed: ProjectState = {
              name: 'Untitled Project',
              id: Date.now(),
              pi: 0,
              pages: [
                {
                  id: 'p1',
                  n: 'Page 1',
                  items: [
                    {
                      id: 101,
                      t: 'artboard',
                      n: 'Artboard 1',
                      x: 40,
                      y: 40,
                      w: 375,
                      h: 720,
                      fill: '#ffffff',
                      sh: true,
                      op: 1,
                      rot: 0,
                    },
                  ],
                  cm: [],
                },
              ],
            };
            setProject(newSeed);
            saveToStorage(newSeed);
            setSelectedId(null);
            setSelectedIds([]);
            setTimeout(() => fitArtboards(), 40);
            showToast('New project created (⌘Z to undo)');
          }}
          onResetToDemo={() => {
            pushSnapshot();
            const seed = createInitialSeed();
            setProject(seed);
            saveToStorage(seed);
            setSelectedId(null);
            setSelectedIds([]);
            setTimeout(() => fitArtboards(), 40);
            showToast('Loaded demo design');
          }}
          onCloseApp={() => {
            fitArtboards();
            showToast('Canvas centered');
          }}
        />
      )}

      {/* Floating Pills Toolbar */}
      {!isPreview && (
        <FloatingPills
          pageCount={project.pages.length}
          activePageNumber={project.pi + 1}
          currentTool={tool}
          selectionMode={selectionMode}
          zoomLevel={viewport.z}
          isPropertiesOpen={isPropertiesOpen}
          canUndo={historyRef.current.length > 0}
          canRedo={futureRef.current.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onFitArtboards={() => fitArtboards()}
          onOpenPages={() => setIsPagesOpen(true)}
          onSelectTool={(newTool) => {
            if (newTool !== 'eyedropper') setEyedropperTarget(null);
            setTool(newTool);
          }}
          onToggleSelectionMode={() => {
            setSelectionMode((prev) => {
              const next = prev === 'single' ? 'multi' : 'single';
              if (next === 'multi') setTool('select');
              showToast(
                next === 'multi'
                  ? 'Multi / Lasso Mode: drag anywhere to select multiple'
                  : 'Single Select Mode'
              );
              return next;
            });
          }}
          onOpenLayers={() => {
            setSheetTab('Outline');
            setIsPropertiesOpen(true);
          }}
          onOpenToolsMenu={() => setIsToolsOpen(true)}
          onOpenTemplates={() => setIsTemplatesOpen(true)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          onTogglePlay={() => setIsPreview(true)}
          onToggleProperties={() => setIsPropertiesOpen((prev) => !prev)}
          onOpenZoomMenu={() => setIsZoomOpen(true)}
        />
      )}

      {/* Interactive Infinite Canvas */}
      <Canvas
        elements={currentPage.items}
        selectedId={selectedId}
        selectedIds={selectedIds}
        tool={tool}
        selectionMode={selectionMode}
        smartSnap={smartSnap}
        viewport={viewport}
        layoutGuides={layoutGuides}
        snapGrid={snapGrid}
        isPreview={isPreview}
        onSelect={(id) => {
          setSelectedId(id);
          setSelectedIds(id ? [id] : []);
          if (id === null && tool !== 'hand' && tool !== 'eyedropper' && tool !== 'pencil' && tool !== 'pen') {
            setTool('select');
          }
        }}
        onSelectMultiple={(ids) => {
          setSelectedIds(ids);
          setSelectedId(ids.length > 0 ? ids[0] : null);
        }}
        onSetSelectionMode={(mode) => {
          setSelectionMode(mode);
          if (mode === 'multi') setTool('select');
        }}
        onUpdateElement={updateElement}
        onBatchUpdateElements={batchUpdateElements}
        onCreateElement={(elem) => {
          createElement(elem);
          if (elem.t !== 'path') {
            setTool('select');
          }
        }}
        onDiscardElement={discardElement}
        onUpdateViewport={setViewport}
        onFitElement={(elem) => fitArtboards(elem)}
        onEditText={(elem) => {
          const isArtboard = elem.t === 'artboard';
          const currentText = isArtboard ? (elem as any).n : (elem as any).text || '';
          setPromptState({
            isOpen: true,
            title: isArtboard ? 'Artboard Name' : 'Edit Text',
            value: currentText,
            onSubmit: (val) => {
              pushSnapshot();
              if (isArtboard) {
                updateElement(elem.id, { n: val } as any);
              } else {
                updateElement(elem.id, { text: val } as any);
              }
            },
          });
        }}
        onSnapshot={pushSnapshot}
        onPickColor={handlePickColor}
        eyedropperTarget={eyedropperTarget}
        onCancelEyedropper={() => {
          setEyedropperTarget(null);
          setTool('select');
        }}
        onSwitchEyedropperTarget={(target) => setEyedropperTarget(target)}
        onDragStateChange={setIsCanvasDragging}
        isPropertiesOpen={isPropertiesOpen}
        onSmartAlignAction={(action) => {
          if (action === 'center-h') handleAlign('center');
          else if (action === 'center-v') handleAlign('middle');
          else if (action === 'space-h') handleDistribute('horizontal');
          else if (action === 'space-v') handleDistribute('vertical');
        }}
        onAutoSnapGroupToArtboard={handleAutoSnapGroupToArtboard}
      />

      {/* Floating Context Toolbar over selected element (auto-hides during active drag for unobstructed Smart Align HUD) */}
      {!isPreview && !isCanvasDragging && selectedElement && (
        <ContextToolbar
          element={selectedElement}
          selectedElements={currentPage.items.filter((i) => selectedIds.includes(i.id))}
          isGroup={!!selectedElement.groupId}
          onGroup={handleGroupSelected}
          onUngroup={handleUngroupSelected}
          onAlign={handleAlign}
          onDistribute={handleDistribute}
          onStartEyedropper={handleStartEyedropper}
          canPasteStyle={canPasteStyle}
          onCopyStyle={handleCopyStyle}
          onPasteStyle={handlePasteStyle}
          onRandomizePalette={handleRandomizePalette}
          smartPalette={project.smartPalette || []}
          nearestArtboardName={nearestArtboardInfo.nearestArtboardName}
          isNearArtboardEdge={nearestArtboardInfo.isNearArtboardEdge}
          autoSnappedArtboard={autoSnappedArtboard}
          onSnapToNearestArtboard={handleSnapSelectionToNearestArtboard}
          onSnapshot={pushSnapshot}
          isPropertiesOpen={isPropertiesOpen}
          viewport={viewport}
          onUpdateElement={updateElement}
          onUpdateElements={updateElementsBulk}
          onDuplicate={duplicateElement}
          onBringToFront={bringToFront}
          onSendToBack={sendToBack}
          onBringForward={bringForward}
          onSendBackward={sendBackward}
          onSelectArtboardChildren={handleSelectArtboardChildren}
          onDelete={deleteElement}
          onEditText={(elem) => {
            const isArtboard = elem.t === 'artboard';
            const currentText = isArtboard ? (elem as any).n : (elem as any).text || '';
            setPromptState({
              isOpen: true,
              title: isArtboard ? 'Artboard Name' : 'Edit Text',
              value: currentText,
              onSubmit: (val) => {
                pushSnapshot();
                if (isArtboard) {
                  updateElement(elem.id, { n: val } as any);
                } else {
                  updateElement(elem.id, { text: val } as any);
                }
              },
            });
          }}
          onUploadImage={() => {
            replaceTargetIdRef.current = selectedElement.id;
            fileInputRef.current?.click();
          }}
        />
      )}

      {/* Bottom Sheet Panel (Properties, Layers Outline, Code, Tweaks) */}
      {!isPreview && (
        <BottomSheet
          isOpen={isPropertiesOpen}
          onClose={() => setIsPropertiesOpen(false)}
          selectedElement={selectedElement}
          selectedElements={currentPage.items.filter((i) => selectedIds.includes(i.id))}
          onAutoLayout={handleAutoLayout}
          onSnapshot={pushSnapshot}
          currentPage={currentPage}
          project={project}
          pageIndex={currentPageIndex}
          layoutGuides={layoutGuides}
          snapGrid={snapGrid}
          smartSnap={smartSnap}
          hapticsEnabled={hapticsEnabled}
          onToggleHaptics={() => {
            setHapticsEnabled((prev) => {
              const next = !prev;
              persistHapticsEnabled(next);
              showToast(next ? 'Haptic vibration enabled' : 'Haptic vibration disabled');
              return next;
            });
          }}
          versionCount={versionHistory.length}
          onOpenVersionHistory={() => setIsVersionHistoryOpen(true)}
          selectionMode={selectionMode}
          activeTabOverride={sheetTab}
          onTabChange={setSheetTab}
          onChangeSelectionMode={(mode) => {
            setSelectionMode(mode);
            if (mode === 'multi') setTool('select');
          }}
          onToggleLayoutGuides={() => setLayoutGuides((prev) => !prev)}
          onToggleSnapGrid={() => setSnapGrid((prev) => !prev)}
          onToggleSmartSnap={() => setSmartSnap((prev) => !prev)}
          onFitArtboards={() => fitArtboards()}
          onSelectElement={(id) => {
            setSelectedId(id);
            setSelectedIds(id ? [id] : []);
          }}
          onToggleSelectId={handleToggleSelectId}
          onSelectMultiple={(ids) => {
            setSelectedIds(ids);
            setSelectedId(ids.length > 0 ? ids[0] : null);
          }}
          onReorderLayers={handleReorderLayers}
          onMoveLayerStep={(id, dir) => {
            if (dir === 'forward') bringForward(id);
            else sendBackward(id);
          }}
          onUpdateElement={updateElement}
          onUpdateElements={updateElementsBulk}
          onDeleteElement={deleteElement}
          smartPalette={project.smartPalette || []}
          onExtractImagePalette={handleExtractImagePalette}
          onClearSmartPalette={handleClearSmartPalette}
          onRandomizePalette={handleRandomizePalette}
        />
      )}

      {/* Export Copy Modal (matching screenshot 81db24d0.jpg) */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        project={project}
        pageIndex={currentPageIndex}
        selectedArtboardId={
          selectedElement?.t === 'artboard' ? selectedElement.id : undefined
        }
      />

      {/* Pages Dropdown Modal (matching screenshot 4f60c477.jpg) */}
      <PagesModal
        isOpen={isPagesOpen}
        onClose={() => setIsPagesOpen(false)}
        pages={project.pages}
        currentPageIndex={currentPageIndex}
        onSelectPage={(index) => {
          setProject((prev) => {
            const updated = { ...prev, pi: index };
            saveToStorage(updated);
            return updated;
          });
          setSelectedId(null);
          setSelectedIds([]);
          setTimeout(() => fitArtboards(), 40);
        }}
        onAddPage={() => {
          pushSnapshot();
          const newPageNum = project.pages.length + 1;
          const newArtboard: CanvasElement = {
            id: Date.now(),
            t: 'artboard',
            n: `Artboard ${newPageNum}`,
            x: 40,
            y: 40,
            w: 375,
            h: 720,
            fill: '#ffffff',
            sh: true,
            op: 1,
            rot: 0,
          };
          const newPage: Page = {
            id: `page_${Date.now()}`,
            n: `Page ${newPageNum}`,
            items: [newArtboard],
            cm: [],
          };
          setProject((prev) => {
            const updated = {
              ...prev,
              pages: [...prev.pages, newPage],
              pi: prev.pages.length,
            };
            saveToStorage(updated);
            return updated;
          });
          setSelectedId(null);
          setSelectedIds([]);
          showToast(`Page ${newPageNum} created`);
          setTimeout(() => fitArtboards(), 50);
        }}
        onRenamePage={(index, newName) => {
          pushSnapshot();
          setProject((prev) => {
            const pages = [...prev.pages];
            pages[index] = { ...pages[index], n: newName };
            const updated = { ...prev, pages };
            saveToStorage(updated);
            return updated;
          });
          showToast('Page renamed');
        }}
        onDeletePage={(index) => {
          if (project.pages.length <= 1) {
            showToast('Keep at least one page');
            return;
          }
          pushSnapshot();
          setProject((prev) => {
            const pages = prev.pages.filter((_, i) => i !== index);
            const updated = {
              ...prev,
              pages,
              pi: 0,
            };
            saveToStorage(updated);
            return updated;
          });
          setSelectedId(null);
          setSelectedIds([]);
          showToast('Page deleted');
          setTimeout(() => fitArtboards(), 40);
        }}
      />

      {/* Tools Picker Sheet (matching screenshot 37c6caed.jpg) */}
      <ToolsSheet
        isOpen={isToolsOpen}
        onClose={() => setIsToolsOpen(false)}
        onSelectTool={(selectedTool) => {
          setTool(selectedTool);
          showToast(`Tool: ${selectedTool}`);
        }}
        onUploadImage={() => {
          replaceTargetIdRef.current = null;
          fileInputRef.current?.click();
        }}
        onAddPresetArtboard={handleAddDevicePreset}
        onAddTemplateComponent={handleAddTemplateComponent}
        onAddQrCode={handleAddQrCode}
        onRandomizePalette={handleRandomizePalette}
        selectedCount={selectedIds.length > 0 ? selectedIds.length : selectedId ? 1 : 0}
        projectName={project.name}
        smartPalette={project.smartPalette || []}
      />

      {/* Zoom and Grid Menu (matching screenshot ca0d4291.jpg) */}
      <ZoomSheet
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        currentZoom={viewport.z}
        layoutGuides={layoutGuides}
        canUndo={historyRef.current.length > 0}
        canRedo={futureRef.current.length > 0}
        onZoomIn={() => setViewport((prev) => ({ ...prev, z: Math.min(4, prev.z * 1.25) }))}
        onZoomOut={() => setViewport((prev) => ({ ...prev, z: Math.max(0.1, prev.z / 1.25) }))}
        onSetZoom={(zoom) => setViewport((prev) => ({ ...prev, z: zoom }))}
        onFitArtboards={() => fitArtboards()}
        onZoomToSelection={() => {
          if (selectedElement) fitArtboards(selectedElement);
          else fitArtboards();
        }}
        onToggleLayoutGuides={() => setLayoutGuides((prev) => !prev)}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Comments Modal (matching screenshot 145fd208.jpg) */}
      <CommentsModal
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        comments={currentPage.cm}
        onAddComment={(commentText) => {
          pushSnapshot();
          setProject((prev) => {
            const pages = [...prev.pages];
            const page = { ...pages[prev.pi] };
            page.cm = [
              ...page.cm,
              {
                id: `c_${Date.now()}`,
                author: 'You',
                text: commentText,
                time: 'Just now',
              },
            ];
            pages[prev.pi] = page;
            const updated = { ...prev, pages };
            saveToStorage(updated);
            return updated;
          });
          showToast('Comment added');
        }}
      />

      {/* Full Screen Clean Preview Overlay */}
      {isPreview && (
        <PreviewOverlay page={currentPage} onExit={() => setIsPreview(false)} />
      )}

      {/* Prompt Modal for Editing Text and Layers */}
      <PromptModal
        isOpen={promptState.isOpen}
        title={promptState.title}
        initialValue={promptState.value}
        onClose={() => setPromptState((prev) => ({ ...prev, isOpen: false }))}
        onSubmit={promptState.onSubmit}
      />

      {/* Templates Library Modal (50+ Editable Designs) */}
      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={handleInsertTemplate}
      />

      {/* Keyboard Shortcuts and Gestures Guide Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Hourly Version History Modal */}
      <VersionHistoryModal
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        snapshots={versionHistory}
        currentProject={project}
        onSaveCheckpoint={(label) => {
          const updated = recordManualSnapshot(projectRef.current, label);
          setVersionHistory(updated);
          hapticSuccess();
          showToast('Saved version checkpoint');
        }}
        onRestoreVersion={(snapshot) => {
          const withBackup = recordPreRestoreSnapshot(projectRef.current);
          setVersionHistory(withBackup);
          pushSnapshot();
          const restored = JSON.parse(JSON.stringify(snapshot.data)) as ProjectState;
          setProject(restored);
          saveToStorage(restored);
          setSelectedId(null);
          setSelectedIds([]);
          setIsVersionHistoryOpen(false);
          hapticSuccess();
          showToast(`Restored "${snapshot.label}"`);
          setTimeout(() => fitArtboards(), 50);
        }}
        onDeleteSnapshot={(id) => {
          const updated = deleteVersionSnapshot(id);
          setVersionHistory(updated);
        }}
        onClearHistory={() => {
          const updated = clearAllVersionSnapshots();
          setVersionHistory(updated);
          showToast('Version history cleared');
        }}
      />

      {/* Toast message popup */}
      {toastMsg && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 dark:bg-white/95 text-white dark:text-gray-900 px-4 py-2 rounded-full text-xs font-semibold shadow-xl backdrop-blur-xs animate-in fade-in zoom-in-95 duration-100 pointer-events-none">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
