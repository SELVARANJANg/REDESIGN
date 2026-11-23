import React from 'react';
import { X, Command, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      category: 'Tools & Selection',
      items: [
        { key: 'V', desc: 'Selection Pointer Tool' },
        { key: 'H', desc: 'Hand (Pan Canvas) Tool' },
        { key: 'I', desc: 'Eyedropper Color Picker' },
        { key: 'T', desc: 'Text Layer Tool' },
        { key: 'R', desc: 'Rectangle Shape Tool' },
        { key: 'O', desc: 'Oval / Circle Tool' },
        { key: 'L', desc: 'Line Tool' },
        { key: 'A', desc: 'Artboard Tool' },
        { key: 'P', desc: 'Pen / Freehand Path' },
        { key: 'Drag Canvas', desc: 'Marquee Box Select Multiple Items' },
        { key: 'Esc', desc: 'Deselect / Cancel active tool' },
      ],
    },
    {
      category: 'Editing, Grouping & Alignment',
      items: [
        { key: '⌘ / Ctrl + G', desc: 'Group selected layers' },
        { key: '⌘ / Ctrl + ⇧ + G', desc: 'Ungroup layers' },
        { key: '⌘ / Ctrl + ] / [', desc: 'Move layer forward / backward 1 step' },
        { key: '⌘ / Ctrl + ⇧ + ] / [', desc: 'Bring to front / Send to back' },
        { key: '⌘ / Ctrl + C / V', desc: 'Copy & Paste elements' },
        { key: '⌘ / Ctrl + D', desc: 'Duplicate selected element(s)' },
        { key: '⌘ / Ctrl + A', desc: 'Select all elements on page' },
        { key: '⌘ / Ctrl + L', desc: 'Lock / Unlock selection' },
        { key: 'Arrow Keys', desc: 'Nudge 1px (Hold ⇧ for 10px)' },
        { key: 'Delete / ⌫', desc: 'Delete selected element(s)' },
        { key: '⇧ + Click', desc: 'Add/remove item from selection' },
        { key: 'Double Tap / Click', desc: 'Edit text / Rename artboard' },
      ],
    },
    {
      category: 'Canvas View & Zoom',
      items: [
        { key: 'Space + Drag', desc: 'Quick Pan Canvas' },
        { key: '+  /  =', desc: 'Zoom In' },
        { key: '-', desc: 'Zoom Out' },
        { key: '⌘ / Ctrl + 0', desc: 'Fit Artboards to View' },
        { key: 'Pinch with 2 fingers', desc: 'Touch Zoom & Pan' },
      ],
    },
    {
      category: 'History',
      items: [
        { key: '⌘ / Ctrl + Z', desc: 'Undo last change' },
        { key: '⌘ / Ctrl + ⇧ + Z', desc: 'Redo' },
        { key: '⌘ / Ctrl + Y', desc: 'Redo (alternative)' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-[#202026] rounded-3xl shadow-2xl border border-gray-200/90 dark:border-gray-700/80 p-6 z-10 select-none animate-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto touch-pan-y">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Keyboard size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                Keyboard Shortcuts
              </h3>
              <p className="text-xs text-gray-400">Fast navigation &amp; editing cheat sheet</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="mt-4 space-y-6">
          {shortcutGroups.map((group) => (
            <div key={group.category} className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-1">
                {group.category}
              </h4>
              <div className="space-y-1 bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-2 border border-gray-100 dark:border-gray-800">
                {group.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-1.5 px-2 text-xs"
                  >
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {item.desc}
                    </span>
                    <kbd className="px-2 py-1 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-[11px] font-mono text-gray-800 dark:text-gray-200 shadow-2xs font-semibold">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
