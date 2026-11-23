import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  X,
  Code,
  FileText,
  Image as ImageIcon,
  Copy,
  Check,
  Printer,
  Loader2,
} from 'lucide-react';
import { ProjectState } from '../types';
import {
  generateHtmlDocument,
  generateArtboardSvgs,
  exportArtboardToPdf,
  downloadFile,
} from '../utils/export';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  pageIndex: number;
  selectedArtboardId?: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  pageIndex,
  selectedArtboardId,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [pngFeedback, setPngFeedback] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState<string | null>(null);

  const currentPage = project.pages[pageIndex] || project.pages[0];
  const artboards = currentPage.items.filter((i) => i.t === 'artboard' && !i.hidden);

  const [targetArtboardId, setTargetArtboardId] = useState<number | undefined>(() =>
    selectedArtboardId && artboards.some((a) => a.id === selectedArtboardId)
      ? selectedArtboardId
      : artboards[0]?.id
  );

  useEffect(() => {
    if (!isOpen) return;
    setPdfFeedback(null);
    setPngFeedback(null);
    if (selectedArtboardId && artboards.some((a) => a.id === selectedArtboardId)) {
      setTargetArtboardId(selectedArtboardId);
    } else if (!targetArtboardId || !artboards.some((a) => a.id === targetArtboardId)) {
      setTargetArtboardId(artboards[0]?.id);
    }
  }, [isOpen, selectedArtboardId, pageIndex]);

  const htmlContent = useMemo(
    () => (isOpen ? generateHtmlDocument(project, pageIndex) : ''),
    [isOpen, project, pageIndex]
  );

  if (!isOpen) return null;

  const activeArtboard =
    artboards.find((a) => a.id === targetArtboardId) || artboards[0];
  const activeArtboardName =
    activeArtboard && 'n' in activeArtboard && activeArtboard.n
      ? activeArtboard.n
      : currentPage.n;

  const handleExportHtml = () => {
    downloadFile(
      `${project.name.toLowerCase().replace(/\s+/g, '_')}.html`,
      htmlContent,
      'text/html'
    );
  };

  const handleExportVectorPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    setPdfFeedback(null);
    try {
      const savedFileName = await exportArtboardToPdf(
        currentPage,
        targetArtboardId,
        project.name
      );
      setPdfFeedback(`Saved ${savedFileName}`);
      setTimeout(() => setPdfFeedback(null), 3500);
    } catch (err) {
      console.error('Vector PDF export failed:', err);
      setPdfFeedback('PDF export failed — try Print PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrintPdf = () => {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    printFrame.srcdoc = htmlContent;
    document.body.appendChild(printFrame);
    printFrame.onload = () => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (err) {
        console.error('PDF print failed:', err);
      } finally {
        setTimeout(() => printFrame.remove(), 1000);
      }
    };
  };

  const handleExportPng = () => {
    if (isExportingPng) return;
    setIsExportingPng(true);
    setPngFeedback(null);
    const svgs = generateArtboardSvgs(currentPage);
    if (!svgs.length) {
      setIsExportingPng(false);
      setPngFeedback('Nothing on page to export');
      return;
    }

    const chosenArtboard =
      (targetArtboardId ? svgs.find((s) => s.id === targetArtboardId) : undefined) ||
      svgs[0];
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const scale = 2; // 2x retina export
        canvas.width = chosenArtboard.w * scale;
        canvas.height = chosenArtboard.h * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/png');
          const fileName = `${chosenArtboard.name.replace(/\s+/g, '_')}.png`;
          downloadFile(fileName, dataUrl, 'image/png');
          setPngFeedback(`Saved ${fileName}`);
          setTimeout(() => setPngFeedback(null), 3500);
        } else {
          setPngFeedback('PNG export failed — canvas unavailable');
        }
      } catch (err) {
        console.error('PNG rasterize error:', err);
        setPngFeedback('PNG export failed — try Vector PDF');
      } finally {
        setIsExportingPng(false);
      }
    };
    img.onerror = () => {
      setIsExportingPng(false);
      setPngFeedback('PNG export failed — check image sources');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(chosenArtboard.svg);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(htmlContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-[#222226] rounded-t-3xl shadow-2xl p-6 z-10 select-none animate-in slide-in-from-bottom duration-200">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4" />

        {/* Top Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {project.name}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Export high-resolution vectors, standalone HTML, or retina PNGs.
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-1 bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 rounded-full text-xs font-semibold hover:opacity-90 active:scale-95 transition-all"
          >
            <span>Close</span>
            <X size={14} />
          </button>
        </div>

        {/* Artboard Selector (when multiple artboards exist on the page) */}
        {artboards.length > 1 && (
          <div className="mt-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Target Artboard ({artboards.length})
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {artboards.map((art) => {
                const isSelected = art.id === (targetArtboardId ?? artboards[0]?.id);
                const label = 'n' in art && art.n ? art.n : `Artboard ${art.id}`;
                return (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() => setTargetArtboardId(art.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {label} ({Math.round(art.w)}×{Math.round(art.h)})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Export Options List */}
        <div className="mt-5 space-y-1 divide-y divide-gray-100 dark:divide-gray-800">
          {/* Vector PDF (jsPDF) */}
          <div
            onClick={handleExportVectorPdf}
            className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-xs">
                {isExportingPdf ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <FileText size={20} strokeWidth={2} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    Vector PDF
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                    Hi-Res
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {isExportingPdf
                    ? `Generating vector PDF for ${activeArtboardName}...`
                    : pdfFeedback || `Preserves vectors & text · ${activeArtboardName}`}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="p-2 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200"
              aria-label="Download Vector PDF"
            >
              <Download size={18} />
            </button>
          </div>

          {/* PNG (2x Retina) */}
          <div
            onClick={handleExportPng}
            className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-200">
                <ImageIcon size={20} strokeWidth={2} />
              </div>
              <div>
                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  PNG (2x Retina)
                </div>
                <div className="text-xs text-gray-500">
                  {isExportingPng
                    ? 'Rendering 2x retina image...'
                    : pngFeedback || `Crisp raster image · ${activeArtboardName}`}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="p-2 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200"
              aria-label="Download PNG"
            >
              <Download size={18} />
            </button>
          </div>

          {/* HTML */}
          <div
            onClick={handleExportHtml}
            className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-200">
                <Code size={20} strokeWidth={2} />
              </div>
              <div>
                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  HTML
                </div>
                <div className="text-xs text-gray-500">Standalone responsive SVG web page</div>
              </div>
            </div>
            <button
              type="button"
              className="p-2 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200"
              aria-label="Download HTML"
            >
              <Download size={18} />
            </button>
          </div>

          {/* Print / Save All Artboards */}
          <div
            onClick={handlePrintPdf}
            className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-200">
                <Printer size={19} strokeWidth={2} />
              </div>
              <div>
                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  Print / Save All Pages
                </div>
                <div className="text-xs text-gray-500">System print dialog for multi-artboard PDF</div>
              </div>
            </div>
            <button
              type="button"
              className="p-2 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200"
              aria-label="Print all artboards"
            >
              <Printer size={18} />
            </button>
          </div>

          {/* Copy HTML Code */}
          <div
            onClick={handleCopyCode}
            className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Copy size={20} strokeWidth={2} />
              </div>
              <div>
                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  Copy HTML code
                </div>
                <div className="text-xs text-gray-500">
                  {copied ? 'Copied to clipboard!' : 'If a download is blocked'}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="p-2 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200"
              aria-label="Copy HTML code"
            >
              {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
