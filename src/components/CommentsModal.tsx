import React, { useState } from 'react';
import { X, Plus, MessageSquare, Send } from 'lucide-react';
import { PageComment } from '../types';

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  comments: (string | PageComment)[];
  onAddComment: (commentText: string) => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  isOpen,
  onClose,
  comments,
  onAddComment,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newText.trim()) {
      onAddComment(newText.trim());
      setNewText('');
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-[#222226] rounded-t-3xl shadow-2xl p-6 z-10 select-none animate-in slide-in-from-bottom duration-200 min-h-[380px] max-h-[80vh] flex flex-col">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4" />

        {/* Header matching screenshot */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Comments</h2>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="p-1 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Add comment"
          >
            <Plus size={22} />
          </button>
        </div>

        {/* Input when adding */}
        {isAdding && (
          <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
            <input
              type="text"
              autoFocus
              placeholder="Write a comment..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              className="flex-1 bg-gray-100 dark:bg-gray-800 px-3.5 py-2 rounded-xl text-sm outline-hidden ring-1 ring-blue-500 text-gray-900 dark:text-gray-100"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-3.5 py-2 rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
            >
              <Send size={16} />
            </button>
          </form>
        )}

        {/* Body content */}
        <div className="flex-1 flex flex-col justify-center items-center py-8 overflow-y-auto touch-pan-y">
          {comments.length === 0 ? (
            /* Empty state exactly matching screenshot 8c9cd7f2.jpg */
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto text-gray-400 dark:text-gray-500">
                <svg
                  viewBox="0 0 64 64"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-full h-full"
                >
                  <path d="M48 28c0-11-9-20-20-20S8 17 8 28c0 5.2 2 9.9 5.3 13.4L11 52l12-3.6c1.6.4 3.3.6 5 .6 11 0 20-9 20-20z" />
                  <path d="M48 24a16 16 0 0 1 8 13.8c0 4.2-1.6 8-4.2 10.7L54 58l-9.6-2.9a16.8 16.8 0 0 1-4.4.9" />
                </svg>
              </div>
              <p className="text-base text-gray-700 dark:text-gray-300 font-normal">
                No comments yet
              </p>
            </div>
          ) : (
            <div className="w-full space-y-3 self-start">
              {comments.map((cm, idx) => {
                const isObj = typeof cm === 'object';
                const author = isObj ? cm.author : 'User';
                const time = isObj ? cm.time : 'Recently';
                const text = isObj ? cm.text : cm;

                return (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">
                        {author}
                      </span>
                      <span>{time}</span>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-100 leading-snug">
                      {text}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
