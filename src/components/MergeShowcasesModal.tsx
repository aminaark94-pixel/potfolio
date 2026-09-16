import React, { useMemo, useState } from 'react';
import { GitMerge, X, Sparkles, Check, Square, CheckSquare } from 'lucide-react';
import { Showcase, ThemeId } from '../types/portfolio';
import { THEMES } from '../data/themes';
import { slugify } from '../utils/storage';

interface MergeShowcasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  showcases: Record<string, Showcase>;
  onCreateShowcase: (newShowcase: Showcase) => void;
  onSelectShowcase: (slug: string) => void;
}

/**
 * Standalone "Merge Showcases" feature.
 *
 * Lets the user pick 2+ existing showcases and combine their curated items
 * into a brand-new showcase. This is purely additive:
 *  - The source showcases are NEVER modified or deleted.
 *  - The merge happens once, at creation time — the new showcase does NOT
 *    stay "linked" to its sources, so adding items to an original showcase
 *    later does NOT automatically appear in the merged one. To include more
 *    items later, the user just edits the merged showcase directly (or runs
 *    a fresh merge).
 *
 * This file is self-contained and only imported/rendered from AdminPanel —
 * it doesn't alter any existing showcase logic, so it's safe to add
 * alongside other in-progress work on the same codebase.
 */
export const MergeShowcasesModal: React.FC<MergeShowcasesModalProps> = ({
  isOpen,
  onClose,
  showcases,
  onCreateShowcase,
  onSelectShowcase,
}) => {
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [brandName, setBrandName] = useState('My Studio');
  const [heading, setHeading] = useState('');
  const [tagline, setTagline] = useState('A merged selection of work, curated specifically for you.');
  const [theme, setTheme] = useState<ThemeId>('rust');
  const [error, setError] = useState<string | null>(null);

  const showcaseList = useMemo(
    () => (Object.entries(showcases) as [string, Showcase][]),
    [showcases]
  );

  const toggleSlug = (slug: string) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
    setError(null);
  };

  // Union of item_ids across every selected showcase, de-duplicated while
  // keeping first-seen order (so the merged gallery isn't randomly shuffled).
  const mergedItemIds = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    showcaseList.forEach(([slug, sc]) => {
      if (!selectedSlugs.has(slug)) return;
      sc.item_ids.forEach((id) => {
        if (!seen.has(id)) {
          seen.add(id);
          result.push(id);
        }
      });
    });
    return result;
  }, [showcaseList, selectedSlugs]);

  const resetAndClose = () => {
    setSelectedSlugs(new Set());
    setBrandName('My Studio');
    setHeading('');
    setTagline('A merged selection of work, curated specifically for you.');
    setTheme('rust');
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlugs.size < 2) {
      setError('Pick at least 2 showcases to merge.');
      return;
    }
    if (!heading.trim()) {
      setError('Give the merged showcase a client / project name.');
      return;
    }

    const slug = slugify(heading) + '-' + Math.random().toString(36).substring(2, 6);
    const newSc: Showcase = {
      id: 'showcase-' + Date.now(),
      slug,
      brand_name: brandName.trim() || 'My Studio',
      heading: heading.trim(),
      tagline: tagline.trim(),
      logo_url: '',
      item_ids: mergedItemIds,
      theme,
      heroStyle: 'fluid-blob',
      // Same safe defaults used for any newly-created showcase — existing
      // (source) showcases are completely untouched by this.
      heroTemplate: 'curved-3d',
      layoutMode: 'flow',
      galleryOrientation: 'columns',
      clientNote: '',
      ctaText: 'Approve & Get Started',
      ctaLink: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      feedback: {},
    };

    onCreateShowcase(newSc);
    onSelectShowcase(newSc.slug);
    resetAndClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
        onClick={resetAndClose}
      />
      <div
        className="fixed z-50 bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col"
        style={{ top: '5%', left: '50%', transform: 'translateX(-50%)', width: 'min(720px, 92vw)', maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <GitMerge className="w-4.5 h-4.5 text-indigo-600" />
            <h4 className="font-space-grotesk font-bold text-base text-slate-900">
              Merge Showcases
            </h4>
          </div>
          <button
            onClick={resetAndClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          <p className="text-xs font-space-grotesk text-slate-500">
            Pick 2 or more showcases below. Their items will be combined (duplicates removed) into
            one brand-new showcase — the originals stay exactly as they are.
          </p>

          {/* Showcase picker */}
          <div className="space-y-2">
            <label className="block font-space-grotesk font-semibold text-slate-700 text-xs">
              Select showcases to merge ({selectedSlugs.size} selected)
            </label>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {showcaseList.map(([slug, sc]) => {
                const checked = selectedSlugs.has(slug);
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => toggleSlug(slug)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      checked
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-space-grotesk font-bold text-slate-900 truncate">
                        {sc.heading || 'Showcase'}
                      </span>
                      <span className="block text-[11px] font-mono text-slate-400 truncate">
                        {sc.brand_name} · {sc.item_ids.length} items
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedSlugs.size >= 2 && (
            <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-space-grotesk font-semibold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{mergedItemIds.length} unique item(s) will be in the merged showcase.</span>
            </div>
          )}

          {/* New showcase details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-space-grotesk font-semibold text-slate-700 mb-1">
                Your Studio / Brand Name
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Atelier Maison"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block font-space-grotesk font-semibold text-slate-700 mb-1">
                Client / Project Name *
              </label>
              <input
                type="text"
                required
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                placeholder="e.g. Zenith — Combined Showcase"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-space-grotesk font-semibold text-slate-700 mb-1">
              Tagline / Subtitle
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
            />
          </div>

          <div className="space-y-2 text-xs">
            <label className="block font-space-grotesk font-semibold text-slate-700">
              Color Theme
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.values(THEMES).map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setTheme(th.id)}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    theme === th.id
                      ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: th.accent }} />
                  <span className="text-[11px] font-space-grotesk font-medium text-slate-800 truncate">
                    {th.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-space-grotesk font-semibold">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={resetAndClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-space-grotesk font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-space-grotesk font-bold text-xs shadow-lg shadow-indigo-200 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create Merged Showcase</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
