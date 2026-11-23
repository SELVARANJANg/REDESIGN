import React, { useMemo, useState } from 'react';
import {
  History,
  X,
  RotateCcw,
  Plus,
  Trash2,
  Clock,
  BookmarkCheck,
  ShieldCheck,
} from 'lucide-react';
import { CanvasElement, ProjectState, VersionSnapshot } from '../types';
import { DEFS, getBoundingBox } from '../utils/helpers';
import { elementToSvg } from '../utils/export';
import { HOURLY_INTERVAL_MS } from '../utils/versionHistory';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: VersionSnapshot[];
  currentProject: ProjectState;
  onSaveCheckpoint: (label?: string) => void;
  onRestoreVersion: (snapshot: VersionSnapshot) => void;
  onDeleteSnapshot: (id: string) => void;
  onClearHistory: () => void;
}

const SnapshotPreview: React.FC<{ project: ProjectState }> = React.memo(({ project }) => {
  const { viewBox, svgContent } = useMemo(() => {
    const activePage = project.pages[Math.min(project.pi || 0, Math.max(0, project.pages.length - 1))] || project.pages[0];
    const items = activePage?.items?.filter((i) => !i.hidden) || [];
    if (items.length === 0) {
      return {
        viewBox: '0 0 120 80',
        svgContent: '<rect width="120" height="80" fill="#f8fafc" rx="6" />',
      };
    }
    const artboards = items.filter((i) => i.t === 'artboard');
    const bbox = getBoundingBox(artboards.length > 0 ? artboards : items);
    const pad = 16;
    const vb = `${bbox.x - pad} ${bbox.y - pad} ${Math.max(40, bbox.w + pad * 2)} ${Math.max(40, bbox.h + pad * 2)}`;
    const markup = items
      .slice(0, 60)
      .map((item, idx) =>
        elementToSvg(
          {
            ...item,
            id: 700000 + idx,
          } as CanvasElement,
          true
        )
      )
      .join('');
    return {
      viewBox: vb,
      svgContent: `${DEFS}${markup}`,
    };
  }, [project]);

  return (
    <div className="w-16 h-20 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700/80 p-1 shrink-0 flex items-center justify-center overflow-hidden">
      <svg
        viewBox={viewBox}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
});

function formatRelativeTime(ts: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function formatClockTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  snapshots,
  currentProject,
  onSaveCheckpoint,
  onRestoreVersion,
  onDeleteSnapshot,
  onClearHistory,
}) => {
  const [checkpointLabel, setCheckpointLabel] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  const latestHourly = useMemo(
    () => snapshots.find((s) => s.kind === 'hourly'),
    [snapshots]
  );

  const nextAutoText = useMemo(() => {
    if (!latestHourly) return 'Auto-saving hourly baseline active';
    const remainingMs = Math.max(0, HOURLY_INTERVAL_MS - (Date.now() - latestHourly.timestamp));
    const mins = Math.ceil(remainingMs / 60000);
    if (mins <= 1) return 'Next hourly snapshot due soon on edit';
    return `Next hourly snapshot in ~${mins} min`;
  }, [latestHourly, isOpen]);

  if (!isOpen) return null;

  const currentElemCount = currentProject.pages.reduce(
    (sum, p) => sum + (p.items?.length || 0),
    0
  );

  const handleCreateCheckpoint = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCheckpoint(checkpointLabel.trim() || undefined);
    setCheckpointLabel('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-white dark:bg-[#1e1e24] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200/80 dark:border-gray-800/80 flex flex-col max-h-[88vh] z-10 overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 flex items-center justify-center shrink-0">
              <History size={19} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                Version History
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums truncate">
                {nextAutoText} · {snapshots.length} saved
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
            aria-label="Close Version History"
          >
            <X size={20} />
          </button>
        </div>

        {/* Save Manual Checkpoint Bar */}
        <form
          onSubmit={handleCreateCheckpoint}
          className="px-5 py-3.5 bg-gray-50/80 dark:bg-[#18181c]/70 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={checkpointLabel}
            onChange={(e) => setCheckpointLabel(e.target.value)}
            placeholder="Checkpoint note (e.g. Before hero redesign)..."
            className="flex-1 min-w-0 bg-white dark:bg-gray-800 px-3.5 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-700 outline-hidden focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
          />
          <button
            type="submit"
            className="min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shrink-0 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus size={16} />
            <span>Save Checkpoint</span>
          </button>
        </form>

        {/* Current Live Workspace Summary Row */}
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 shrink-0">
          <div className="truncate">
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              Current Workspace
            </span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span className="tabular-nums">
              {currentProject.pages.length} {currentProject.pages.length === 1 ? 'page' : 'pages'}
            </span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span className="tabular-nums">{currentElemCount} layers</span>
          </div>

          {snapshots.length > 0 && (
            <div className="shrink-0">
              {confirmClear ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onClearHistory();
                      setConfirmClear(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                  >
                    Confirm Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>

        {/* Snapshot Timeline List */}
        <div className="flex-1 overflow-y-auto touch-pan-y divide-y divide-gray-100 dark:divide-gray-800/80 px-5 py-2">
          {snapshots.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Clock size={32} className="mx-auto mb-2.5 opacity-40" />
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                No saved versions yet
              </p>
              <p className="text-xs mt-1">
                Hourly auto-saves appear automatically, or click Save Checkpoint above.
              </p>
            </div>
          ) : (
            snapshots.map((snap) => {
              const kindLabel =
                snap.kind === 'hourly'
                  ? 'Hourly auto-save'
                  : snap.kind === 'pre-restore'
                  ? 'Safety backup'
                  : 'Checkpoint';

              return (
                <div
                  key={snap.id}
                  className="py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <SnapshotPreview project={snap.data} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {snap.kind === 'manual' ? (
                          <BookmarkCheck size={14} className="text-blue-600 shrink-0" />
                        ) : snap.kind === 'pre-restore' ? (
                          <ShieldCheck size={14} className="text-amber-500 shrink-0" />
                        ) : (
                          <Clock size={14} className="text-gray-400 shrink-0" />
                        )}
                        <span className="truncate">{snap.label}</span>
                      </div>

                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 tabular-nums truncate">
                        <span>{formatRelativeTime(snap.timestamp)}</span>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span>{formatClockTime(snap.timestamp)}</span>
                      </div>

                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums truncate">
                        <span>{kindLabel}</span>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span>{snap.projectName}</span>
                        <span className="mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span>{snap.elementCount} layers</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {confirmRestoreId === snap.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmRestoreId(null);
                            onRestoreVersion(snap);
                          }}
                          className="min-h-[40px] px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors whitespace-nowrap"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRestoreId(null)}
                          className="min-h-[40px] px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setConfirmRestoreId(snap.id)}
                          className="min-h-[40px] px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                          title="Restore this version (saves current state first)"
                        >
                          <RotateCcw size={13} />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSnapshot(snap.id)}
                          className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          aria-label="Delete snapshot"
                          title="Delete snapshot"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
