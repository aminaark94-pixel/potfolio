/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { X, Search, AlertTriangle, ExternalLink, EyeOff, Eye, CheckCircle2 } from 'lucide-react';
import { PortfolioItem } from '../types/portfolio';

interface DuplicateFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PortfolioItem[];
  onSetItemHidden: (itemId: string, hidden: boolean) => Promise<void>;
}

// Perceptual hash (dHash): resizes the image to a tiny 9x8 grayscale grid
// and encodes, for each row, whether each pixel is brighter than the next
// one — a 64-bit fingerprint that stays the same even if the exact same
// picture was uploaded twice as a different Drive file (different ID,
// maybe different compression), which is exactly what a same-URL check
// can't catch.
function computeImageHash(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timeout = setTimeout(() => resolve(null), 12000);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 9;
        canvas.height = 8;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, 9, 8);
        const data = ctx.getImageData(0, 0, 9, 8).data;

        const gray: number[] = [];
        for (let i = 0; i < data.length; i += 4) {
          gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }

        let hash = '';
        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 8; col++) {
            const left = gray[row * 9 + col];
            const right = gray[row * 9 + col + 1];
            hash += left > right ? '1' : '0';
          }
        }
        resolve(hash);
      } catch {
        // Tainted canvas (CORS) or decode failure — skip this image rather
        // than fail the whole scan.
        resolve(null);
      }
    };
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };
    img.src = url;
  });
}

function hammingDistance(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

// <= 6 bits different out of 64 is a strong visual match (same or near-
// identical image), while allowing for minor recompression differences.
const SIMILARITY_THRESHOLD = 6;
const MAX_CONCURRENT = 6;

interface DuplicateGroup {
  items: PortfolioItem[];
}

export const DuplicateFinderModal: React.FC<DuplicateFinderModalProps> = ({ isOpen, onClose, items, onSetItemHidden }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [groups, setGroups] = useState<DuplicateGroup[] | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  const [hidingIds, setHidingIds] = useState<Set<string>>(new Set());
  const [showHiddenPanel, setShowHiddenPanel] = useState(false);
  // Tracks items hidden during THIS scan session so the results list can
  // show an immediate "Hidden" confirmation instead of looking frozen —
  // the scan's `groups` snapshot never re-runs on its own.
  const [justHiddenIds, setJustHiddenIds] = useState<Set<string>>(new Set());
  const [isBulkHiding, setIsBulkHiding] = useState(false);
  const [bulkHideProgress, setBulkHideProgress] = useState({ done: 0, total: 0 });

  const handleToggleHide = async (itemId: string, currentlyHidden: boolean) => {
    setHidingIds((prev) => new Set(prev).add(itemId));
    try {
      await onSetItemHidden(itemId, !currentlyHidden);
      setJustHiddenIds((prev) => {
        const next = new Set(prev);
        if (!currentlyHidden) next.add(itemId);
        else next.delete(itemId);
        return next;
      });
    } catch (e) {
      alert('Could not hide this item — please check your connection and try again.');
    } finally {
      setHidingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const hiddenItems = items.filter((i) => i.hidden);

  // One click: for every group, keeps the first image (treated as the
  // "original" to keep visible) and hides every other match in that
  // group — instead of clicking "Hide" one item at a time.
  const handleHideAllDuplicates = async () => {
    if (!groups || groups.length === 0) return;
    const toHide = groups.flatMap((g) => g.items.slice(1)).filter((it) => !it.hidden);
    if (toHide.length === 0) return;

    if (
      !confirm(
        `Hide ${toHide.length} duplicate item(s) across ${groups.length} group(s)? The first image in each group stays visible as the keeper — the rest are hidden from browse/search only. Nothing is deleted, and any showcase already using them keeps working.`
      )
    ) {
      return;
    }

    setIsBulkHiding(true);
    setBulkHideProgress({ done: 0, total: toHide.length });

    for (const item of toHide) {
      try {
        await onSetItemHidden(item.id, true);
        setJustHiddenIds((prev) => new Set(prev).add(item.id));
      } catch {
        // Keep going even if one fails — better to hide the rest than
        // stop the whole batch over a single network hiccup.
      }
      setBulkHideProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setIsBulkHiding(false);
  };

  useEffect(() => {
    if (!isOpen) {
      setGroups(null);
      setIsScanning(false);
    }
  }, [isOpen]);

  const runScan = async () => {
    setIsScanning(true);
    setGroups(null);
    setSkippedCount(0);
    // Skip already-hidden items — no point re-flagging something the admin
    // already dealt with.
    const targets = items.filter((i) => !i.hidden && (i.thumb_small || i.thumb || i.thumb_large));
    setProgress({ done: 0, total: targets.length });

    const hashes: Array<{ item: PortfolioItem; hash: string }> = [];
    let skipped = 0;
    let cursor = 0;

    async function worker() {
      while (cursor < targets.length) {
        const idx = cursor++;
        const item = targets[idx];
        const url = item.thumb_small || item.thumb || item.thumb_large || '';
        const hash = await computeImageHash(url);
        if (hash) hashes.push({ item, hash });
        else skipped++;
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }
    }

    await Promise.all(Array.from({ length: MAX_CONCURRENT }, () => worker()));

    // Group by similarity (simple union-find via nearest-match clustering).
    const used = new Set<number>();
    const foundGroups: DuplicateGroup[] = [];
    for (let i = 0; i < hashes.length; i++) {
      if (used.has(i)) continue;
      const cluster = [hashes[i]];
      used.add(i);
      for (let j = i + 1; j < hashes.length; j++) {
        if (used.has(j)) continue;
        if (hammingDistance(hashes[i].hash, hashes[j].hash) <= SIMILARITY_THRESHOLD) {
          cluster.push(hashes[j]);
          used.add(j);
        }
      }
      if (cluster.length > 1) {
        foundGroups.push({ items: cluster.map((c) => c.item) });
      }
    }

    setGroups(foundGroups);
    setSkippedCount(skipped);
    setIsScanning(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-space-grotesk">Find Duplicate Images</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Read-only scan — nothing is ever deleted. Use "Hide" on a repeat to remove it from browse/search only; any showcase already linking to it (e.g. sent to a client) keeps working exactly as before.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hiddenItems.length > 0 && (
              <button
                onClick={() => setShowHiddenPanel((v) => !v)}
                className="text-xs font-bold text-slate-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 cursor-pointer whitespace-nowrap"
              >
                {showHiddenPanel ? 'Back to Scan' : `Hidden Items (${hiddenItems.length})`}
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {showHiddenPanel ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                These items are hidden from browse/search everywhere in the admin, but not deleted — any showcase already linking to one still shows it fine.
              </p>
              {hiddenItems.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No hidden items.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {hiddenItems.map((item) => (
                    <div key={item.id} className="border border-slate-200 rounded-xl p-2 space-y-1.5">
                      <img
                        src={item.thumb_small || item.thumb || ''}
                        alt={item.name}
                        className="w-full aspect-square object-cover rounded-lg opacity-60"
                      />
                      <p className="text-[11px] font-semibold text-slate-600 truncate" title={item.name}>{item.name}</p>
                      <button
                        onClick={() => handleToggleHide(item.id, true)}
                        disabled={hidingIds.has(item.id)}
                        className="w-full inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                      >
                        <Eye className="w-3 h-3" /> Unhide
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
          <>
          {!isScanning && groups === null && (
            <div className="text-center py-12 space-y-4">
              <Search className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Scans {items.length} item{items.length === 1 ? '' : 's'} and compares them visually (not just by link) —
                so it catches the same picture even if it was uploaded to two different Drive folders as two different files.
              </p>
              <button
                onClick={runScan}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold cursor-pointer"
              >
                <Search className="w-4 h-4" /> Start Scan
              </button>
            </div>
          )}

          {isScanning && (
            <div className="text-center py-12 space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-700">
                Checking {progress.done} of {progress.total}...
              </p>
            </div>
          )}

          {!isScanning && groups !== null && (
            <>
              {groups.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <AlertTriangle className="w-8 h-8 mx-auto text-emerald-400" />
                  <p className="text-sm font-semibold text-slate-700">No duplicates found.</p>
                  {skippedCount > 0 && (
                    <p className="text-xs text-slate-400">
                      ({skippedCount} image{skippedCount === 1 ? '' : 's'} couldn't be checked — usually a Drive sharing/CORS issue.)
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    Found {groups.length} group{groups.length === 1 ? '' : 's'} of likely duplicates. Nothing has been changed —
                    review each group and click "Hide" on the repeat(s) you want gone from browse/search.
                  </p>

                  <button
                    onClick={handleHideAllDuplicates}
                    disabled={isBulkHiding}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-rose-200"
                  >
                    <EyeOff className="w-4 h-4" />
                    {isBulkHiding
                      ? `Hiding ${bulkHideProgress.done}/${bulkHideProgress.total}...`
                      : `Hide All Duplicates (keeps 1 per group, ${groups.reduce((n, g) => n + g.items.length - 1, 0)} to hide)`}
                  </button>
                  {groups.map((group, gi) => (
                    <div key={gi} className="border border-slate-200 rounded-2xl p-4 space-y-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Group {gi + 1} — {group.items.length} matches
                      </p>
                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {group.items.map((item) => {
                          const isHiddenNow = item.hidden || justHiddenIds.has(item.id);
                          return (
                          <div key={item.id} className={`shrink-0 w-28 transition-opacity ${isHiddenNow ? 'opacity-40' : ''}`}>
                            <div className="relative">
                              <img
                                src={item.thumb_small || item.thumb || ''}
                                alt={item.name}
                                className="w-28 h-28 object-cover rounded-xl border border-slate-200"
                              />
                              {isHiddenNow && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 rounded-xl">
                                  <span className="text-[10px] font-bold text-white bg-slate-900/80 px-2 py-1 rounded-full">Hidden</span>
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] font-semibold text-slate-700 mt-1 truncate" title={item.name}>
                              {item.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">{item.category}</p>
                            {item.drive_link && (
                              <a
                                href={item.drive_link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5 mt-0.5"
                              >
                                <ExternalLink className="w-2.5 h-2.5" /> Open in Drive
                              </a>
                            )}
                            <button
                              onClick={() => handleToggleHide(item.id, isHiddenNow)}
                              disabled={hidingIds.has(item.id)}
                              className={`w-full mt-1.5 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer disabled:opacity-50 ${
                                isHiddenNow
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                              }`}
                            >
                              {hidingIds.has(item.id) ? (
                                'Working...'
                              ) : isHiddenNow ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" /> Hidden — Undo
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3" /> Hide
                                </>
                              )}
                            </button>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {skippedCount > 0 && (
                    <p className="text-[11px] text-slate-400 text-center pt-2">
                      {skippedCount} image{skippedCount === 1 ? '' : 's'} couldn't be checked and were skipped.
                    </p>
                  )}
                </>
              )}
              <button
                onClick={runScan}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Re-scan
              </button>
            </>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
};
