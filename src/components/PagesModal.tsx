import React, { useState, useRef, useEffect } from 'react';
import { Check, MoreHorizontal, Plus, Copy, Edit2, Trash2 } from 'lucide-react';
import { Page } from '../types';

interface PagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: Page[];
  currentPageIndex: number;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onRenamePage: (index: number, newName: string) => void;
  onDeletePage: (index: number) => void;
}

export const PagesModal: React.FC<PagesModalProps> = ({
  isOpen,
  onClose,
  pages,
  currentPageIndex,
  onSelectPage,
  onAddPage,
  onRenamePage,
  onDeletePage,
}) => {
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuIndex(null);
      }
    };
    if (activeMenuIndex !== null) {
      document.addEventListener('pointerdown', handleOutside);
    }
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [activeMenuIndex]);

  if (!isOpen) return null;

  const handleStartRename = (index: number, currentName: string) => {
    setActiveMenuIndex(null);
    setEditingIndex(index);
    setEditingName(currentName);
  };

  const handleFinishRename = (index: number) => {
    if (editingName.trim()) {
      onRenamePage(index, editingName.trim());
    }
    setEditingIndex(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-start sm:items-start p-3 sm:p-0">
      <div className="fixed inset-0" onClick={onClose} />

      {/* Pages Dropdown */}
      <div className="relative mt-20 sm:ml-4 w-72 max-h-[75vh] overflow-y-auto touch-pan-y bg-white dark:bg-[#252529] rounded-2xl shadow-2xl border border-gray-200/90 dark:border-gray-700/80 p-2 z-10 select-none animate-in fade-in zoom-in-95 duration-100">
        <div className="space-y-1">
          {pages.map((page, index) => {
            const isSelected = index === currentPageIndex;

            return (
              <div
                key={page.id}
                className={`relative group flex items-center justify-between min-h-[44px] px-3 py-2 rounded-xl transition-colors ${
                  isSelected
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'
                }`}
              >
                {editingIndex === index ? (
                  <input
                    type="text"
                    value={editingName}
                    autoFocus
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleFinishRename(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishRename(index);
                      if (e.key === 'Escape') setEditingIndex(null);
                    }}
                    className="flex-1 text-sm bg-white dark:bg-gray-700 px-2 py-1 rounded-md outline-hidden ring-1 ring-blue-500 font-normal"
                  />
                ) : (
                  <div
                    onClick={() => {
                      onSelectPage(index);
                      onClose();
                    }}
                    className="flex-1 cursor-pointer truncate text-sm py-1"
                  >
                    {page.n}
                  </div>
                )}

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {isSelected && (
                    <Check size={16} className="text-blue-600 stroke-[2.5]" />
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuIndex(activeMenuIndex === index ? null : index);
                    }}
                    className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors"
                    aria-label="Page options"
                  >
                    <MoreHorizontal size={15} />
                  </button>
                </div>

                {/* Submenu */}
                {activeMenuIndex === index && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-11 w-48 bg-white dark:bg-[#2a2a2e] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-1 z-30 animate-in fade-in zoom-in-95 duration-100 text-xs"
                  >
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(window.location.href);
                        } catch {
                          // fallback ignored gracefully
                        }
                        setCopiedIndex(index);
                        setTimeout(() => {
                          setCopiedIndex(null);
                          setActiveMenuIndex(null);
                        }, 650);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors"
                    >
                      {copiedIndex === index ? (
                        <Check size={14} className="text-green-500" />
                      ) : (
                        <Copy size={14} className="text-gray-400" />
                      )}
                      <span>{copiedIndex === index ? 'Copied!' : 'Copy link to page'}</span>
                    </button>
                    <button
                      onClick={() => handleStartRename(index, page.n)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-left transition-colors"
                    >
                      <Edit2 size={14} className="text-gray-400" />
                      <span>Rename</span>
                    </button>
                    {pages.length > 1 && (
                      <button
                        onClick={() => {
                          setActiveMenuIndex(null);
                          onDeletePage(index);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-left transition-colors"
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="my-1.5 border-t border-gray-100 dark:border-gray-800" />

        {/* New page button */}
        <button
          onClick={() => {
            onAddPage();
            onClose();
          }}
          className="w-full flex items-center gap-2 min-h-[44px] px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-left"
        >
          <Plus size={16} className="text-gray-500" />
          <span>New page</span>
        </button>
      </div>
    </div>
  );
};
