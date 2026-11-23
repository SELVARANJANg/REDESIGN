import React from 'react';
import {
  Files,
  MousePointer2,
  Plus,
  Play,
  Sliders,
  ChevronDown,
  Hand,
  Type,
  Square,
  Circle,
  StickyNote,
  PenTool,
  Pencil,
  ArrowUpRight,
  Minus,
  ImageIcon,
  Layout,
  Sparkles,
  Keyboard,
  Pipette,
  Undo2,
  Redo2,
  Maximize2,
  Layers,
  LassoSelect,
} from 'lucide-react';
import { SelectionMode, ToolType } from '../types';

interface FloatingPillsProps {
  pageCount: number;
  activePageNumber: number;
  currentTool: ToolType;
  selectionMode?: SelectionMode;
  zoomLevel: number;
  isPropertiesOpen: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onFitArtboards?: () => void;
  onOpenPages: () => void;
  onSelectTool: (tool: ToolType) => void;
  onToggleSelectionMode?: () => void;
  onOpenLayers?: () => void;
  onOpenToolsMenu: () => void;
  onOpenTemplates: () => void;
  onOpenShortcuts: () => void;
  onTogglePlay: () => void;
  onToggleProperties: () => void;
  onOpenZoomMenu: () => void;
}

export const FloatingPills: React.FC<FloatingPillsProps> = ({
  pageCount,
  currentTool,
  selectionMode = 'single',
  zoomLevel,
  isPropertiesOpen,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onFitArtboards,
  onOpenPages,
  onSelectTool,
  onToggleSelectionMode,
  onOpenLayers,
  onOpenToolsMenu,
  onOpenTemplates,
  onOpenShortcuts,
  onTogglePlay,
  onToggleProperties,
  onOpenZoomMenu,
}) => {
  const renderToolIcon = () => {
    switch (currentTool) {
      case 'hand': return <Hand size={17} />;
      case 'text': return <Type size={17} />;
      case 'artboard': return <Layout size={17} />;
      case 'note': return <StickyNote size={17} />;
      case 'pencil': return <Pencil size={17} />;
      case 'pen': return <PenTool size={17} />;
      case 'rect': return <Square size={17} />;
      case 'oval': return <Circle size={17} />;
      case 'arrow': return <ArrowUpRight size={17} />;
      case 'line': return <Minus size={17} />;
      case 'image': return <ImageIcon size={17} />;
      case 'eyedropper': return <Pipette size={17} />;
      default: return <Plus size={17} />;
    }
  };

  return (
    <>
      {/* Single-Row Responsive Top Floating Toolbars (collision-free even on 360px phones) */}
      <div className="fixed top-[62px] sm:top-[66px] left-1.5 right-1.5 sm:left-3 sm:right-3 z-20 flex items-center justify-between gap-1 pointer-events-none select-none">
        {/* Left Pill Toolbar */}
        <div className="pointer-events-auto flex items-center bg-white/95 dark:bg-[#222226]/95 backdrop-blur-md rounded-2xl shadow-md border border-gray-200/90 dark:border-gray-700/80 p-1 gap-0.5 sm:gap-1 min-w-0">
          {/* Pages button */}
          <button
            onClick={onOpenPages}
            className="flex items-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-2.5 py-1.5 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs sm:text-sm font-medium transition-colors shrink-0"
            title="Pages list"
          >
            <Files size={15} className="text-gray-600 dark:text-gray-300" />
            <span className="text-[11px] sm:text-xs text-gray-500 font-semibold">{pageCount}</span>
            <ChevronDown size={12} className="text-gray-400" />
          </button>

          <div className="hidden sm:block w-[1px] h-5 bg-gray-200 dark:bg-gray-700 mx-0.5 shrink-0" />

          {/* Select Cursor */}
          <button
            onClick={() => onSelectTool('select')}
            className={`p-1.5 sm:p-2 rounded-xl transition-all shrink-0 ${
              currentTool === 'select'
                ? 'bg-[#dbe8fb] dark:bg-[#1e3458] text-[#1f6fe0] dark:text-[#6ba7ff] shadow-xs'
                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="Selection tool (V)"
            aria-label="Select Tool"
          >
            <MousePointer2 size={16} strokeWidth={2.2} />
          </button>

          {/* Add Tools button */}
          <button
            onClick={onOpenToolsMenu}
            className={`flex items-center gap-0.5 px-1.5 sm:px-2 py-1.5 rounded-xl transition-all shrink-0 ${
              currentTool !== 'select'
                ? 'bg-[#dbe8fb] dark:bg-[#1e3458] text-[#1f6fe0] dark:text-[#6ba7ff] font-semibold'
                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="Add element / Select tool"
            aria-label="Add Element"
          >
            {renderToolIcon()}
            <ChevronDown size={12} className="text-gray-400" />
          </button>

          {/* 50+ Templates Button */}
          <button
            onClick={onOpenTemplates}
            className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 sm:px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold hover:opacity-95 shadow-xs transition-all active:scale-95 shrink-0"
            title="Browse 50+ Templates (Cards, Resumes, UI, Invites)"
          >
            <Sparkles size={13} />
            <span className="hidden sm:inline">Templates</span>
            <span className="text-[10px] bg-white/25 px-1 py-0.5 rounded-md leading-none">50+</span>
          </button>
        </div>

        {/* Right Pill Toolbar */}
        <div className="pointer-events-auto flex items-center bg-white/95 dark:bg-[#222226]/95 backdrop-blur-md rounded-2xl shadow-md border border-gray-200/90 dark:border-gray-700/80 p-1 gap-0.5 sm:gap-1 shrink-0">
          {/* Shortcuts Button (Desktop/Tablet) */}
          <button
            onClick={onOpenShortcuts}
            className="hidden md:flex p-1.5 sm:p-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Keyboard shortcuts & gestures (?)"
            aria-label="Keyboard Shortcuts"
          >
            <Keyboard size={16} strokeWidth={2} />
          </button>

          {/* Play / Preview */}
          <button
            onClick={onTogglePlay}
            className="p-1.5 sm:p-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
            title="Preview Design"
            aria-label="Play Preview"
          >
            <Play size={16} strokeWidth={2} />
          </button>

          {/* Properties / Sliders */}
          <button
            onClick={onToggleProperties}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors active:scale-95 ${
              isPropertiesOpen
                ? 'bg-[#dbe8fb] dark:bg-[#1e3458] text-[#1f6fe0] dark:text-[#6ba7ff]'
                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="Inspect, Layers & Tweaks"
            aria-label="Properties"
          >
            <Sliders size={16} strokeWidth={2} />
          </button>

          {/* Zoom */}
          <button
            onClick={onOpenZoomMenu}
            className="flex items-center gap-0.5 px-1.5 sm:px-2 py-1.5 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-[11px] sm:text-xs font-semibold transition-colors"
            title="Zoom & View settings"
          >
            <span>{Math.round(zoomLevel * 100)}%</span>
            <ChevronDown size={12} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Bottom Quick Dock (cleanly hidden while BottomSheet is open so nothing overlaps) */}
      {!isPropertiesOpen && (
        <div
          className="fixed left-2 sm:left-3 z-30 flex items-center gap-0.5 sm:gap-1 bg-white/95 dark:bg-[#252529]/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/90 dark:border-gray-700/80 p-1 select-none max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-1.5rem)] overflow-x-auto no-scrollbar"
          style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
        >
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-35 transition-colors active:scale-95 shrink-0"
              title="Undo (⌘Z)"
            >
              <Undo2 size={16} />
            </button>
          )}
          {onRedo && (
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-35 transition-colors active:scale-95 shrink-0"
              title="Redo (⌘⇧Z)"
            >
              <Redo2 size={16} />
            </button>
          )}
          <div className="w-[1px] h-4 bg-gray-200 dark:bg-gray-700 mx-0.5 shrink-0" />
          {onToggleSelectionMode && (
            <button
              onClick={onToggleSelectionMode}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-semibold transition-colors active:scale-95 shrink-0 ${
                selectionMode === 'multi'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title={
                selectionMode === 'multi'
                  ? 'Multi / Lasso Selection Active (Tap to return to Single Select)'
                  : 'Switch to Multi / Lasso Selection Mode'
              }
            >
              <LassoSelect size={15} />
              <span className="hidden sm:inline">
                {selectionMode === 'multi' ? 'Lasso On' : 'Lasso'}
              </span>
            </button>
          )}
          <button
            onClick={() => onSelectTool(currentTool === 'hand' ? 'select' : 'hand')}
            className={`p-2 rounded-xl transition-colors active:scale-95 shrink-0 ${
              currentTool === 'hand'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title={currentTool === 'hand' ? 'Switch to Select (V)' : 'Hand Pan Tool (H)'}
          >
            <Hand size={16} />
          </button>
          {onOpenLayers && (
            <button
              onClick={onOpenLayers}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95 shrink-0"
              title="Open Interactive Layers Panel"
            >
              <Layers size={15} />
              <span className="hidden sm:inline">Layers</span>
            </button>
          )}
          {onFitArtboards && (
            <button
              onClick={onFitArtboards}
              className="p-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95 shrink-0"
              title="Fit All Artboards (⌘0)"
            >
              <Maximize2 size={15} />
            </button>
          )}
        </div>
      )}
    </>
  );
};
