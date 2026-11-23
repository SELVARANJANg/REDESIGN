import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Search, Sparkles, Plus } from 'lucide-react';
import { CanvasElement, DesignTemplate } from '../types';
import { ALL_TEMPLATES, TEMPLATE_CATEGORIES } from '../utils/templates';
import { DEFS } from '../utils/helpers';
import { elementToSvg } from '../utils/export';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: DesignTemplate) => void;
}

const TemplateThumbnail: React.FC<{ template: DesignTemplate; seedOffset: number }> = React.memo(
  ({ template, seedOffset }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      const el = containerRef.current;
      if (!el || isVisible) return;
      if (typeof IntersectionObserver === 'undefined') {
        setIsVisible(true);
        return;
      }
      const obs = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setIsVisible(true);
            obs.disconnect();
          }
        },
        { rootMargin: '140px' }
      );
      obs.observe(el);
      return () => obs.disconnect();
    }, [isVisible]);

    const svgInner = useMemo(() => {
      if (!isVisible) return '';
      const elementsMarkup = template.elements
        .map((item, idx) =>
          elementToSvg(
            {
              ...item,
              id: 900000 + seedOffset * 200 + idx,
            } as CanvasElement,
            true
          )
        )
        .join('');
      return `${DEFS}<rect width="${template.w}" height="${template.h}" fill="#f8fafc" rx="8" />${elementsMarkup}`;
    }, [isVisible, template, seedOffset]);

    return (
      <div
        ref={containerRef}
        className="w-full h-32 sm:h-36 rounded-xl bg-gray-100/90 dark:bg-gray-900/70 border border-gray-200/70 dark:border-gray-700/60 p-2.5 mb-3 flex items-center justify-center overflow-hidden"
      >
        {isVisible ? (
          <svg
            viewBox={`0 0 ${template.w} ${template.h}`}
            className="w-full h-full drop-shadow-xs rounded-md overflow-hidden"
            preserveAspectRatio="xMidYMid meet"
            dangerouslySetInnerHTML={{ __html: svgInner }}
          />
        ) : (
          <div className="w-2/3 h-full rounded-md bg-gray-200/70 dark:bg-gray-800/70 animate-pulse" />
        )}
      </div>
    );
  }
);

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return ALL_TEMPLATES.filter((tpl) => {
      const matchesCat = selectedCategory === 'all' || tpl.category === selectedCategory;
      const matchesSearch =
        !q ||
        tpl.title.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-white dark:bg-[#1e1e24] rounded-3xl shadow-2xl border border-gray-200/90 dark:border-gray-800/90 flex flex-col max-h-[90vh] z-10 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 flex-wrap">
                <span>Design Templates Library</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  {ALL_TEMPLATES.length}+ Designs
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                100% editable vector templates: ATM &amp; credit cards, modern resumes, invitations, and UI screens.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
            aria-label="Close templates"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar & Categories */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3 shrink-0 bg-gray-50/50 dark:bg-[#18181c]/50">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search ATM cards, CV, resumes, business cards, invitations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-gray-800 pl-10 pr-4 py-2.5 rounded-2xl text-sm border border-gray-200 dark:border-gray-700 outline-hidden ring-1 ring-transparent focus:ring-blue-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 shadow-2xs font-normal"
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto touch-pan-x pb-1 text-xs no-scrollbar">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`min-h-[34px] px-3 py-1.5 rounded-xl font-medium shrink-0 flex items-center gap-1.5 transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200/60 dark:border-gray-700/60'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto touch-pan-y p-4 sm:p-6">
          {filteredTemplates.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <p className="text-base font-semibold mb-1">No templates found</p>
              <p className="text-xs">Try searching for &quot;card&quot;, &quot;resume&quot;, &quot;wedding&quot;, or &quot;UI&quot;</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredTemplates.map((template, tplIdx) => (
                <div
                  key={template.id}
                  onClick={() => {
                    onSelectTemplate(template);
                    onClose();
                  }}
                  className="group relative bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 p-3.5 hover:shadow-xl hover:border-blue-500/80 dark:hover:border-blue-500 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <TemplateThumbnail template={template} seedOffset={tplIdx} />

                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                        {template.categoryLabel}
                      </span>
                      {template.badge && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
                          {template.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">
                      {template.title}
                    </h3>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {template.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-gray-400">
                      {template.w} × {template.h} px
                    </span>

                    <button
                      type="button"
                      className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-600 text-gray-700 dark:text-gray-200 group-hover:text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    >
                      <Plus size={14} />
                      <span>Use</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
