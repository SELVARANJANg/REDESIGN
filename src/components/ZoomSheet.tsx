import React from 'react';
import { Check, ZoomIn, ZoomOut, Maximize2, RotateCcw, RotateCw } from 'lucide-react';

interface ZoomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentZoom: number;
  layoutGuides: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetZoom: (zoom: number) => void;
  onFitArtboards: () => void;
  onZoomToSelection: () => void;
  onToggleLayoutGuides: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export const ZoomSheet: React.FC<ZoomSheetProps> = ({
  isOpen,
  onClose,
  currentZoom,
  layoutGuides,
  canUndo,
  canRedo,
  onZoomIn,
  onZoomOut,
  onSetZoom,
  onFitArtboards,
  onZoomToSelection,
  onToggleLayoutGuides,
  onUndo,
  onRedo,
}) => {
  if (!isOpen) return null;

  const currentPercent = Math.round(currentZoom * 100);
  const zoomPresets = [25, 50, 75, 100, 150, 200];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-[#222226] rounded-t-3xl shadow-2xl p-6 z-10 select-none animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto touch-pan-y">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4" />

        <div className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
          {/* Zoom in / out / fit actions */}
          <div className="pb-2 space-y-1">
            <button
              onClick={() => {
                onZoomIn();
                onClose();
              }}
              className="w-full flex items-center justify-between py-3 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl transition-colors text-left font-medium text-gray-900 dark:text-gray-100"
            >
              <span>Zoom in</span>
              <ZoomIn size={18} className="text-gray-400" />
            </button>
            <button
              onClick={() => {
                onZoomOut();
                onClose();
              }}
              className="w-full flex items-center justify-between py-3 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl transition-colors text-left font-medium text-gray-900 dark:text-gray-100"
            >
              <span>Zoom out</span>
              <ZoomOut size={18} className="text-gray-400" />
            </button>
            <button
              onClick={() => {
                onFitArtboards();
                onClose();
              }}
              className="w-full flex items-center justify-between py-3 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl transition-colors text-left font-medium text-gray-900 dark:text-gray-100"
            >
              <span>Fit artboards</span>
              <Maximize2 size={18} className="text-gray-400" />
            </button>
            <button
              onClick={() => {
                onZoomToSelection();
                onClose();
              }}
              className="w-full flex items-center justify-between py-3 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl transition-colors text-left font-medium text-gray-400"
            >
              <span>Zoom to selection</span>
            </button>
          </div>

          {/* Percent presets */}
          <div className="py-2 space-y-1">
            {zoomPresets.map((pct) => (
              <button
                key={pct}
                onClick={() => {
                  onSetZoom(pct / 100);
                  onClose();
                }}
                className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl transition-colors text-left text-gray-800 dark:text-gray-200"
              >
                <span>{pct}%</span>
                {currentPercent === pct && (
                  <Check size={18} className="text-blue-600 stroke-[2.5]" />
                )}
              </button>
            ))}
          </div>

          {/* Layout guides */}
          <div className="py-2">
            <button
              onClick={() => {
                onToggleLayoutGuides();
                onClose();
              }}
              className="w-full flex items-center justify-between py-3 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl transition-colors text-left font-medium text-gray-900 dark:text-gray-100"
            >
              <span>Layout guides</span>
              {layoutGuides && <Check size={18} className="text-blue-600 stroke-[2.5]" />}
            </button>
          </div>

          {/* Undo / Redo */}
          <div className="pt-2 space-y-1">
            <button
              disabled={!canUndo}
              onClick={() => {
                onUndo();
                onClose();
              }}
              className="w-full flex items-center justify-between py-3 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl transition-colors text-left font-medium text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Undo</span>
              <RotateCcw size={16} className="text-gray-400" />
            </button>
            <button
              disabled={!canRedo}
              onClick={() => {
                onRedo();
                onClose();
              }}
              className="w-full flex items-center justify-between py-3 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl transition-colors text-left font-medium text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Redo</span>
              <RotateCw size={16} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
