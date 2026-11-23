import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  initialValue: string;
  onClose: () => void;
  onSubmit: (value: string) => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({
  isOpen,
  title,
  initialValue,
  onClose,
  onSubmit,
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  if (!isOpen) return null;

  const isSingleLine = title === 'Artboard Name';

  const commitValue = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(isSingleLine ? trimmed : value);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    commitValue();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white dark:bg-[#252529] rounded-3xl shadow-2xl p-5 z-10 animate-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSingleLine ? (
            <input
              type="text"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose();
              }}
              placeholder="Enter artboard name..."
              className="w-full bg-gray-100 dark:bg-gray-800 px-3.5 py-2.5 rounded-2xl text-sm outline-hidden ring-1 ring-blue-500 text-gray-900 dark:text-gray-100 font-medium"
            />
          ) : (
            <div>
              <textarea
                autoFocus
                rows={4}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    commitValue();
                  } else if (e.key === 'Escape') {
                    onClose();
                  }
                }}
                placeholder="Type text..."
                className="w-full bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl text-sm outline-hidden ring-1 ring-blue-500 text-gray-900 dark:text-gray-100 resize-none font-medium"
              />
              <div className="text-[10px] text-gray-400 mt-1 text-right">
                ⌘/Ctrl + Enter to save
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className="min-h-[44px] px-5 py-2 bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all"
            >
              Done
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
