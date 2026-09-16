import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Showcase, PortfolioItem } from '../types/portfolio';

interface ShowcaseGroupingSettingsProps {
  showcase: Showcase;
  /** The items actually curated into this showcase. */
  items: PortfolioItem[];
  onUpdateShowcase: (updated: Showcase) => void;
}

/**
 * Two per-showcase controls that change ONLY what the client sees:
 *
 *  1. Category Headings — in "Grouped by Category" layout, hide the title
 *     row above each section. The work is still grouped section by
 *     section, the sections are just untitled.
 *
 *  2. Category Names — override the display name of any category for this
 *     showcase alone, so a generic catalog name can read as something
 *     client-appropriate. The catalog is never renamed, so search,
 *     filtering and every other showcase are untouched.
 *
 * Both are optional and default to the existing behaviour, so a showcase
 * already sent to a client renders exactly as it did before.
 */
export const ShowcaseGroupingSettings: React.FC<ShowcaseGroupingSettingsProps> = ({
  showcase,
  items,
  onUpdateShowcase,
}) => {
  const categories = Array.from(new Set(items.map((i) => i.category)));
  const isGrouped = (showcase.layoutMode || 'grouped') === 'grouped';
  const labels = showcase.categoryLabels || {};
  const renamedCount = categories.filter((c) => (labels[c] || '').trim()).length;

  const setLabel = (category: string, value: string) => {
    const next = { ...labels };
    if (value) next[category] = value;
    else delete next[category];

    onUpdateShowcase({
      ...showcase,
      categoryLabels: Object.keys(next).length > 0 ? next : undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  const resetAllLabels = () => {
    onUpdateShowcase({
      ...showcase,
      categoryLabels: undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <>
      {/* 1. Show / hide the category heading row — only meaningful when
            the showcase is actually grouped into sections. */}
      {isGrouped && (
        <div className="space-y-2 sm:col-span-2">
          <label className="block font-space-grotesk font-semibold text-slate-700">
            Category Headings
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                onUpdateShowcase({
                  ...showcase,
                  hideGroupHeadings: false,
                  updatedAt: new Date().toISOString(),
                })
              }
              className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-space-grotesk font-bold border transition cursor-pointer ${
                !showcase.hideGroupHeadings
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Show Headings
              <span className="block font-normal opacity-80 text-[10px] mt-0.5">
                Each section keeps its title — safe default
              </span>
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateShowcase({
                  ...showcase,
                  hideGroupHeadings: true,
                  updatedAt: new Date().toISOString(),
                })
              }
              className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-space-grotesk font-bold border transition cursor-pointer ${
                showcase.hideGroupHeadings
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Hide Headings
              <span className="block font-normal opacity-80 text-[10px] mt-0.5">
                Still grouped in sections, just untitled
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Per-showcase category names. */}
      <div className="space-y-2 sm:col-span-2">
        <div className="flex items-center justify-between gap-2">
          <label className="block font-space-grotesk font-semibold text-slate-700">
            Category Names Shown to the Client
          </label>
          {renamedCount > 0 && (
            <button
              type="button"
              onClick={resetAllLabels}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset all ({renamedCount})</span>
            </button>
          )}
        </div>

        <p className="text-[10px] text-slate-400">
          Rename a category for this showcase only — your catalog keeps its original name, so search and
          every other showcase are unaffected. Leave a box empty to use the original name.
          {isGrouped
            ? ' These names appear on the section headings and the filter tabs.'
            : ' These names appear on the filter tabs.'}
        </p>

        {categories.length === 0 ? (
          <p className="text-[11px] text-slate-400 italic py-1">
            Add items to this showcase first — their categories will show up here to rename.
          </p>
        ) : (
          <div className="space-y-1.5">
            {categories.map((cat) => (
              <div key={cat} className="flex items-center gap-2">
                <span
                  className="w-2/5 shrink-0 truncate text-[11px] font-mono text-slate-500"
                  title={cat}
                >
                  {cat}
                </span>
                <span className="text-slate-300 shrink-0 text-xs">&rarr;</span>
                <input
                  type="text"
                  value={labels[cat] || ''}
                  placeholder={cat}
                  onChange={(e) => setLabel(cat, e.target.value)}
                  className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
