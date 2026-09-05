import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Download, 
  ExternalLink, 
  Search, 
  Check, 
  X, 
  Sliders, 
  Layers, 
  Eye, 
  Palette, 
  Lock, 
  Sparkles, 
  RefreshCw, 
  Folder, 
  Tag, 
  Share2, 
  CheckSquare, 
  Square,
  FileCode,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Filter
} from 'lucide-react';
import { Showcase, PortfolioItem, ThemeId, HeroStyle, PortfolioTemplate } from '../types/portfolio';
import { THEMES } from '../data/themes';
import {
  slugify,
  generateStandaloneHTML,
  loadPortfolioTemplatesFromCloud,
  savePortfolioTemplateToCloud,
  deletePortfolioTemplateFromCloud,
  bulkUpdateCustomItemsCategory,
  getLastDriveSyncTime,
  setLastDriveSyncTime,
} from '../utils/storage';
import { detectMediaType, getDriveThumb } from '../data/rawPortfolioData';
import {
  connectGoogleDriveAccount,
  scanDriveForNewItems,
  requestDriveAccessToken,
  DriveScannedFile,
} from '../utils/googleDrive';
import { CoverLetterTab } from './CoverLetterTab';
import { PortfolioTemplatesLibrary } from './PortfolioTemplatesLibrary';
import { DriveLinksTab } from './DriveLinksTab';
import confetti from 'canvas-confetti';

function extractDriveFileId(driveLink: string | null | undefined): string | null {
  if (!driveLink) return null;
  const m1 = driveLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m1 && m1[1]) return m1[1];
  const m2 = driveLink.match(/id=([a-zA-Z0-9_-]+)/);
  if (m2 && m2[1]) return m2[1];
  return null;
}

interface AdminPanelProps {
  showcases: Record<string, Showcase>;
  activeSlug: string;
  allItems: PortfolioItem[];
  onSelectShowcase: (slug: string) => void;
  onUpdateShowcase: (updated: Showcase) => void;
  onCreateShowcase: (newShowcase: Showcase) => void;
  onDeleteShowcase: (slug: string) => void;
  onOpenClientView: () => void;
  onOpenLightbox: (item: PortfolioItem) => void;
  onOpenCustomItemModal: () => void;
  onOpenDownloadModal: () => void;
  onBulkAddItems: (items: PortfolioItem[]) => Promise<void>;
  onDeleteCustomItem: (itemId: string) => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  showcases,
  activeSlug,
  allItems,
  onSelectShowcase,
  onUpdateShowcase,
  onCreateShowcase,
  onDeleteShowcase,
  onOpenClientView,
  onOpenLightbox,
  onOpenCustomItemModal,
  onOpenDownloadModal,
  onBulkAddItems,
  onDeleteCustomItem,
}) => {
  const currentShowcase = showcases[activeSlug] || Object.values(showcases)[0];
  const theme = currentShowcase ? THEMES[currentShowcase.theme] || THEMES.rust : THEMES.rust;

  // Showcase Creator form state
  const [isCreatingShowcase, setIsCreatingShowcase] = useState(false);
  const [newBrandName, setNewBrandName] = useState('My Studio');
  const [newClientHeading, setNewClientHeading] = useState('');
  const [newTagline, setNewTagline] = useState('A selection of work, put together specifically for you.');
  const [newTheme, setNewTheme] = useState<ThemeId>('rust');

  // Top-level section switcher: Showcases workspace vs Cover Letter generator vs Templates
  const [activeSection, setActiveSection] = useState<'showcases' | 'coverletter' | 'templates' | 'drivelinks'>('showcases');

  // Bulk-select state for the manual catalog picker
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [bulkCategoryValue, setBulkCategoryValue] = useState('');
  const [bulkSubcategoryValue, setBulkSubcategoryValue] = useState('');
  const [isSavingAsTemplate, setIsSavingAsTemplate] = useState(false);
  const [templateFormName, setTemplateFormName] = useState('');
  const [templateFormTags, setTemplateFormTags] = useState('');
  const [portfolioTemplates, setPortfolioTemplates] = useState<PortfolioTemplate[]>([]);
  const [addToTemplateId, setAddToTemplateId] = useState('');
  const [bulkActionMessage, setBulkActionMessage] = useState<string | null>(null);

  React.useEffect(() => {
    loadPortfolioTemplatesFromCloud().then(setPortfolioTemplates);
  }, []);

  const toggleItemSelected = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedItemIds(new Set());

  const refreshTemplates = async () => {
    const t = await loadPortfolioTemplatesFromCloud();
    setPortfolioTemplates(t);
  };

  // Search & Catalog Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('All');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'image' | 'video' | 'gif' | 'pdf'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [exportedHtml, setExportedHtml] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Drive Sync State
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [isRefreshingThumbs, setIsRefreshingThumbs] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string>('');
  const [syncResultMessage, setSyncResultMessage] = useState<string | null>(null);

  const handleSyncFromDrive = async () => {
    setIsSyncingDrive(true);
    setSyncResultMessage(null);
    setSyncStatusMessage('Connecting to Google Drive...');
    try {
      // Reuse the cached token (and its permissions) if it's still valid —
      // only prompt for login again once it has actually expired (~1 hour,
      // a hard Google OAuth limit) or was never granted. Previously this
      // force-cleared the token and re-prompted on every single sync.
      let token: string;
      try {
        token = await requestDriveAccessToken();
      } catch {
        const auth = await connectGoogleDriveAccount(false);
        token = auth.token;
      }

      const existingFileIds = new Set<string>();
      allItems.forEach((item) => {
        const fid = extractDriveFileId(item.drive_link);
        if (fid) existingFileIds.add(fid);
      });

      // Only ask Drive for files changed since the last successful sync —
      // this is what makes repeat syncs fast instead of re-listing every
      // file in every folder each time. First-ever sync has no timestamp
      // yet, so it still does one full scan.
      const lastSyncedAt = await getLastDriveSyncTime();
      setSyncStatusMessage(
        lastSyncedAt ? 'Checking for files added since your last sync...' : 'First sync — scanning everything...'
      );
      // Captured BEFORE scanning starts, so a file modified mid-scan still
      // gets picked up next time rather than silently skipped.
      const scanStartedAt = new Date().toISOString();

      const found: DriveScannedFile[] = await scanDriveForNewItems(
        token,
        existingFileIds,
        (msg) => setSyncStatusMessage(msg),
        lastSyncedAt || undefined
      );

      if (found.length === 0) {
        setSyncResultMessage('Drive is already fully synced — no new files found.');
        await setLastDriveSyncTime(scanStartedAt);
      } else {
        const newItems: PortfolioItem[] = found.map((f) => {
          const mediaType = detectMediaType(f.name, f.webViewLink);
          return {
            id: 'drive-sync-' + f.fileId,
            name: f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
            category: f.category,
            subcategory: f.subcategory,
            drive_link: f.webViewLink,
            behance_link: null,
            thumb: getDriveThumb(f.webViewLink, 800) || f.thumbnailLink || null,
            thumb_small: getDriveThumb(f.webViewLink, 400) || f.thumbnailLink || null,
            thumb_large: getDriveThumb(f.webViewLink, 1400) || f.thumbnailLink || null,
            mediaType,
            keywords: [f.category.toLowerCase(), ...(f.subcategory ? [f.subcategory.toLowerCase()] : []), 'drive sync'],
            custom: true,
          };
        });
        await onBulkAddItems(newItems);
        await setLastDriveSyncTime(scanStartedAt);
        setSyncResultMessage(`Added ${newItems.length} new item${newItems.length === 1 ? '' : 's'} found in Drive — saved permanently, they won't be re-scanned next sync.`);
      }
    } catch (err: any) {
      console.error('Drive sync error', err);
      setSyncResultMessage(err.message || 'Could not sync with Google Drive, or the save failed — nothing was permanently saved. Please try again.');
    } finally {
      setIsSyncingDrive(false);
      setSyncStatusMessage('');
      setTimeout(() => setSyncResultMessage(null), 6000);
    }
  };

  // One-time migration button: regenerates thumb/thumb_small/thumb_large
  // for every existing custom item using the current getDriveThumb logic.
  // Needed because thumbnail URLs are stored (not recomputed live), so a
  // fix to getDriveThumb only affects NEWLY added items until this runs.
  const handleRefreshThumbnails = async () => {
    const customItems = allItems.filter((i) => i.custom && i.drive_link);
    if (customItems.length === 0) {
      setSyncResultMessage('No custom items to refresh.');
      return;
    }
    if (!confirm(`Regenerate thumbnails for ${customItems.length} existing item(s)? This fixes pixelation on long/tall images (like brand guides) that were added before the fix.`)) {
      return;
    }

    setIsRefreshingThumbs(true);
    setSyncResultMessage(null);
    try {
      const refreshed = customItems.map((item) => ({
        ...item,
        thumb: getDriveThumb(item.drive_link, 800) || item.thumb,
        thumb_small: getDriveThumb(item.drive_link, 400) || item.thumb_small,
        thumb_large: getDriveThumb(item.drive_link, 1400) || item.thumb_large,
      }));
      await onBulkAddItems(refreshed);
      setSyncResultMessage(`Refreshed thumbnails for ${refreshed.length} item(s) — reload the showcase to see the fix.`);
    } catch (err: any) {
      console.error('Thumbnail refresh error', err);
      setSyncResultMessage(err.message || 'Could not refresh thumbnails. Please try again.');
    } finally {
      setIsRefreshingThumbs(false);
    }
  };

  // Categories list with counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: allItems.length };
    allItems.forEach((i) => {
      counts[i.category] = (counts[i.category] || 0) + 1;
    });
    return counts;
  }, [allItems]);

  const categories = useMemo(() => {
    return ['All', ...Object.keys(categoryCounts).filter((k) => k !== 'All').sort()];
  }, [categoryCounts]);

  // Subcategories within the currently selected category (e.g. Logos & Monograms -> Car, Dental...)
  const subcategories = useMemo(() => {
    if (selectedCategory === 'All') return [];
    const set = new Set<string>();
    allItems.forEach((i) => {
      if (i.category === selectedCategory && i.subcategory) set.add(i.subcategory);
    });
    return Array.from(set).sort();
  }, [allItems, selectedCategory]);

  // Filtered Catalog Items
  const filteredCatalog = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allItems.filter((item) => {
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
  }, [allItems, searchQuery, selectedCategory, selectedSubcategory, mediaFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredCatalog.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCatalog.slice(start, start + pageSize);
  }, [filteredCatalog, currentPage, pageSize]);

  // Selected items in current showcase
  const selectedItems = useMemo(() => {
    if (!currentShowcase) return [];
    return currentShowcase.item_ids
      .map((id) => allItems.find((i) => i.id === id))
      .filter(Boolean) as PortfolioItem[];
  }, [currentShowcase, allItems]);

  const handleCreateShowcaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientHeading.trim()) return;

    const slug = slugify(newClientHeading) + '-' + Math.random().toString(36).substring(2, 6);
    const newSc: Showcase = {
      id: 'showcase-' + Date.now(),
      slug,
      brand_name: newBrandName.trim() || 'My Studio',
      heading: newClientHeading.trim(),
      tagline: newTagline.trim(),
      logo_url: '',
      item_ids: [],
      theme: newTheme,
      heroStyle: 'fluid-blob',
      clientNote: '',
      ctaText: 'Approve & Get Started',
      ctaLink: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      feedback: {},
    };

    onCreateShowcase(newSc);
    setIsCreatingShowcase(false);
    setNewClientHeading('');
    confetti({ particleCount: 50, spread: 60 });
  };

  const handleToggleItemInShowcase = (itemId: string) => {
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

  // Moves the item at `index` earlier (direction -1) or later (direction 1)
  // in the showcase's item_ids order, which is exactly the order clients
  // see them rendered in (see ClientShowcaseView's showcaseItems).
  const handlePermanentDeleteItem = async (item: PortfolioItem) => {
    if (!confirm(`Permanently delete "${item.name}"? This removes it from the catalog and every showcase — it cannot be undone.`)) {
      return;
    }
    try {
      await onDeleteCustomItem(item.id);
    } catch (e: any) {
      alert(e?.message || 'Could not delete this item. Please try again.');
    }
  };

  const handleMoveItemInShowcase = (index: number, direction: -1 | 1) => {
    if (!currentShowcase) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentShowcase.item_ids.length) return;

    const newItemIds = [...currentShowcase.item_ids];
    [newItemIds[index], newItemIds[targetIndex]] = [newItemIds[targetIndex], newItemIds[index]];

    onUpdateShowcase({
      ...currentShowcase,
      item_ids: newItemIds,
      updatedAt: new Date().toISOString(),
    });
  };

  // Reorders items by dropping one at an arbitrary target index (drag &
  // drop), as opposed to handleMoveItemInShowcase which only swaps by one.
  const handleReorderByDrag = (fromIndex: number, toIndex: number) => {
    if (!currentShowcase || fromIndex === toIndex) return;
    const newItemIds = [...currentShowcase.item_ids];
    const [moved] = newItemIds.splice(fromIndex, 1);
    newItemIds.splice(toIndex, 0, moved);

    onUpdateShowcase({
      ...currentShowcase,
      item_ids: newItemIds,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddAllOnPage = () => {
    if (!currentShowcase) return;
    const idsToAdd = paginatedItems.map((i) => i.id);
    const set = new Set([...currentShowcase.item_ids, ...idsToAdd]);
    onUpdateShowcase({
      ...currentShowcase,
      item_ids: Array.from(set),
      updatedAt: new Date().toISOString(),
    });
    confetti({ particleCount: 40, spread: 40 });
  };

  const handleClearAllSelected = () => {
    if (!currentShowcase) return;
    if (confirm('Clear all curated items from this showcase?')) {
      onUpdateShowcase({
        ...currentShowcase,
        item_ids: [],
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleExportHtml = () => {
    if (!currentShowcase) return;
    const htmlString = generateStandaloneHTML(currentShowcase, allItems);
    const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentShowcase.slug}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportedHtml(true);
    setTimeout(() => setExportedHtml(false), 2500);
  };

  const handleCopyClientLink = () => {
    if (!currentShowcase) return;
    const url = `${window.location.origin}${window.location.pathname}#showcase=${currentShowcase.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Section Tabs */}
      <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-slate-100 border border-slate-200">
        <button
          onClick={() => setActiveSection('showcases')}
          className={`px-4 py-2 rounded-xl text-xs font-space-grotesk font-bold transition-all cursor-pointer ${
            activeSection === 'showcases'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Showcases
        </button>
        <button
          onClick={() => setActiveSection('coverletter')}
          className={`px-4 py-2 rounded-xl text-xs font-space-grotesk font-bold transition-all cursor-pointer ${
            activeSection === 'coverletter'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Cover Letter Generator
        </button>
        <button
          onClick={() => setActiveSection('templates')}
          className={`px-4 py-2 rounded-xl text-xs font-space-grotesk font-bold transition-all cursor-pointer ${
            activeSection === 'templates'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Portfolio Templates
        </button>
        <button
          onClick={() => setActiveSection('drivelinks')}
          className={`px-4 py-2 rounded-xl text-xs font-space-grotesk font-bold transition-all cursor-pointer ${
            activeSection === 'drivelinks'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Drive Links
        </button>
      </div>

      {activeSection === 'drivelinks' && (
        <DriveLinksTab
          onItemsAdded={(items) => {
            onBulkAddItems(items);
          }}
          onItemsAddedToShowcase={(items) => {
            onBulkAddItems(items);
            if (currentShowcase) {
              onUpdateShowcase({
                ...currentShowcase,
                item_ids: [...items.map((i) => i.id), ...currentShowcase.item_ids],
              });
            }
          }}
          activeShowcaseName={currentShowcase?.heading}
          existingCategories={Array.from(new Set(allItems.map((i) => i.category))).sort()}
        />
      )}

      {activeSection === 'coverletter' && (
        <CoverLetterTab
          onShowcaseCreated={onUpdateShowcase}
          onNavigateToShowcase={(slug) => {
            onSelectShowcase(slug);
            setActiveSection('showcases');
            onOpenClientView();
          }}
        />
      )}

      {activeSection === 'templates' && (
        <PortfolioTemplatesLibrary
          templates={portfolioTemplates}
          allItems={allItems}
          onRefresh={refreshTemplates}
          onCreateShowcase={(showcase) => {
            onCreateShowcase(showcase);
            setActiveSection('showcases');
          }}
        />
      )}

      {activeSection === 'showcases' && (
      <>
      {/* Studio Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-[28px] bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white shadow-xl shadow-indigo-200/60 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className="font-archivo text-2xl sm:text-3xl text-white tracking-tight">
              Studio Manager
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/20 text-white border border-white/25 backdrop-blur-md">
              Sleek Pro Hub
            </span>
          </div>
          <p className="text-xs sm:text-sm font-space-grotesk text-indigo-100 mt-1 max-w-xl">
            Curate custom client showcases, pick sleek themes, and export standalone .html presentations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <button
            onClick={() => setIsCreatingShowcase(!isCreatingShowcase)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-space-grotesk text-xs font-bold shadow-md shadow-indigo-900/20 transition-all hover:scale-105 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>Create New Showcase</span>
          </button>

          <button
            onClick={onOpenCustomItemModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/40 hover:bg-indigo-500/60 border border-white/20 text-white font-space-grotesk text-xs font-semibold transition-all hover:scale-105 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-300" />
            <span>Upload / Add Portfolio Design</span>
          </button>

          <button
            onClick={handleSyncFromDrive}
            disabled={isSyncingDrive}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/40 hover:bg-indigo-500/60 border border-white/20 text-white font-space-grotesk text-xs font-semibold transition-all hover:scale-105 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-300 ${isSyncingDrive ? 'animate-spin' : ''}`} />
            <span>{isSyncingDrive ? (syncStatusMessage || 'Syncing...') : 'Sync from Drive'}</span>
          </button>

          <button
            onClick={handleRefreshThumbnails}
            disabled={isRefreshingThumbs}
            title="Fixes pixelated thumbnails on long/tall images (like brand guides) added before the thumbnail fix"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/30 hover:bg-amber-500/50 border border-white/20 text-white font-space-grotesk text-xs font-semibold transition-all hover:scale-105 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <RefreshCw className={`w-4 h-4 text-amber-300 ${isRefreshingThumbs ? 'animate-spin' : ''}`} />
            <span>{isRefreshingThumbs ? 'Refreshing...' : 'Fix Pixelated Thumbnails'}</span>
          </button>
        </div>
      </div>

      {syncResultMessage && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-space-grotesk">
          {syncResultMessage}
        </div>
      )}

      {/* CREATE NEW SHOWCASE ACCORDION/FORM */}
      <AnimatePresence>
        {isCreatingShowcase && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleCreateShowcaseSubmit}
              className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-space-grotesk font-bold text-base text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Create New Client Showcase</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingShowcase(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-space-grotesk font-semibold text-slate-700 mb-1">
                    Your Studio / Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
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
                    value={newClientHeading}
                    onChange={(e) => setNewClientHeading(e.target.value)}
                    placeholder="e.g. Zenith Hospitality Group"
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
                  value={newTagline}
                  onChange={(e) => setNewTagline(e.target.value)}
                  placeholder="A selection of work, put together specifically for you."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                />
              </div>

              {/* Theme Selector Swatches */}
              <div className="space-y-2 text-xs">
                <label className="block font-space-grotesk font-semibold text-slate-700">
                  Initial Showcase Color Theme
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.values(THEMES).map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setNewTheme(th.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        newTheme === th.id
                          ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: th.accent }}
                      />
                      <span className="text-[11px] font-space-grotesk font-medium text-slate-800 truncate">
                        {th.name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingShowcase(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-space-grotesk font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-space-grotesk font-bold text-xs shadow-lg shadow-indigo-200 cursor-pointer"
                >
                  Create Showcase
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SHOWCASE SETTINGS & CURATION CONTROLS */}
      {currentShowcase && (
        <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/80 space-y-6 shadow-sm">
          {/* Top Bar: Selector & Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Currently Editing Showcase
              </span>
              <div className="flex items-center gap-3">
                <select
                  value={activeSlug}
                  onChange={(e) => onSelectShowcase(e.target.value)}
                  className="bg-slate-50 text-slate-900 font-space-grotesk font-bold text-lg rounded-xl px-3.5 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                >
                  {(Object.entries(showcases) as [string, Showcase][]).map(([slug, sc]) => (
                    <option key={slug} value={slug} className="bg-white text-slate-900">
                      {sc.heading || 'Showcase'} ({sc.item_ids.length} items)
                    </option>
                  ))}
                </select>
                <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                  /{currentShowcase.slug}
                </span>
              </div>
            </div>

            {/* Showcase Action Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Open Client View */}
              <button
                onClick={onOpenClientView}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-space-grotesk font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
                style={{
                  backgroundColor: theme.accent,
                  boxShadow: `0 4px 14px ${theme.accentGlow}`,
                }}
              >
                <Eye className="w-4 h-4" />
                <span>Launch Client View</span>
              </button>

              {/* Export Standalone HTML */}
              <button
                onClick={handleExportHtml}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-space-grotesk text-xs font-semibold transition-all cursor-pointer"
                title="Download single .html file that runs offline without any server"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>{exportedHtml ? 'Exported .HTML!' : 'Export HTML File'}</span>
              </button>

              {/* Copy Link */}
              <button
                onClick={handleCopyClientLink}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-mono transition-all cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copiedLink ? 'Copied Link' : 'Copy Link'}</span>
              </button>

              {/* Delete Showcase */}
              {Object.keys(showcases).length > 1 && (
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${currentShowcase.heading}"?`)) {
                      onDeleteShowcase(currentShowcase.slug);
                    }
                  }}
                  className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer"
                  title="Delete this showcase"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Showcase Configuration Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-space-grotesk font-semibold text-slate-700 mb-1">
                Studio / Brand Name
              </label>
              <input
                type="text"
                value={currentShowcase.brand_name}
                onChange={(e) =>
                  onUpdateShowcase({ ...currentShowcase, brand_name: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-space-grotesk font-semibold text-slate-700 mb-1">
                Client Name
              </label>
              <input
                type="text"
                placeholder="Leave blank for a generic link"
                value={currentShowcase.heading}
                onChange={(e) =>
                  onUpdateShowcase({ ...currentShowcase, heading: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1 font-space-mono">
                Client view shows "Personalized Portfolio for {'{Client Name}'}" — or "Custom Portfolio" if left blank.
              </p>
            </div>

            <div>
              <label className="block font-space-grotesk font-semibold text-slate-700 mb-1">
                Logo Image URL (Optional)
              </label>
              <input
                type="text"
                value={currentShowcase.logo_url}
                onChange={(e) =>
                  onUpdateShowcase({ ...currentShowcase, logo_url: e.target.value })
                }
                placeholder="Direct image link (leave blank for default mark)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-space-grotesk font-semibold text-slate-700 mb-1">
                Tagline / Pitch Subheading
              </label>
              <input
                type="text"
                value={currentShowcase.tagline}
                onChange={(e) =>
                  onUpdateShowcase({ ...currentShowcase, tagline: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-space-grotesk font-semibold text-slate-700 mb-1">
                Personal Welcome Message for Client (Optional)
              </label>
              <input
                type="text"
                value={currentShowcase.clientNote || ''}
                onChange={(e) =>
                  onUpdateShowcase({ ...currentShowcase, clientNote: e.target.value })
                }
                placeholder="e.g. Excited to share these brand concepts crafted for your launch..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Theme Palette & Hero Style Selector */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 text-xs">
            {/* Color Theme */}
            <div className="space-y-2">
              <label className="block font-space-grotesk font-semibold text-slate-700 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-600" />
                <span>Presentation Color Theme</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.values(THEMES).map((th) => (
                  <button
                    key={th.id}
                    onClick={() =>
                      onUpdateShowcase({ ...currentShowcase, theme: th.id })
                    }
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      currentShowcase.theme === th.id
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: th.accent }}
                    />
                    <span className="text-[11px] font-space-grotesk font-medium text-slate-800 truncate">
                      {th.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Hero Style & Security */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="block font-space-grotesk font-semibold text-slate-700">
                  Hero Style
                </label>
                <select
                  value={currentShowcase.heroStyle}
                  onChange={(e) =>
                    onUpdateShowcase({
                      ...currentShowcase,
                      heroStyle: e.target.value as HeroStyle,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-space-grotesk focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="fluid-blob">Liquid Fluid Blob (Organic)</option>
                  <option value="cyber-grid">Cyber Glow Grid (Tech)</option>
                  <option value="minimal-glow">Minimalist Ambient (Clean)</option>
                </select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label className="block font-space-grotesk font-semibold text-slate-700">
                  Gallery Layout (when client views "All")
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateShowcase({ ...currentShowcase, layoutMode: 'grouped' })}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-space-grotesk font-bold border transition cursor-pointer ${
                      (currentShowcase.layoutMode || 'grouped') === 'grouped'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Grouped by Category
                    <span className="block font-normal opacity-80 text-[10px] mt-0.5">Sections with headers per category</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateShowcase({ ...currentShowcase, layoutMode: 'flow' })}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-space-grotesk font-bold border transition cursor-pointer ${
                      currentShowcase.layoutMode === 'flow'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    One Flowing Gallery
                    <span className="block font-normal opacity-80 text-[10px] mt-0.5">All items together, no category breaks</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label className="block font-space-grotesk font-semibold text-slate-700">
                  Hero Template
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateShowcase({ ...currentShowcase, heroTemplate: 'classic' })}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-space-grotesk font-bold border transition cursor-pointer ${
                      (currentShowcase.heroTemplate || 'classic') === 'classic'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Classic
                    <span className="block font-normal opacity-80 text-[10px] mt-0.5">The current hero — safe default</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateShowcase({ ...currentShowcase, heroTemplate: 'animated-mosaic' })}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-space-grotesk font-bold border transition cursor-pointer ${
                      currentShowcase.heroTemplate === 'animated-mosaic'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Animated Mosaic
                    <span className="block font-normal opacity-80 text-[10px] mt-0.5">Parallax image grid, gallery peeks below</span>
                  </button>
                </div>
                {currentShowcase.heroTemplate !== 'animated-mosaic' && (
                  <p className="text-[10px] text-slate-400">
                    Select "Animated Mosaic" to choose which images appear in it.
                  </p>
                )}
              </div>

              {currentShowcase.heroTemplate === 'animated-mosaic' && (
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-space-grotesk font-semibold text-slate-700">
                      Hero Collage Images
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {(currentShowcase.heroImageIds?.length || 0)} of 7 selected
                      </span>
                      {currentShowcase.heroImageIds && currentShowcase.heroImageIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onUpdateShowcase({ ...currentShowcase, heroImageIds: [] })}
                          className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          Reset to Auto
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-1">
                    Tap up to 7 images from this showcase to feature in the collage. Leave empty to auto-pick the first 7.
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {selectedItems.map((item) => {
                      const chosen = currentShowcase.heroImageIds?.includes(item.id) ?? false;
                      const atLimit = (currentShowcase.heroImageIds?.length || 0) >= 7;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={!chosen && atLimit}
                          onClick={() => {
                            const current = currentShowcase.heroImageIds || [];
                            const next = chosen
                              ? current.filter((id) => id !== item.id)
                              : [...current, item.id];
                            onUpdateShowcase({ ...currentShowcase, heroImageIds: next });
                          }}
                          title={item.name}
                          className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                            chosen ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <img
                            src={item.thumb_small || item.thumb || ''}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                          {chosen && (
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block font-space-grotesk font-semibold text-slate-700 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-500" />
                  <span>Access PIN / Password</span>
                </label>
                <input
                  type="text"
                  value={currentShowcase.pinProtection || ''}
                  onChange={(e) =>
                    onUpdateShowcase({ ...currentShowcase, pinProtection: e.target.value })
                  }
                  placeholder="Leave empty for public"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* CURATED ITEMS SUMMARY TRAY */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-space-grotesk font-bold text-sm text-slate-900">
                  Curated Work in this Showcase
                </h4>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100"
                >
                  {selectedItems.length} selected
                </span>
              </div>

              {selectedItems.length > 0 && (
                <button
                  onClick={handleClearAllSelected}
                  className="text-xs font-mono text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear all</span>
                </button>
              )}
            </div>

            {selectedItems.length === 0 ? (
              <p className="text-xs font-space-grotesk text-slate-400 italic py-2">
                No items added yet. Browse the catalog below and click &ldquo;+ Add to Showcase&rdquo; on any design item.
              </p>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto pb-2">
                {selectedItems.map((item, idx) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDraggedItemIndex(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedItemIndex !== null) {
                        handleReorderByDrag(draggedItemIndex, idx);
                      }
                      setDraggedItemIndex(null);
                    }}
                    onDragEnd={() => setDraggedItemIndex(null)}
                    className={`relative shrink-0 w-24 sm:w-28 group rounded-xl overflow-hidden border bg-slate-50 shadow-sm cursor-grab active:cursor-grabbing transition-opacity ${
                      draggedItemIndex === idx ? 'opacity-40 border-indigo-400' : 'border-slate-200'
                    }`}
                  >
                    <img
                      src={item.thumb_small || item.thumb || ''}
                      alt={item.name}
                      className="w-full h-16 sm:h-20 object-cover"
                    />
                    <button
                      onClick={() => handleToggleItemInShowcase(item.id)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Remove from showcase"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    {/* Reorder controls — moves this item earlier/later in
                        the showcase's display sequence (item_ids order). */}
                    <div className="absolute top-1 left-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => handleMoveItemInShowcase(idx, -1)}
                        disabled={idx === 0}
                        title="Move earlier"
                        className="p-0.5 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleMoveItemInShowcase(idx, 1)}
                        disabled={idx === selectedItems.length - 1}
                        title="Move later"
                        className="p-0.5 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="absolute bottom-6 left-1 text-[9px] font-mono font-bold text-white bg-slate-900/70 px-1 rounded">
                      #{idx + 1}
                    </span>
                    <span className="absolute bottom-6 right-1 p-0.5 rounded bg-slate-900/70 text-white/70 opacity-0 group-hover:opacity-100 transition-all">
                      <GripVertical className="w-2.5 h-2.5" />
                    </span>
                    <div className="p-1 text-[10px] font-space-grotesk text-slate-700 font-medium truncate">
                      {item.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FULL CATALOG EXPLORER & CURATION SECTION */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-archivo text-xl sm:text-2xl text-slate-900">
              Studio Design Catalog
            </h3>
            <p className="text-xs font-mono text-slate-500">
              Browse 1,300+ portfolio works, filter by category or media format, and add to client showcase.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddAllOnPage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-space-grotesk font-semibold text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Add All on Page ({paginatedItems.length})</span>
            </button>
          </div>
        </div>

        {/* Search & Media Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by keywords, title, category, format (e.g. packaging, luxury, tech)..."
              className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-10 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubcategory('All');
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-800 font-space-grotesk font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-white text-slate-900">
                  {cat} ({categoryCounts[cat] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Media Format Filter */}
          <div>
            <select
              value={mediaFilter}
              onChange={(e) => {
                setMediaFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-800 font-space-grotesk font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm cursor-pointer"
            >
              <option value="all">All Formats</option>
              <option value="image">Images / JPG / PNG</option>
              <option value="video">Videos & Animations</option>
              <option value="gif">Animated GIFs</option>
              <option value="pdf">PDFs & Guidelines</option>
            </select>
          </div>
        </div>

        {/* Category Pills Scroller */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
          {categories.slice(0, 15).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setSelectedSubcategory('All');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-space-grotesk font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              {cat} <span className="opacity-70 text-[10px]">({categoryCounts[cat] || 0})</span>
            </button>
          ))}
        </div>

        {/* Subcategory Pills — appears once a category with subcategories is active */}
        {subcategories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pl-1">
            <span className="text-[10px] font-space-mono text-slate-400 shrink-0">Type:</span>
            {['All', ...subcategories].map((sub) => (
              <button
                key={sub}
                onClick={() => {
                  setSelectedSubcategory(sub);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-space-grotesk font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  selectedSubcategory === sub
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* Pagination & Count Header */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              Showing {paginatedItems.length} of {filteredCatalog.length} matching works (Page {currentPage} of {totalPages})
            </span>
            <button
              onClick={() => {
                const allFilteredIds = filteredCatalog.map((i) => i.id);
                const allSelected = allFilteredIds.every((id) => selectedItemIds.has(id));
                setSelectedItemIds(allSelected ? new Set() : new Set(allFilteredIds));
              }}
              className="text-indigo-600 hover:text-indigo-800 font-space-grotesk font-bold cursor-pointer"
            >
              {filteredCatalog.length > 0 && filteredCatalog.every((i) => selectedItemIds.has(i.id))
                ? `Deselect all ${filteredCatalog.length}`
                : `Select all ${filteredCatalog.length} (filtered)`}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white text-slate-800 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
              <option value={96}>96</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions Bar — shown only when items are selected */}
        {selectedItemIds.size > 0 && (
          <div className="sticky top-2 z-30 flex flex-wrap items-center gap-2.5 p-3.5 rounded-2xl bg-slate-900 text-white shadow-xl">
            <span className="font-space-grotesk font-bold text-xs px-2">
              {selectedItemIds.size} selected
            </span>

            <button
              onClick={() => {
                if (!currentShowcase) return;
                const set = new Set([...currentShowcase.item_ids, ...Array.from(selectedItemIds)]);
                onUpdateShowcase({ ...currentShowcase, item_ids: Array.from(set), updatedAt: new Date().toISOString() });
                confetti({ particleCount: 40, spread: 40 });
                clearSelection();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-space-grotesk font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add to Showcase
            </button>

            <button
              onClick={() => setIsBulkAssigning((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-space-grotesk font-bold cursor-pointer"
            >
              <Folder className="w-3.5 h-3.5" /> Move to Category
            </button>

            <button
              onClick={() => setIsSavingAsTemplate((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-space-grotesk font-bold cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" /> Save as Template
            </button>

            <button
              onClick={clearSelection}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-space-grotesk font-bold cursor-pointer ml-auto"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>

            {isBulkAssigning && (
              <div className="w-full flex items-center gap-2 pt-2 border-t border-white/10 mt-1">
                <input
                  value={bulkCategoryValue}
                  onChange={(e) => setBulkCategoryValue(e.target.value)}
                  placeholder="Category (e.g. Logos & Monograms)"
                  list="admin-existing-categories-list"
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-indigo-400"
                />
                <datalist id="admin-existing-categories-list">
                  {Array.from(new Set(allItems.map((i) => i.category))).sort().map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <input
                  value={bulkSubcategoryValue}
                  onChange={(e) => setBulkSubcategoryValue(e.target.value)}
                  placeholder="Subcategory, optional (e.g. Car)"
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-indigo-400"
                />
                <button
                  onClick={async () => {
                    if (!bulkCategoryValue.trim()) return;
                    const itemsToUpdate = allItems.filter((i) => selectedItemIds.has(i.id) && i.custom);
                    await bulkUpdateCustomItemsCategory(itemsToUpdate, bulkCategoryValue.trim(), bulkSubcategoryValue.trim() || undefined);
                    setBulkActionMessage(`Moved ${itemsToUpdate.length} custom items to "${bulkCategoryValue.trim()}"${bulkSubcategoryValue.trim() ? ` / "${bulkSubcategoryValue.trim()}"` : ''}. Refresh to see changes reflected everywhere.`);
                    setIsBulkAssigning(false);
                    setBulkCategoryValue('');
                    setBulkSubcategoryValue('');
                    clearSelection();
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold cursor-pointer shrink-0"
                >
                  Apply
                </button>
              </div>
            )}

            {isSavingAsTemplate && (
              <div className="w-full space-y-2 pt-2 border-t border-white/10 mt-1">
                <div className="flex items-center gap-2">
                  <input
                    value={templateFormName}
                    onChange={(e) => setTemplateFormName(e.target.value)}
                    placeholder="Template name (e.g. Therapy Clinic)"
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-indigo-400"
                  />
                  <input
                    value={templateFormTags}
                    onChange={(e) => setTemplateFormTags(e.target.value)}
                    placeholder="tags, comma, separated (therapy, clinic, wellness)"
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    onClick={async () => {
                      if (!templateFormName.trim()) return;
                      await savePortfolioTemplateToCloud({
                        id: `template-${Date.now()}`,
                        name: templateFormName.trim(),
                        tags: templateFormTags.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
                        item_ids: Array.from(selectedItemIds),
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      });
                      await refreshTemplates();
                      setBulkActionMessage(`Saved template "${templateFormName.trim()}" with ${selectedItemIds.size} items.`);
                      setIsSavingAsTemplate(false);
                      setTemplateFormName('');
                      setTemplateFormTags('');
                      clearSelection();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold cursor-pointer shrink-0"
                  >
                    Save
                  </button>
                </div>

                {portfolioTemplates.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      value={addToTemplateId}
                      onChange={(e) => setAddToTemplateId(e.target.value)}
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="" className="bg-slate-900">— or add to existing template —</option>
                      {portfolioTemplates.map((t) => (
                        <option key={t.id} value={t.id} className="bg-slate-900">{t.name} ({t.item_ids.length} items)</option>
                      ))}
                    </select>
                    <button
                      onClick={async () => {
                        const target = portfolioTemplates.find((t) => t.id === addToTemplateId);
                        if (!target) return;
                        const merged = Array.from(new Set([...target.item_ids, ...Array.from(selectedItemIds)]));
                        await savePortfolioTemplateToCloud({ ...target, item_ids: merged, updatedAt: new Date().toISOString() });
                        await refreshTemplates();
                        setBulkActionMessage(`Added ${selectedItemIds.size} items to "${target.name}".`);
                        setIsSavingAsTemplate(false);
                        setAddToTemplateId('');
                        clearSelection();
                      }}
                      disabled={!addToTemplateId}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-xs font-bold cursor-pointer shrink-0"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {bulkActionMessage && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-space-grotesk font-semibold">
            <span>{bulkActionMessage}</span>
            <button onClick={() => setBulkActionMessage(null)} className="cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Catalog Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {paginatedItems.map((item) => {
            const inShowcase = currentShowcase?.item_ids.includes(item.id);

            return (
              <div
                key={item.id}
                className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col bg-white ${
                  selectedItemIds.has(item.id)
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-md shadow-emerald-100'
                    : inShowcase
                    ? 'border-indigo-600 ring-2 ring-indigo-500/30 shadow-md shadow-indigo-100'
                    : 'border-slate-200 hover:border-indigo-300 hover:shadow-lg'
                }`}
              >
                {/* Bulk-select checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleItemSelected(item.id);
                  }}
                  className={`absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer border-2 ${
                    selectedItemIds.has(item.id)
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-white/90 border-white/90 text-transparent hover:border-emerald-400'
                  }`}
                  title="Select for bulk actions"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>

                {/* Media Thumbnail */}
                <div 
                  onClick={() => onOpenLightbox(item)}
                  className="relative aspect-[4/3] bg-slate-100 overflow-hidden cursor-pointer"
                >
                  <img
                    src={item.thumb_small || item.thumb || ''}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Format tag */}
                  <span className="absolute top-2.5 left-9 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-md text-[10px] font-mono text-white border border-white/10">
                    {item.category}
                  </span>

                  {/* In Showcase Badge */}
                  {inShowcase && (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-mono font-bold flex items-center gap-1 shadow-md shadow-indigo-900/30">
                      <Check className="w-3 h-3" />
                      In Showcase
                    </span>
                  )}

                  {/* Permanent delete — only for custom items (Drive links /
                      synced files), never the original static catalog. */}
                  {item.custom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePermanentDeleteItem(item);
                      }}
                      title="Delete permanently from catalog"
                      className={`absolute right-2.5 p-1.5 rounded-lg bg-slate-900/80 hover:bg-rose-600 text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer ${
                        inShowcase ? 'top-9' : 'top-2.5'
                      }`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Card Info & Toggle Action */}
                <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <h4 
                      onClick={() => onOpenLightbox(item)}
                      className="font-space-grotesk font-semibold text-xs text-slate-900 line-clamp-2 cursor-pointer hover:text-indigo-600"
                    >
                      {item.name}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleToggleItemInShowcase(item.id)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-space-grotesk font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                        inShowcase
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200'
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
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 cursor-pointer"
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

        {/* Bottom Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-slate-700 border border-slate-200 shadow-sm cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-xs font-mono text-slate-600 px-4">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-slate-700 border border-slate-200 shadow-sm cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};
