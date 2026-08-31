import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  ExternalLink, 
  Plus, 
  Check, 
  Eye, 
  Filter, 
  Tag, 
  Folder,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { PortfolioItem, Showcase } from '../types/portfolio';
import { THEMES } from '../data/themes';

interface CatalogExplorerProps {
  items: PortfolioItem[];
  showcases: Record<string, Showcase>;
  activeSlug: string;
  onUpdateShowcase: (updated: Showcase) => void;
  onOpenLightbox: (item: PortfolioItem) => void;
  onOpenCustomItemModal: () => void;
}

export const CatalogExplorer: React.FC<CatalogExplorerProps> = ({
  items,
  showcases,
  activeSlug,
  onUpdateShowcase,
  onOpenLightbox,
  onOpenCustomItemModal,
}) => {
  const currentShowcase = showcases[activeSlug] || Object.values(showcases)[0];
  const theme = currentShowcase ? THEMES[currentShowcase.theme] || THEMES.rust : THEMES.rust;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('All');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'image' | 'video' | 'gif' | 'pdf'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(36);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: items.length };
    items.forEach((i) => {
      counts[i.category] = (counts[i.category] || 0) + 1;
    });
    return counts;
  }, [items]);

  const categories = useMemo(() => {
    return ['All', ...Object.keys(categoryCounts).filter((k) => k !== 'All').sort()];
  }, [categoryCounts]);

  // Subcategories that exist within the currently selected category, e.g.
  // "Logos & Monograms" -> Car, Dental, Gym... Resets when category changes.
  const subcategories = useMemo(() => {
    if (selectedCategory === 'All') return [];
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.category === selectedCategory && i.subcategory) set.add(i.subcategory);
    });
    return Array.from(set).sort();
  }, [items, selectedCategory]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchSubcat = selectedSubcategory === 'All' || item.subcategory === selectedSubcategory;
      const matchMedia = mediaFilter === 'all' || item.mediaType === mediaFilter;
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keywords.some((kw) => kw.toLowerCase().includes(q));

      return matchCat && matchSubcat && matchMedia && matchQuery;
    });
  }, [items, searchQuery, selectedCategory, selectedSubcategory, mediaFilter]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const handleToggleItem = (itemId: string) => {
    if (!currentShowcase) return;
    const exists = currentShowcase.item_ids.includes(itemId);
    const newItemIds = exists
      ? currentShowcase.item_ids.filter((id) => id !== itemId)
      : [...currentShowcase.item_ids, itemId];

    onUpdateShowcase({
      ...currentShowcase,
      item_ids: newItemIds,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50">
        <div>
          <h2 className="font-archivo text-2xl sm:text-3xl text-slate-900">
            Studio Portfolio Archive
          </h2>
          <p className="text-xs sm:text-sm font-mono text-slate-500 mt-1">
            Complete archive of {items.length} designs across {categories.length - 1} creative categories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCustomItemModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-space-grotesk text-xs font-bold shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload / Add Portfolio Design</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search all 1,300+ designs by name, keywords, client, category..."
            className="w-full bg-[#121217] border border-white/10 rounded-2xl pl-10 pr-10 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#C1502E] transition-all"
          />
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedSubcategory('All');
              setCurrentPage(1);
            }}
            className="w-full bg-[#121217] border border-white/10 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white font-space-grotesk focus:outline-none focus:border-[#C1502E]"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat} className="bg-[#121217]">
                {cat} ({categoryCounts[cat] || 0})
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={mediaFilter}
            onChange={(e) => {
              setMediaFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="w-full bg-[#121217] border border-white/10 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white font-space-grotesk focus:outline-none focus:border-[#C1502E]"
          >
            <option value="all" className="bg-[#121217]">All Formats</option>
            <option value="image" className="bg-[#121217]">Images / JPG / PNG</option>
            <option value="video" className="bg-[#121217]">Videos & MP4</option>
            <option value="gif" className="bg-[#121217]">GIF Animations</option>
            <option value="pdf" className="bg-[#121217]">PDFs & Guidelines</option>
          </select>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {categories.slice(0, 18).map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setSelectedCategory(cat);
              setSelectedSubcategory('All');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-space-grotesk font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-white text-black font-bold shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
            }`}
          >
            {cat} <span className="opacity-60 text-[10px]">({categoryCounts[cat] || 0})</span>
          </button>
        ))}
      </div>

      {/* Subcategory Pills — only shown once a category with subcategories is selected */}
      {subcategories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none pl-2">
          <span className="text-[10px] font-space-mono text-white/40 shrink-0">Type:</span>
          {['All', ...subcategories].map((sub) => (
            <button
              key={sub}
              onClick={() => {
                setSelectedSubcategory(sub);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-space-grotesk font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                selectedSubcategory === sub
                  ? 'bg-[#C1502E] text-white font-bold'
                  : 'bg-white/5 hover:bg-white/10 text-white/60 border border-white/10'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* Grid Header */}
      <div className="flex items-center justify-between text-xs font-mono text-white/50">
        <span>
          Showing {paginatedItems.length} of {filteredItems.length} items (Page {currentPage} of {totalPages})
        </span>

        <div className="flex items-center gap-2">
          <span>Items per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-[#181820] text-white border border-white/10 rounded-lg px-2 py-1 focus:outline-none"
          >
            <option value={24}>24</option>
            <option value={36}>36</option>
            <option value={48}>48</option>
            <option value={96}>96</option>
          </select>
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {paginatedItems.map((item) => {
          const inShowcase = currentShowcase?.item_ids.includes(item.id);

          return (
            <div
              key={item.id}
              className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col bg-[#121217] ${
                inShowcase
                  ? 'border-[#C1502E] ring-2 ring-[#C1502E]/30'
                  : 'border-white/10 hover:border-white/25 hover:shadow-xl'
              }`}
            >
              <div 
                onClick={() => onOpenLightbox(item)}
                className="relative aspect-[4/3] bg-black/60 overflow-hidden cursor-pointer"
              >
                <img
                  src={item.thumb_small || item.thumb || ''}
                  alt={item.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono text-white/80 border border-white/10">
                  {item.category}
                </span>

                {inShowcase && (
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-[#C1502E] text-white text-[10px] font-mono font-bold flex items-center gap-1 shadow-lg">
                    <Check className="w-3 h-3" />
                    In Showcase
                  </span>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <h4 
                    onClick={() => onOpenLightbox(item)}
                    className="font-space-grotesk font-semibold text-xs sm:text-sm text-white line-clamp-2 cursor-pointer hover:text-[#E8B796]"
                  >
                    {item.name}
                  </h4>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleToggleItem(item.id)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-space-grotesk font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                      inShowcase
                        ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                        : 'bg-[#C1502E] hover:bg-[#a74223] text-white shadow-lg shadow-[#C1502E]/20'
                    }`}
                  >
                    {inShowcase ? (
                      <>
                        <X className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Showcase</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onOpenLightbox(item)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10"
                    title="Preview full asset"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6 pb-12">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-white border border-white/10 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-xs font-mono text-white/70 px-4">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-white border border-white/10 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
