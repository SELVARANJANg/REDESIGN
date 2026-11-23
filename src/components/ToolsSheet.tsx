import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Hand,
  Type,
  StickyNote,
  Pencil,
  PenTool,
  Square,
  Circle,
  ArrowUpRight,
  Minus,
  Image as ImageIcon,
  Smartphone,
  Tablet,
  Monitor,
  Component,
  Plus,
  Pipette,
  QrCode,
  ArrowLeft,
  Link2,
  Globe,
  Check,
  X,
  Shuffle,
} from 'lucide-react';
import { DevicePreset, ToolType } from '../types';
import { DEVICE_PRESETS } from '../utils/helpers';

interface ToolsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: ToolType) => void;
  onUploadImage: () => void;
  onAddPresetArtboard?: (preset: DevicePreset) => void;
  onAddTemplateComponent?: (type: string) => void;
  onAddQrCode?: (qrDataUrl: string, value: string, radius?: number) => void;
  onRandomizePalette?: () => void;
  selectedCount?: number;
  projectName?: string;
  smartPalette?: string[];
}

export const ToolsSheet: React.FC<ToolsSheetProps> = ({
  isOpen,
  onClose,
  onSelectTool,
  onUploadImage,
  onAddPresetArtboard,
  onAddTemplateComponent,
  onAddQrCode,
  onRandomizePalette,
  selectedCount = 0,
  projectName = 'Design',
  smartPalette = [],
}) => {
  const [activeTab, setActiveTab] = useState<'tools' | 'devices' | 'components'>('tools');
  const [showQrBuilder, setShowQrBuilder] = useState(false);

  const currentBrowserUrl =
    typeof window !== 'undefined' ? window.location.href : 'https://example.com';
  const projectShareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?project=${encodeURIComponent(
          projectName.trim() || 'Design'
        )}`
      : 'https://example.com';

  const [qrText, setQrText] = useState(currentBrowserUrl);
  const [qrFg, setQrFg] = useState('#0f172a');
  const [qrBg, setQrBg] = useState('#ffffff');
  const [qrRounded, setQrRounded] = useState(true);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string>('');
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setShowQrBuilder(false);
    } else if (!qrText) {
      setQrText(currentBrowserUrl);
    }
  }, [isOpen, currentBrowserUrl]);

  useEffect(() => {
    if (!isOpen || !showQrBuilder) return;
    const trimmed = qrText.trim();
    if (!trimmed) {
      setQrPreviewUrl('');
      setQrError('Enter a URL or text to encode');
      return;
    }
    let cancelled = false;
    setQrError(null);
    QRCode.toDataURL(trimmed, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: qrFg,
        light: qrBg,
      },
    })
      .then((url) => {
        if (!cancelled) setQrPreviewUrl(url);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('QR generation failed:', err);
          setQrError('Could not encode this text into a QR code');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, showQrBuilder, qrText, qrFg, qrBg]);

  if (!isOpen) return null;

  const tools: {
    label: string;
    icon: React.ReactNode;
    tool: ToolType;
    isImage?: boolean;
    isQr?: boolean;
    isRandomizePalette?: boolean;
    badge?: string;
  }[] = [
    { label: 'Hand', icon: <Hand size={20} />, tool: 'hand' },
    { label: 'Text', icon: <Type size={20} />, tool: 'text' },
    { label: 'Artboard', icon: <span className="text-xl font-bold font-mono">#</span>, tool: 'artboard' },
    { label: 'Note', icon: <StickyNote size={20} />, tool: 'note' },
    { label: 'Pencil', icon: <Pencil size={20} />, tool: 'pencil' },
    { label: 'Pen', icon: <PenTool size={20} />, tool: 'pen' },
    { label: 'Rectangle', icon: <Square size={20} />, tool: 'rect' },
    { label: 'Oval', icon: <Circle size={20} />, tool: 'oval' },
    { label: 'Arrow', icon: <ArrowUpRight size={20} />, tool: 'arrow' },
    { label: 'Line', icon: <Minus size={20} />, tool: 'line' },
    { label: 'Eyedropper', icon: <Pipette size={20} />, tool: 'eyedropper' },
    {
      label: 'Randomize Palette',
      icon: <Shuffle size={20} />,
      tool: 'select',
      isRandomizePalette: true,
      badge: selectedCount > 0 ? 'Smart Fill' : 'Select items',
    },
    { label: 'QR Code', icon: <QrCode size={20} />, tool: 'image', isQr: true, badge: 'URL / Link' },
    { label: 'Image', icon: <ImageIcon size={20} />, tool: 'image', isImage: true },
  ];

  const handleInsertQr = async () => {
    const trimmed = qrText.trim();
    if (!trimmed || !onAddQrCode) return;
    try {
      const highResUrl =
        qrPreviewUrl ||
        (await QRCode.toDataURL(trimmed, {
          width: 512,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: qrFg, light: qrBg },
        }));
      onAddQrCode(highResUrl, trimmed, qrRounded ? 10 : 0);
      setShowQrBuilder(false);
      onClose();
    } catch (err) {
      console.error(err);
      setQrError('Failed to create QR Code');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-[#222226] rounded-t-3xl shadow-2xl p-6 z-10 select-none animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto touch-pan-y">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-3" />

        {showQrBuilder ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowQrBuilder(false)}
                className="min-h-[44px] min-w-[44px] flex items-center gap-1.5 px-2 -ml-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft size={18} />
                <span>Tools</span>
              </button>
              <div className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                <QrCode size={16} className="text-blue-600" />
                <span>QR Code Generator</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Live QR Preview */}
            <div className="flex flex-col items-center justify-center py-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200/80 dark:border-gray-800">
              {qrPreviewUrl ? (
                <img
                  src={qrPreviewUrl}
                  alt="QR Code Preview"
                  className={`w-36 h-36 object-contain border border-black/10 shadow-sm bg-white ${
                    qrRounded ? 'rounded-2xl' : 'rounded-none'
                  }`}
                />
              ) : (
                <div className="w-36 h-36 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-xs text-gray-400 text-center px-3">
                  {qrError || 'Generating...'}
                </div>
              )}
              <span className="mt-2 max-w-[90%] truncate text-[11px] font-mono text-gray-500 dark:text-gray-400">
                {qrText.trim() || 'No URL entered'}
              </span>
            </div>

            {/* Quick Link Presets */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setQrText(currentBrowserUrl)}
                className={`min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  qrText === currentBrowserUrl
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200'
                }`}
              >
                <Globe size={14} />
                <span>Current URL</span>
              </button>
              <button
                type="button"
                onClick={() => setQrText(projectShareUrl)}
                className={`min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  qrText === projectShareUrl
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200'
                }`}
              >
                <Link2 size={14} />
                <span>Project Link</span>
              </button>
            </div>

            {/* Editable URL / Content */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400">
                Destination URL or Text
              </label>
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 min-h-[44px] border border-transparent focus-within:border-blue-500">
                <input
                  type="text"
                  value={qrText}
                  onChange={(e) => setQrText(e.target.value)}
                  placeholder="https://your-link.com"
                  className="flex-1 bg-transparent outline-hidden text-xs font-mono text-gray-900 dark:text-gray-100 select-text"
                />
                {qrText && (
                  <button
                    type="button"
                    onClick={() => setQrText('')}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    title="Clear URL"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Styling: FG/BG + Corner Style + Smart Palette chips */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <label className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-2.5 py-2 rounded-xl cursor-pointer">
                <input
                  type="color"
                  value={qrFg}
                  onChange={(e) => setQrFg(e.target.value)}
                  className="w-6 h-6 rounded border-0 bg-transparent p-0 cursor-pointer"
                />
                <span className="font-semibold text-gray-700 dark:text-gray-200">Code</span>
              </label>
              <label className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-2.5 py-2 rounded-xl cursor-pointer">
                <input
                  type="color"
                  value={qrBg}
                  onChange={(e) => setQrBg(e.target.value)}
                  className="w-6 h-6 rounded border-0 bg-transparent p-0 cursor-pointer"
                />
                <span className="font-semibold text-gray-700 dark:text-gray-200">Bg</span>
              </label>
              <button
                type="button"
                onClick={() => setQrRounded((prev) => !prev)}
                className={`px-2.5 py-2 rounded-xl font-semibold border transition-colors ${
                  qrRounded
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-600 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-300'
                }`}
              >
                {qrRounded ? 'Rounded' : 'Sharp'}
              </button>
            </div>

            {smartPalette.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Smart Palette Tint (Code Color)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {smartPalette.slice(0, 8).map((hex) => (
                    <button
                      key={`qr-pal-${hex}`}
                      type="button"
                      onClick={() => setQrFg(hex)}
                      className={`w-7 h-7 rounded-lg border transition-transform hover:scale-105 ${
                        qrFg.toLowerCase() === hex.toLowerCase()
                          ? 'ring-2 ring-blue-500 border-white'
                          : 'border-black/15 dark:border-white/15'
                      }`}
                      style={{ backgroundColor: hex }}
                      title={`Use ${hex}`}
                    />
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={!qrText.trim() || !onAddQrCode}
              onClick={handleInsertQr}
              className="w-full min-h-[48px] bg-blue-600 hover:bg-blue-700 disabled:opacity-45 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all"
            >
              <Check size={17} />
              <span>Add QR Code to Canvas</span>
            </button>
          </div>
        ) : (
          <>
            {/* Tab switchers */}
            <div className="flex gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-4">
              <button
                onClick={() => setActiveTab('tools')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'tools'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Tools
              </button>
              <button
                onClick={() => setActiveTab('devices')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'devices'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Device Presets
              </button>
              <button
                onClick={() => setActiveTab('components')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === 'components'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                UI Kit
              </button>
            </div>

            {/* TOOLS TAB */}
            {activeTab === 'tools' && (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {tools.map((item) => (
                  <div
                    key={item.label}
                    onClick={() => {
                      if (item.isQr) {
                        setShowQrBuilder(true);
                        return;
                      }
                      if (item.isRandomizePalette) {
                        onRandomizePalette?.();
                        onClose();
                        return;
                      }
                      if (item.isImage) {
                        onUploadImage();
                      } else {
                        onSelectTool(item.tool);
                      }
                      onClose();
                    }}
                    className="flex items-center justify-between gap-4 py-3.5 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 flex items-center justify-center text-gray-700 dark:text-gray-200">
                        {item.icon}
                      </div>
                      <span className="text-base font-medium text-gray-900 dark:text-gray-100">
                        {item.label}
                      </span>
                    </div>
                    {item.badge && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                        {item.badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* DEVICE PRESETS TAB */}
            {activeTab === 'devices' && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 mb-2 px-1">
                  Tap to add an artboard with exact hardware viewport dimensions:
                </p>
                {DEVICE_PRESETS.map((dev) => (
                  <div
                    key={dev.id}
                    onClick={() => {
                      if (onAddPresetArtboard) {
                        onAddPresetArtboard(dev);
                      }
                      onClose();
                    }}
                    className="flex items-center justify-between p-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-2xl cursor-pointer border border-gray-100 dark:border-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        {dev.category === 'Mobile' ? (
                          <Smartphone size={20} />
                        ) : dev.category === 'Tablet' ? (
                          <Tablet size={20} />
                        ) : (
                          <Monitor size={20} />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                          {dev.name}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          {dev.w} × {dev.h} px
                        </div>
                      </div>
                    </div>
                    <Plus size={18} className="text-blue-600" />
                  </div>
                ))}
              </div>
            )}

            {/* UI KIT / TEMPLATES TAB */}
            {activeTab === 'components' && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 mb-2 px-1">
                  Add pre-designed components to your current artboard:
                </p>
                {[
                  { id: 'btn-primary', name: 'Primary Button', desc: 'Gradient pill with label' },
                  { id: 'card-feature', name: 'Feature Card', desc: 'Rounded card with badge & subtitle' },
                  { id: 'search-bar', name: 'Search Input', desc: 'Pill input with icon' },
                  { id: 'nav-bar', name: 'Mobile Tab Bar', desc: 'Floating dark navigation bar' },
                ].map((comp) => (
                  <div
                    key={comp.id}
                    onClick={() => {
                      if (onAddTemplateComponent) {
                        onAddTemplateComponent(comp.id);
                      }
                      onClose();
                    }}
                    className="flex items-center justify-between p-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 rounded-2xl cursor-pointer border border-gray-100 dark:border-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <Component size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                          {comp.name}
                        </div>
                        <div className="text-xs text-gray-400">{comp.desc}</div>
                      </div>
                    </div>
                    <Plus size={18} className="text-purple-600" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
