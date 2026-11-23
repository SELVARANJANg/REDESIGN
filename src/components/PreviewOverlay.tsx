import React from 'react';
import { X } from 'lucide-react';
import { Page } from '../types';
import { elementToSvg } from '../utils/export';
import { DEFS, isInside } from '../utils/helpers';

interface PreviewOverlayProps {
  page: Page;
  onExit: () => void;
}

export const PreviewOverlay: React.FC<PreviewOverlayProps> = ({ page, onExit }) => {
  const artboards = page.items.filter((i) => i.t === 'artboard' && !i.hidden);

  const [previewMsg, setPreviewMsg] = React.useState<string | null>(null);

  const handleLinkClick = (link: string) => {
    setPreviewMsg(`Link destination: ${link}`);
    setTimeout(() => setPreviewMsg(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#f4f4f6] dark:bg-[#121214] overflow-y-auto touch-pan-y p-4 md:p-12 flex flex-col items-center gap-8 select-none animate-in fade-in duration-200">
      {/* Toast message in preview */}
      {previewMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-xl backdrop-blur-xs animate-in fade-in">
          {previewMsg}
        </div>
      )}

      {/* Floating Exit preview button */}
      <button
        onClick={onExit}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white/95 dark:bg-[#252529]/95 backdrop-blur-md text-gray-800 dark:text-gray-100 px-4 py-2 rounded-2xl shadow-lg border border-gray-200/80 dark:border-gray-700/80 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95"
      >
        <X size={16} />
        <span>Exit preview</span>
      </button>

      {/* Render Artboards */}
      {artboards.length > 0 ? (
        artboards.map((artboard) => {
          const children = page.items.filter(
            (i) => !i.hidden && i.t !== 'artboard' && isInside(i, artboard)
          );
          const artRadius = 'r' in artboard && artboard.r ? Math.min(32, artboard.r) : 24;

          return (
            <div
              key={artboard.id}
              className="relative shadow-2xl overflow-hidden border border-gray-200/80 dark:border-gray-800/80 transition-transform duration-200 shrink-0"
              style={{
                width: `${artboard.w}px`,
                maxWidth: '100%',
                aspectRatio: `${artboard.w} / ${artboard.h}`,
                borderRadius: `${artRadius}px`,
              }}
            >
              <svg
                viewBox={`${artboard.x} ${artboard.y} ${artboard.w} ${artboard.h}`}
                className="w-full h-full block"
              >
                <defs dangerouslySetInnerHTML={{ __html: DEFS }} />
                <g dangerouslySetInnerHTML={{ __html: elementToSvg(artboard, true) }} />
                {children.map((child) => (
                  <g
                    key={child.id}
                    className={child.link ? 'cursor-pointer hover:opacity-90' : ''}
                    onClick={() => {
                      if (child.link) {
                        handleLinkClick(child.link);
                      }
                    }}
                    dangerouslySetInnerHTML={{ __html: elementToSvg(child, true) }}
                  />
                ))}
              </svg>
            </div>
          );
        })
      ) : (
        <div className="text-center py-20 text-gray-500">
          No artboards on this page to preview.
        </div>
      )}
    </div>
  );
};
