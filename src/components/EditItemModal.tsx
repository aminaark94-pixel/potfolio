import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Tag, Folder, Edit3, Check, Film, Image as ImageIcon, Sparkles } from 'lucide-react';
import { PortfolioItem, MediaType } from '../types/portfolio';

interface EditItemModalProps {
  isOpen: boolean;
  item: PortfolioItem | null;
  allItems: PortfolioItem[];
  onClose: () => void;
  onSave: (updatedItem: PortfolioItem) => Promise<void> | void;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  isOpen,
  item,
  allItems,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [labels, setLabels] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Extract all available categories from allItems
  const existingCategories = useMemo(() => {
    const cats = new Set<string>();
    allItems.forEach((it) => {
      if (it.category && it.category.trim()) {
        cats.add(it.category.trim());
      }
    });
    return Array.from(cats).sort();
  }, [allItems]);

  // Extract all existing labels from allItems for quick suggestions
  const suggestedLabels = useMemo(() => {
    const labelSet = new Set<string>();
    allItems.forEach((it) => {
      (it.labels || []).forEach((lbl) => {
        if (lbl && lbl.trim()) labelSet.add(lbl.trim().toLowerCase());
      });
      // also include top keywords as suggestions if few labels exist
      (it.keywords || []).slice(0, 2).forEach((kw) => {
        if (kw && kw.length > 2 && kw.length < 20) labelSet.add(kw.trim().toLowerCase());
      });
    });
    return Array.from(labelSet).slice(0, 15);
  }, [allItems]);

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setCategory(item.category || '');
      setSubcategory(item.subcategory || '');
      setMediaType(item.mediaType || 'image');
      setLabels(item.labels ? [...item.labels] : []);
      setIsCreatingNewCategory(false);
      setNewCategoryName('');
      setTagInput('');
      setErrorMsg(null);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleAddTag = (rawTag: string) => {
    if (!rawTag) return;
    const pieces = rawTag
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/^#+/, ''))
      .filter(Boolean);
    if (pieces.length === 0) return;
    setLabels((prev) => {
      const next = [...prev];
      pieces.forEach((p) => {
        if (!next.includes(p)) next.push(p);
      });
      return next;
    });
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setLabels((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Item name cannot be empty.');
      return;
    }

    const finalCategory = isCreatingNewCategory ? newCategoryName.trim() : category.trim();
    if (!finalCategory) {
      setErrorMsg('Please select or enter a category.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);

      // Auto-commit any text still typed in the tag input!
      const finalLabels = [...labels];
      if (tagInput.trim()) {
        const typedTags = tagInput
          .split(',')
          .map((t) => t.trim().toLowerCase().replace(/^#+/, ''))
          .filter(Boolean);
        typedTags.forEach((t) => {
          if (!finalLabels.includes(t)) {
            finalLabels.push(t);
          }
        });
      }

      // Merge labels into keywords as well so search finds them everywhere
      const mergedKeywords = Array.from(
        new Set([
          ...(item.keywords || []),
          ...finalLabels.map((l) => l.toLowerCase()),
          ...finalCategory.toLowerCase().split(/\s+/).filter(Boolean),
        ])
      );

      const updated: PortfolioItem = {
        ...item,
        id: String(item.id),
        name: name.trim(),
        category: finalCategory,
        subcategory: subcategory.trim() || undefined,
        mediaType,
        labels: finalLabels,
        keywords: mergedKeywords,
        custom: true, // mark custom so it overrides static catalog
      };

      await onSave(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-space-grotesk font-bold text-base text-slate-900">
                  Edit Portfolio Item
                </h3>
                <p className="text-xs text-slate-500">
                  Rename, change category, and add searchable labels
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
            {errorMsg && (
              <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            {/* Item Thumbnail Preview */}
            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-16 h-16 rounded-lg bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
                <img
                  src={item.thumb_small || item.thumb || ''}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Item ID: {item.id}</p>
                <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold">
                    {item.category}
                  </span>
                  {labels.length > 0 && (
                    <span className="text-[10px] font-mono text-slate-500">
                      {labels.length} label{labels.length > 1 ? 's' : ''} attached
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 1. Item Name / Rename */}
            <div className="space-y-1.5">
              <label className="block text-xs font-space-grotesk font-bold text-slate-700">
                File / Item Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Coo Kies Cookie Brand Identity & Packaging"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                required
              />
              <p className="text-[11px] text-slate-400">
                Rename this item to any title you prefer.
              </p>
            </div>

            {/* 2. Category Selection & Creation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-space-grotesk font-bold text-slate-700">
                  Category <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCreatingNewCategory(!isCreatingNewCategory)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  {isCreatingNewCategory ? '← Choose Existing Category' : '+ Create New Category'}
                </button>
              </div>

              {isCreatingNewCategory ? (
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-indigo-600 shrink-0" />
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Type new category name (e.g. 3D Packaging, AI UGC Ads)"
                      className="flex-1 px-3 py-2 rounded-lg border border-indigo-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-indigo-700">
                    This new category will be created and added to your entire portfolio filter list.
                  </p>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setIsCreatingNewCategory(true);
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  <option value="" disabled>Select a category...</option>
                  {existingCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__NEW__" className="font-bold text-indigo-600">
                    + Create New Category...
                  </option>
                </select>
              )}
            </div>

            {/* Optional Subcategory */}
            <div className="space-y-1.5">
              <label className="block text-xs font-space-grotesk font-bold text-slate-700">
                Subcategory <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="e.g. Minimalist, Modern, Healthcare, Tech"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            {/* 3. Searchable Labels / Tags */}
            <div className="space-y-2">
              <label className="block text-xs font-space-grotesk font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                <span>Searchable Labels & Tags</span>
              </label>

              {/* Tag Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes(',')) {
                      handleAddTag(val);
                    } else {
                      setTagInput(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(tagInput);
                    }
                  }}
                  onBlur={() => {
                    if (tagInput.trim()) {
                      handleAddTag(tagInput);
                    }
                  }}
                  placeholder="Type label (e.g. cookie, packaging, client-pick) and press Enter"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(tagInput)}
                  className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold font-space-grotesk transition-colors cursor-pointer border border-indigo-200"
                >
                  Add Label
                </button>
              </div>

              {/* Current Active Labels Badge Container */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 min-h-[46px] flex flex-wrap gap-1.5 items-center">
                {labels.length > 0 ? (
                  labels.map((lbl) => (
                    <span
                      key={lbl}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-medium shadow-sm"
                    >
                      <span>#{lbl}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(lbl)}
                        className="hover:text-rose-200 transition-colors ml-0.5 cursor-pointer"
                        title="Remove tag"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Type a label above (e.g. cookie, packaging) and it will appear here as a tag!
                  </p>
                )}
              </div>

              {/* Quick suggestions */}
              {suggestedLabels.length > 0 && (
                <div className="pt-1">
                  <p className="text-[10px] font-space-grotesk uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Quick Suggested Labels:
                  </p>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {suggestedLabels
                      .filter((s) => !labels.includes(s))
                      .slice(0, 8)
                      .map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => handleAddTag(sug)}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-[11px] font-mono text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                        >
                          +{sug}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Media Type Selection */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="block text-xs font-space-grotesk font-bold text-slate-700">
                Media Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['image', 'video', 'gif'] as MediaType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMediaType(type)}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium capitalize flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      mediaType === type
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {type === 'video' ? (
                      <Film className="w-3.5 h-3.5" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5" />
                    )}
                    <span>{type}</span>
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold font-space-grotesk transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold font-space-grotesk transition-all shadow-md shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
