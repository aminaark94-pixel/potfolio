import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Folder, 
  FolderPlus, 
  ArrowRight, 
  Search, 
  Check, 
  X, 
  GripVertical, 
  CheckSquare, 
  Square, 
  Sparkles, 
  Layers, 
  ChevronRight,
  Edit3,
  ExternalLink,
  Tag
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PortfolioItem } from '../types/portfolio';

interface BulkCategoryMoverProps {
  allItems: PortfolioItem[];
  onBulkUpdateItems: (items: PortfolioItem[]) => Promise<void>;
  onOpenLightbox?: (item: PortfolioItem) => void;
  onEditItem?: (item: PortfolioItem) => void;
}

export const BulkCategoryMover: React.FC<BulkCategoryMoverProps> = ({
  allItems,
  onBulkUpdateItems,
  onOpenLightbox,
  onEditItem,
}) => {
  // ─── Categories & Stats ──────────────────────────────────
  const categoryStats = useMemo(() => {
    const map = new Map<string, { count: number; subcategories: Set<string> }>();
    allItems.forEach((item) => {
      const cat = item.category?.trim() || 'Uncategorized';
      if (!map.has(cat)) {
        map.set(cat, { count: 0, subcategories: new Set() });
      }
      const data = map.get(cat)!;
      data.count += 1;
      if (item.subcategory?.trim()) {
        data.subcategories.add(item.subcategory.trim());
      }
    });

    return Array.from(map.entries())
      .map(([name, stat]) => ({
        name,
        count: stat.count,
        subcategories: Array.from(stat.subcategories).sort(),
      }))
      .sort((a, b) => b.count - a.count);
  }, [allItems]);

  const allCategoryNames = useMemo(
    () => categoryStats.map((c) => c.name),
    [categoryStats]
  );

  // ─── Selected Categories ──────────────────────────────────
  const [sourceCategory, setSourceCategory] = useState<string>(() => {
    return categoryStats[0]?.name || '';
  });

  const [destinationCategory, setDestinationCategory] = useState<string>('');
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [destinationSubcategory, setDestinationSubcategory] = useState<string>('');

  // ─── Category Search Filter (at top) ──────────────────────
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');

  const filteredCategories = useMemo(() => {
    const q = categorySearchQuery.trim().toLowerCase();
    if (!q) return categoryStats;
    return categoryStats.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.subcategories.some((s) => s.toLowerCase().includes(q))
    );
  }, [categoryStats, categorySearchQuery]);

  // ─── Items in Source Category ─────────────────────────────
  const [sourceItemSearchQuery, setSourceItemSearchQuery] = useState<string>('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  const sourceItems = useMemo(() => {
    if (!sourceCategory) return [];
    return allItems.filter((i) => i.category === sourceCategory);
  }, [allItems, sourceCategory]);

  const filteredSourceItems = useMemo(() => {
    const q = sourceItemSearchQuery.trim().toLowerCase();
    if (!q) return sourceItems;
    return sourceItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.subcategory && i.subcategory.toLowerCase().includes(q)) ||
        (i.labels && i.labels.some((l) => l.toLowerCase().includes(q))) ||
        (i.keywords && i.keywords.some((k) => k.toLowerCase().includes(q)))
    );
  }, [sourceItems, sourceItemSearchQuery]);

  // ─── Items in Destination Category ────────────────────────
  const destinationItems = useMemo(() => {
    const target = isCreatingNewCategory ? newCategoryName.trim() : destinationCategory.trim();
    if (!target) return [];
    return allItems.filter((i) => i.category.toLowerCase() === target.toLowerCase());
  }, [allItems, isCreatingNewCategory, newCategoryName, destinationCategory]);

  // ─── Drag and Drop State ──────────────────────────────────
  const [draggedItemIds, setDraggedItemIds] = useState<string[]>([]);
  const [isDragOverDropzone, setIsDragOverDropzone] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // ─── Selection Helpers ────────────────────────────────────
  const toggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllSourceItems = () => {
    setSelectedItemIds(new Set(filteredSourceItems.map((i) => String(i.id))));
  };

  const clearSelection = () => {
    setSelectedItemIds(new Set());
  };

  // ─── Drag Handlers ────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    let idsToDrag: string[] = [];
    if (selectedItemIds.has(itemId)) {
      idsToDrag = Array.from(selectedItemIds);
    } else {
      idsToDrag = [itemId];
      setSelectedItemIds(new Set([itemId]));
    }
    setDraggedItemIds(idsToDrag);
    e.dataTransfer.setData('text/plain', JSON.stringify(idsToDrag));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItemIds([]);
    setIsDragOverDropzone(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOverDropzone) setIsDragOverDropzone(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverDropzone(false);
  };

  // ─── Move Execution ───────────────────────────────────────
  const executeMoveItems = async (itemIdsToMove: string[]) => {
    const targetCat = isCreatingNewCategory ? newCategoryName.trim() : destinationCategory.trim();

    if (!targetCat) {
      setStatusMessage({
        text: 'Please choose or enter a destination category first.',
        type: 'error',
      });
      return;
    }

    if (itemIdsToMove.length === 0) {
      setStatusMessage({
        text: 'No items selected to move.',
        type: 'error',
      });
      return;
    }

    if (targetCat.toLowerCase() === sourceCategory.toLowerCase()) {
      setStatusMessage({
        text: 'Destination category is identical to source category. Please select a different category.',
        type: 'error',
      });
      return;
    }

    setIsMoving(true);
    setStatusMessage(null);

    try {
      const targetSub = destinationSubcategory.trim() || undefined;
      const idsSet = new Set(itemIdsToMove.map(String));

      const itemsToUpdate = allItems.filter(
        (i) => idsSet.has(String(i.id))
      );

      const updatedItems: PortfolioItem[] = itemsToUpdate.map((item) => ({
        ...item,
        id: String(item.id),
        custom: true,
        category: targetCat,
        subcategory: targetSub,
      }));

      await onBulkUpdateItems(updatedItems);

      confetti({ particleCount: 50, spread: 60 });
      setStatusMessage({
        text: `Moved ${updatedItems.length} item${updatedItems.length > 1 ? 's' : ''} from "${sourceCategory}" to "${targetCat}"${targetSub ? ` (${targetSub})` : ''}!`,
        type: 'success',
      });

      // Clear selection
      setSelectedItemIds(new Set());
      setDraggedItemIds([]);
      setIsDragOverDropzone(false);

      // If new category was created, select it in destination
      if (isCreatingNewCategory) {
        setIsCreatingNewCategory(false);
        setDestinationCategory(targetCat);
        setNewCategoryName('');
      }
    } catch (err: any) {
      console.error('Failed to move items:', err);
      setStatusMessage({
        text: err?.message || 'Failed to move items. Please try again.',
        type: 'error',
      });
    } finally {
      setIsMoving(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverDropzone(false);

    try {
      const data = e.dataTransfer.getData('text/plain');
      let ids: string[] = [];
      if (data) {
        ids = JSON.parse(data);
      }
      if (!ids || ids.length === 0) {
        ids = draggedItemIds.length > 0 ? draggedItemIds : Array.from(selectedItemIds);
      }
      await executeMoveItems(ids);
    } catch (err) {
      if (draggedItemIds.length > 0) {
        await executeMoveItems(draggedItemIds);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-4 sm:px-6">
      {/* ─── Hero Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-[28px] bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden">
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-mono font-semibold text-indigo-200 border border-white/15">
            <Layers className="w-3.5 h-3.5" />
            <span>Studio Management Workspace</span>
          </div>
          <h1 className="font-archivo text-2xl sm:text-3xl font-extrabold tracking-tight">
            Bulk Category Mover
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200/90 font-space-grotesk max-w-xl">
            Effortlessly reorganize your portfolio. Pick a category, select individual or batch items, and drag &amp; drop them into any existing or new category.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
            <span className="block text-lg font-mono font-bold text-white">
              {categoryStats.length}
            </span>
            <span className="text-[11px] font-space-grotesk text-indigo-200 uppercase tracking-wider">
              Categories
            </span>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
            <span className="block text-lg font-mono font-bold text-white">
              {allItems.length}
            </span>
            <span className="text-[11px] font-space-grotesk text-indigo-200 uppercase tracking-wider">
              Total Works
            </span>
          </div>
        </div>
      </div>

      {/* ─── Status Feedback Alert ─── */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-sm ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm font-space-grotesk font-semibold">
              {statusMessage.type === 'success' ? (
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Category Finder / Quick Selector Bar ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <h2 className="font-space-grotesk font-bold text-xs uppercase tracking-wider text-slate-700">
              Find &amp; Select Source Category:
            </h2>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={categorySearchQuery}
              onChange={(e) => setCategorySearchQuery(e.target.value)}
              placeholder="Search category name..."
              className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-slate-200 text-xs font-space-grotesk focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {categorySearchQuery && (
              <button
                onClick={() => setCategorySearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Horizon */}
        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1 custom-scrollbar">
          {filteredCategories.map((cat) => {
            const isSelected = sourceCategory === cat.name;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => {
                  setSourceCategory(cat.name);
                  setSelectedItemIds(new Set());
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-space-grotesk font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                    : 'bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border-slate-200'
                }`}
              >
                <Folder className="w-3 h-3" />
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Main Two-Panel Workspace ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ─── LEFT PANEL: Source Category Items (7 cols) ─── */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col min-h-[600px] overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                  Source Category
                </span>
                <h3 className="font-archivo text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Folder className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="truncate">{sourceCategory || 'Select a Category'}</span>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    {sourceItems.length}
                  </span>
                </h3>
              </div>

              {/* Granular Selection Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedItemIds.size === filteredSourceItems.length) {
                      clearSelection();
                    } else {
                      selectAllSourceItems();
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-space-grotesk font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  {selectedItemIds.size > 0 && selectedItemIds.size === filteredSourceItems.length ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Deselect All</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                      <span>Select All ({filteredSourceItems.length})</span>
                    </>
                  )}
                </button>

                {selectedItemIds.size > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="px-2 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-space-grotesk font-semibold transition-colors cursor-pointer"
                  >
                    Clear ({selectedItemIds.size})
                  </button>
                )}
              </div>
            </div>

            {/* Filter inside source category */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3 h-3 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={sourceItemSearchQuery}
                  onChange={(e) => setSourceItemSearchQuery(e.target.value)}
                  placeholder={`Search in ${sourceCategory}...`}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-space-grotesk focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>

              {/* Quick Move Button */}
              <button
                type="button"
                disabled={selectedItemIds.size === 0 || isMoving}
                onClick={() => executeMoveItems(Array.from(selectedItemIds))}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-space-grotesk font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                title="Move selected items to destination category"
              >
                <span>Move ({selectedItemIds.size})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Draggable Items Grid */}
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto max-h-[640px] custom-scrollbar">
            {filteredSourceItems.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                <Folder className="w-10 h-10 text-slate-300 stroke-1" />
                <p className="text-xs font-space-grotesk font-medium">
                  No items found in {sourceCategory}.
                </p>
                <p className="text-[11px] text-slate-400">
                  Select a different category above.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredSourceItems.map((item) => {
                  const itemId = String(item.id);
                  const isSelected = selectedItemIds.has(itemId);
                  const isBeingDragged = draggedItemIds.includes(itemId);

                  return (
                    <div
                      key={itemId}
                      draggable
                      onDragStart={(e) => handleDragStart(e, itemId)}
                      onDragEnd={handleDragEnd}
                      onClick={() => toggleSelectItem(itemId)}
                      className={`group relative rounded-2xl border p-2 bg-white flex flex-col transition-all cursor-grab active:cursor-grabbing select-none ${
                        isSelected
                          ? 'border-indigo-500 ring-2 ring-indigo-200 shadow-md bg-indigo-50/20'
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      } ${isBeingDragged ? 'opacity-40 scale-95' : 'opacity-100'}`}
                    >
                      {/* Thumbnail Container */}
                      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 mb-2">
                        <img
                          src={item.thumb_small || item.thumb || ''}
                          alt={item.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                        />

                        {/* Top Left Selection Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectItem(itemId);
                          }}
                          className={`absolute top-1.5 left-1.5 p-1 rounded-md transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-black/50 hover:bg-black/70 text-white/80'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3 h-3 stroke-[3]" />
                          ) : (
                            <Square className="w-3 h-3" />
                          )}
                        </button>

                        {/* Top Right Drag Grip Icon */}
                        <span className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/50 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="w-3 h-3" />
                        </span>

                        {/* Subcategory Pill */}
                        {item.subcategory && (
                          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-slate-900/80 text-white truncate max-w-[90%]">
                            {item.subcategory}
                          </span>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="min-w-0 flex-1 flex flex-col justify-between">
                        <p
                          className="font-space-grotesk text-xs font-semibold text-slate-800 truncate"
                          title={item.name}
                        >
                          {item.name}
                        </p>

                        {/* Labels (if any) */}
                        {item.labels && item.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.labels.slice(0, 2).map((lbl) => (
                              <span
                                key={lbl}
                                className="text-[9px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-1 py-0.2 rounded"
                              >
                                #{lbl}
                              </span>
                            ))}
                            {item.labels.length > 2 && (
                              <span className="text-[8px] font-mono text-slate-400">
                                +{item.labels.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Instruction */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-[11px] font-mono text-slate-500">
            💡 Tip: Click items to select multiple, or drag any card directly to the right panel.
          </div>
        </div>

        {/* ─── RIGHT PANEL: Destination Category & Drop Target (5 cols) ─── */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col min-h-[600px] overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                  Target Workspace
                </span>
                <h3 className="font-archivo text-lg font-bold text-slate-900">
                  Destination Category
                </h3>
              </div>

              {/* Toggle Create New vs Choose Existing */}
              <button
                type="button"
                onClick={() => setIsCreatingNewCategory((v) => !v)}
                className={`text-xs font-space-grotesk font-bold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                  isCreatingNewCategory
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {isCreatingNewCategory ? 'Choose Existing' : '+ New Category'}
              </button>
            </div>

            {/* Destination Selector / Input */}
            {isCreatingNewCategory ? (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter brand new category name..."
                  className="w-full px-3.5 py-2 rounded-xl border border-indigo-300 focus:ring-2 focus:ring-indigo-500 text-xs font-space-grotesk text-slate-900 bg-white"
                  autoFocus
                />
                <input
                  type="text"
                  value={destinationSubcategory}
                  onChange={(e) => setDestinationSubcategory(e.target.value)}
                  placeholder="Subcategory (optional, e.g. Car, Minimalist)"
                  className="w-full px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-space-grotesk text-slate-700 bg-white"
                />
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <select
                  value={destinationCategory}
                  onChange={(e) => setDestinationCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-xs font-space-grotesk text-slate-900 bg-white font-semibold cursor-pointer"
                >
                  <option value="">-- Select Destination Category --</option>
                  {allCategoryNames.map((c) => (
                    <option key={c} value={c} disabled={c === sourceCategory}>
                      {c} {c === sourceCategory ? '(Current Source)' : ''}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={destinationSubcategory}
                  onChange={(e) => setDestinationSubcategory(e.target.value)}
                  placeholder="Subcategory override (optional)"
                  className="w-full px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-space-grotesk text-slate-700 bg-white"
                />
              </div>
            )}
          </div>

          {/* Interactive Drag & Drop Area */}
          <div className="p-4 sm:p-5 flex-1 flex flex-col space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative flex-1 min-h-[220px] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center transition-all ${
                isDragOverDropzone
                  ? 'border-indigo-600 bg-indigo-50/80 scale-[1.01] shadow-lg shadow-indigo-100 ring-4 ring-indigo-100'
                  : destinationCategory || newCategoryName
                  ? 'border-indigo-200 bg-indigo-50/20 hover:border-indigo-400'
                  : 'border-slate-200 bg-slate-50/60'
              }`}
            >
              <div className="space-y-3 max-w-sm pointer-events-none">
                <div
                  className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center transition-transform ${
                    isDragOverDropzone
                      ? 'bg-indigo-600 text-white scale-110 shadow-lg'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  <FolderPlus className="w-7 h-7" />
                </div>

                <div>
                  <h4 className="font-archivo text-base font-bold text-slate-900">
                    {isDragOverDropzone
                      ? 'Drop Now to Reassign!'
                      : 'Drag & Drop Items Here'}
                  </h4>
                  <p className="text-xs text-slate-500 font-space-grotesk mt-1">
                    {isCreatingNewCategory
                      ? newCategoryName.trim()
                        ? `Drop here to move into "${newCategoryName.trim()}"`
                        : 'Enter a new category name above'
                      : destinationCategory
                      ? `Drop here to move into "${destinationCategory}"`
                      : 'Select a destination category above first'}
                  </p>
                </div>

                {selectedItemIds.size > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-mono font-bold">
                    <span>{selectedItemIds.size} item{selectedItemIds.size > 1 ? 's' : ''} ready to move</span>
                  </div>
                )}
              </div>
            </div>

            {/* One-Click Action Button */}
            <button
              type="button"
              disabled={
                selectedItemIds.size === 0 ||
                (!destinationCategory && !newCategoryName.trim()) ||
                isMoving
              }
              onClick={() => executeMoveItems(Array.from(selectedItemIds))}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-space-grotesk font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-200 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isMoving
                  ? 'Moving Items...'
                  : `Move ${selectedItemIds.size} Selected Item${
                      selectedItemIds.size > 1 ? 's' : ''
                    } to ${
                      isCreatingNewCategory
                        ? `"${newCategoryName.trim() || 'New Category'}"`
                        : `"${destinationCategory || 'Destination'}"`
                    }`}
              </span>
            </button>

            {/* Destination Category Items Preview (if existing category chosen) */}
            {destinationItems.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>Currently in this category:</span>
                  <span className="font-bold text-indigo-700">
                    {destinationItems.length} items
                  </span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {destinationItems.slice(0, 10).map((it) => (
                    <div
                      key={it.id}
                      className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 relative group"
                      title={it.name}
                    >
                      <img
                        src={it.thumb_small || it.thumb || ''}
                        alt={it.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {destinationItems.length > 10 && (
                    <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-[10px] font-mono text-slate-400 shrink-0">
                      +{destinationItems.length - 10}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
