import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Upload,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  FilePlus,
  Sparkles,
  Sun,
  Moon,
  History,
  Keyboard,
} from 'lucide-react';

interface HeaderProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  commentCount: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenComments: () => void;
  onOpenExport: () => void;
  onOpenVersionHistory: () => void;
  onOpenShortcuts?: () => void;
  onDuplicatePage: () => void;
  onClearPage: () => void;
  onNewProject: () => void;
  onResetToDemo: () => void;
  onCloseApp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onTitleChange,
  commentCount,
  isDarkMode,
  onToggleDarkMode,
  onOpenComments,
  onOpenExport,
  onOpenVersionHistory,
  onOpenShortcuts,
  onDuplicatePage,
  onClearPage,
  onNewProject,
  onResetToDemo,
  onCloseApp,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(title);
  const [showMenu, setShowMenu] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitleValue(title);
  }, [title]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    const handleOutsideClick = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('pointerdown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [showMenu]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleValue.trim()) {
      onTitleChange(titleValue.trim());
    } else {
      setTitleValue(title);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-white/95 dark:bg-[#1f1f23]/95 backdrop-blur-md px-2.5 sm:px-4 border-b border-gray-200/80 dark:border-gray-800/80 flex items-center justify-between gap-2 select-none shadow-xs transition-colors">
      {/* Left: Permanent Application Logo */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onCloseApp}
          className="w-11 h-9 rounded-xl bg-white border border-gray-200/90 dark:border-gray-700/80 shadow-xs flex items-center justify-center overflow-hidden hover:scale-[1.03] active:scale-95 transition-all shrink-0"
          title="Gamura Studio · Center Canvas"
          aria-label="Gamura Studio Home — Center Canvas"
        >
          <img
            src="/assets/aistudio/1795456868131_0736331e.png"
            alt="Gamura Studio Logo"
            draggable={false}
            className="w-full h-full object-contain pointer-events-none select-none"
            style={{ transform: 'translate(1px, 5.5px) scale(1.75)' }}
          />
        </button>
      </div>

      {/* Center: Title */}
      <div className="flex-1 max-w-md min-w-0 flex justify-center items-center">
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSubmit();
              if (e.key === 'Escape') {
                setTitleValue(title);
                setIsEditingTitle(false);
              }
            }}
            className="w-full text-center font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 rounded-xl px-2.5 py-1.5 outline-hidden ring-2 ring-blue-500"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingTitle(true)}
            className="group flex items-center justify-center gap-1.5 font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 px-2.5 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors truncate max-w-full"
            title="Click to rename"
          >
            <span className="truncate tracking-tight">{title}</span>
            <Edit2
              size={13}
              className="opacity-40 sm:opacity-0 sm:group-hover:opacity-60 text-gray-500 transition-opacity shrink-0"
            />
          </button>
        )}
      </div>

      {/* Right actions: Comments, Theme, Export, Menu */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 relative" ref={menuRef}>
        <button
          type="button"
          onClick={onOpenComments}
          className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all"
          title="Comments"
          aria-label="Comments"
        >
          <MessageSquare size={19} strokeWidth={2} />
          {commentCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
          )}
        </button>

        {/* Dark/Light mode toggle */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
        </button>

        <button
          type="button"
          onClick={onOpenExport}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all"
          title="Export / Share"
          aria-label="Export"
        >
          <Upload size={19} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => setShowMenu((prev) => !prev)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all ${
            showMenu ? 'bg-gray-100 dark:bg-gray-800 text-blue-600' : ''
          }`}
          title="More options"
          aria-label="More options"
        >
          <MoreVertical size={19} strokeWidth={2} />
        </button>

        {/* Overflow Menu */}
        {showMenu && (
          <div className="absolute right-0 top-12 w-56 bg-white dark:bg-[#252529] rounded-2xl shadow-xl border border-gray-200/90 dark:border-gray-700/80 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            <button
              onClick={() => {
                setShowMenu(false);
                setIsEditingTitle(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-left"
            >
              <Edit2 size={16} className="text-gray-500" />
              <span>Rename project</span>
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                onOpenVersionHistory();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-left"
            >
              <History size={16} className="text-blue-500" />
              <span>Version history</span>
            </button>
            {onOpenShortcuts && (
              <button
                onClick={() => {
                  setShowMenu(false);
                  onOpenShortcuts();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-left"
              >
                <Keyboard size={16} className="text-gray-500" />
                <span>Keyboard shortcuts</span>
              </button>
            )}
            <button
              onClick={() => {
                setShowMenu(false);
                onDuplicatePage();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-left"
            >
              <Copy size={16} className="text-gray-500" />
              <span>Duplicate page</span>
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                onResetToDemo();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-left"
            >
              <Sparkles size={16} className="text-amber-500" />
              <span>Load demo design</span>
            </button>
            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
            <button
              onClick={() => {
                setShowMenu(false);
                onClearPage();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors text-left"
            >
              <Trash2 size={16} />
              <span>Clear page</span>
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                onNewProject();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors text-left"
            >
              <FilePlus size={16} />
              <span>New project</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
