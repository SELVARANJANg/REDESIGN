import { ProjectState, VersionSnapshot } from '../types';

export const VERSION_HISTORY_STORAGE_KEY = 'gamura-version-history-v1';
export const HOURLY_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const MAX_SNAPSHOTS = 24;

function countElements(project: ProjectState): number {
  return project.pages.reduce((sum, p) => sum + (p.items?.length || 0), 0);
}

export function loadVersionHistory(): VersionSnapshot[] {
  try {
    const raw = localStorage.getItem(VERSION_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s) => s && typeof s.timestamp === 'number' && s.data && Array.isArray(s.data.pages))
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

export function saveVersionHistory(list: VersionSnapshot[]): VersionSnapshot[] {
  const trimmed = [...list].sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_SNAPSHOTS);
  let candidate = trimmed;

  while (candidate.length > 0) {
    try {
      localStorage.setItem(VERSION_HISTORY_STORAGE_KEY, JSON.stringify(candidate));
      return candidate;
    } catch {
      // Prune oldest non-manual snapshot first on quota limits, else oldest entry
      const oldestHourlyIdx = [...candidate]
        .reverse()
        .findIndex((item) => item.kind === 'hourly');
      if (oldestHourlyIdx >= 0) {
        const actualIdx = candidate.length - 1 - oldestHourlyIdx;
        candidate = candidate.filter((_, idx) => idx !== actualIdx);
      } else {
        candidate = candidate.slice(0, candidate.length - 1);
      }
    }
  }

  try {
    localStorage.setItem(VERSION_HISTORY_STORAGE_KEY, '[]');
  } catch {
    // Ignore storage errors
  }
  return [];
}

export function createVersionSnapshot(
  project: ProjectState,
  kind: VersionSnapshot['kind'],
  customLabel?: string
): VersionSnapshot {
  const now = Date.now();
  const cloned = JSON.parse(JSON.stringify(project)) as ProjectState;
  const defaultLabel =
    kind === 'hourly'
      ? 'Hourly Auto-Save'
      : kind === 'pre-restore'
      ? 'Before Version Restore'
      : 'Manual Checkpoint';

  return {
    id: `ver_${now}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: now,
    label: customLabel?.trim() || defaultLabel,
    kind,
    projectName: project.name || 'Untitled Project',
    pageCount: project.pages.length,
    elementCount: countElements(project),
    data: cloned,
  };
}

export function recordManualSnapshot(
  project: ProjectState,
  label?: string
): VersionSnapshot[] {
  const current = loadVersionHistory();
  const snap = createVersionSnapshot(project, 'manual', label);
  return saveVersionHistory([snap, ...current]);
}

export function recordPreRestoreSnapshot(project: ProjectState): VersionSnapshot[] {
  const current = loadVersionHistory();
  const snap = createVersionSnapshot(project, 'pre-restore');
  return saveVersionHistory([snap, ...current]);
}

/**
 * Checks whether an hour has elapsed since the most recent hourly snapshot.
 * If so (or if history has no hourly snapshot yet), records a new hourly snapshot
 * provided the project state differs from the latest snapshot (or no snapshot exists yet).
 */
export function maybeRecordHourlySnapshot(
  project: ProjectState,
  now = Date.now()
): { updated: VersionSnapshot[]; created: VersionSnapshot | null } {
  const current = loadVersionHistory();
  const latestHourly = current.find((s) => s.kind === 'hourly');

  if (latestHourly && now - latestHourly.timestamp < HOURLY_INTERVAL_MS) {
    return { updated: current, created: null };
  }

  if (latestHourly) {
    try {
      if (JSON.stringify(latestHourly.data) === JSON.stringify(project)) {
        return { updated: current, created: null };
      }
    } catch {
      // Proceed to save if comparison fails
    }
  }

  const snap = createVersionSnapshot(project, 'hourly', 'Hourly Auto-Save');
  const updated = saveVersionHistory([snap, ...current]);
  return { updated, created: snap };
}

export function deleteVersionSnapshot(id: string): VersionSnapshot[] {
  const current = loadVersionHistory();
  return saveVersionHistory(current.filter((item) => item.id !== id));
}

export function clearAllVersionSnapshots(): VersionSnapshot[] {
  return saveVersionHistory([]);
}

export function getNextHourlySnapshotInMs(list: VersionSnapshot[], now = Date.now()): number {
  const latestHourly = list.find((s) => s.kind === 'hourly');
  if (!latestHourly) return 0;
  return Math.max(0, HOURLY_INTERVAL_MS - (now - latestHourly.timestamp));
}
