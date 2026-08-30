import React, { useState } from 'react';
import { Layers, Tag, Trash2, Edit3, FolderPlus, Sparkles, X, Save } from 'lucide-react';
import { PortfolioTemplate, PortfolioItem, Showcase, ThemeId } from '../types/portfolio';
import { savePortfolioTemplateToCloud, deletePortfolioTemplateFromCloud, slugify } from '../utils/storage';

interface PortfolioTemplatesLibraryProps {
  templates: PortfolioTemplate[];
  allItems: PortfolioItem[];
  onRefresh: () => void;
  onCreateShowcase: (showcase: Showcase) => void;
}

export const PortfolioTemplatesLibrary: React.FC<PortfolioTemplatesLibraryProps> = ({
  templates,
  allItems,
  onRefresh,
  onCreateShowcase,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTags, setEditTags] = useState('');
  const [quickCreateId, setQuickCreateId] = useState<string | null>(null);
  const [quickCreateName, setQuickCreateName] = useState('');

  const itemsById = React.useMemo(() => {
    const map = new Map<string, PortfolioItem>();
    allItems.forEach((i) => map.set(i.id, i));
    return map;
  }, [allItems]);

  const startEdit = (t: PortfolioTemplate) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditTags(t.tags.join(', '));
  };

  const saveEdit = async (t: PortfolioTemplate) => {
    await savePortfolioTemplateToCloud({
      ...t,
      name: editName.trim() || t.name,
      tags: editTags.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
      updatedAt: new Date().toISOString(),
    });
    setEditingId(null);
    onRefresh();
  };

  const handleDelete = async (t: PortfolioTemplate) => {
    if (!confirm(`Delete template "${t.name}"? This won't delete the portfolio items themselves.`)) return;
    await deletePortfolioTemplateFromCloud(t.id);
    onRefresh();
  };

  const handleQuickCreateShowcase = (t: PortfolioTemplate) => {
    const heading = quickCreateName.trim();
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${slugify(heading || t.name)}-${randomSuffix}`;
    const newShowcase: Showcase = {
      id: `showcase-${Date.now()}-${randomSuffix}`,
      slug,
      brand_name: heading || 'Aala Studio',
      heading: heading || t.name,
      tagline: `Curated case studies tailored for ${heading || t.name}`,
      logo_url: '',
      item_ids: t.item_ids,
      theme: 'indigo' as ThemeId,
      heroStyle: 'minimal-glow' as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onCreateShowcase(newShowcase);
    setQuickCreateId(null);
    setQuickCreateName('');
  };

  if (templates.length === 0) {
    return (
      <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 space-y-3">
        <Layers className="w-10 h-10 mx-auto text-slate-300" />
        <h3 className="font-space-grotesk font-bold text-slate-700">No Portfolio Templates Yet</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Go to the <strong>Showcases</strong> tab, select multiple portfolio items using the checkboxes,
          then click <strong>"Save as Template"</strong> — e.g. a "Therapy Clinic" or "School" set of
          case studies you can instantly reuse for similar future clients.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-space-grotesk font-bold text-xl text-slate-900">Portfolio Templates</h2>
        <p className="text-sm text-slate-500">
          Hand-curated item sets tagged by client vertical — reused instantly for similar clients, and
          matched first (before AI) when generating cover letters.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => {
          const previewItems = t.item_ids.slice(0, 4).map((id) => itemsById.get(id)).filter(Boolean) as PortfolioItem[];
          const isEditing = editingId === t.id;

          return (
            <div key={t.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
              <div className="grid grid-cols-4 gap-0.5 bg-slate-100">
                {previewItems.length > 0 ? (
                  previewItems.map((item) => (
                    <img key={item.id} src={item.thumb_small || item.thumb || ''} alt="" className="aspect-square object-cover" />
                  ))
                ) : (
                  <div className="col-span-4 aspect-[4/1] flex items-center justify-center text-slate-300 text-xs">No preview</div>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col gap-3">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full text-sm font-space-grotesk font-bold border border-slate-200 rounded-lg px-2.5 py-1.5"
                      placeholder="Template name"
                    />
                    <input
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className="w-full text-xs font-mono border border-slate-200 rounded-lg px-2.5 py-1.5"
                      placeholder="tags, comma, separated"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(t)}
                        className="flex-1 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h4 className="font-space-grotesk font-bold text-sm text-slate-900">{t.name}</h4>
                      <p className="text-[11px] font-mono text-slate-400">{t.item_ids.length} items</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {t.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-mono">
                          <Tag className="w-2.5 h-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {!isEditing && (
                  <div className="mt-auto pt-2 border-t border-slate-100 space-y-2">
                    {quickCreateId === t.id ? (
                      <div className="space-y-2">
                        <input
                          value={quickCreateName}
                          onChange={(e) => setQuickCreateName(e.target.value)}
                          placeholder="Client name (optional)"
                          className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleQuickCreateShowcase(t)}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                          >
                            Create
                          </button>
                          <button
                            onClick={() => setQuickCreateId(null)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setQuickCreateId(t.id)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        Create Showcase
                      </button>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(t)}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-semibold cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
