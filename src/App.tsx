import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AdminPanel } from './components/AdminPanel';
import { AdminLogin } from './components/AdminLogin';
import { ClientShowcaseView } from './components/ClientShowcaseView';
import { CatalogExplorer } from './components/CatalogExplorer';
import { LightboxModal } from './components/LightboxModal';
import { AddCustomItemModal } from './components/AddCustomItemModal';
import { Showcase, PortfolioItem } from './types/portfolio';
import { THEMES } from './data/themes';
import {
  loadShowcasesFromCloud,
  saveShowcaseToCloud,
  deleteShowcaseFromCloud,
  loadCustomItemsFromCloud,
  saveCustomItemToCloud,
  saveCustomItemsToCloud,
  deleteCustomItemFromCloud,
  saveStoredCustomItems,
  getAllPortfolioItems,
} from './utils/storage';

export default function App() {
  const [showcases, setShowcases] = useState<Record<string, Showcase>>({});
  const [activeSlug, setActiveSlug] = useState<string>('new-client-f0c7');
  // Detect a client showcase link (#showcase=...) synchronously on first
  // render, so the admin-only Navbar never flashes before switching to the
  // client view — the hash is known immediately, no need to wait for the
  // async data-loading effect below to set it.
  const [viewMode, setViewMode] = useState<'admin' | 'client' | 'catalog'>(() =>
    typeof window !== 'undefined' && window.location.hash.includes('showcase=') ? 'client' : 'admin'
  );
  const [allItems, setAllItems] = useState<PortfolioItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [notFoundSlug, setNotFoundSlug] = useState<string | null>(null);

  // Admin auth: null = checking session with server, true = unlocked, false = locked
  const [isAdminAuthed, setIsAdminAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/admin-check')
      .then((res) => res.json())
      .then((data) => setIsAdminAuthed(!!data.authenticated))
      .catch(() => setIsAdminAuthed(false));
  }, []);

  const handleAdminLogout = () => {
    fetch('/api/admin-logout', { method: 'POST' }).finally(() => {
      setIsAdminAuthed(false);
    });
  };
  
  // Modals state
  const [selectedLightboxItem, setSelectedLightboxItem] = useState<PortfolioItem | null>(null);
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState<boolean>(false);

  // Initialize data on mount — loads from the shared Firestore database so
  // every device/browser (including a client opening a shared link) sees
  // the same showcases and uploaded items, not just the admin's own browser.
  useEffect(() => {
    (async () => {
      try {
        const [loadedShowcases, customItems] = await Promise.all([
          loadShowcasesFromCloud(),
          loadCustomItemsFromCloud(),
        ]);
        setShowcases(loadedShowcases);
        saveStoredCustomItems(customItems);
        setAllItems(getAllPortfolioItems());

        // Check URL hash for direct client showcase link (e.g. #showcase=new-client-f0c7)
        const hash = window.location.hash;
        if (hash.includes('showcase=')) {
          const slugMatch = hash.match(/showcase=([a-zA-Z0-9_-]+)/);
          if (slugMatch && slugMatch[1]) {
            if (loadedShowcases[slugMatch[1]]) {
              setActiveSlug(slugMatch[1]);
              setViewMode('client');
            } else {
              setNotFoundSlug(slugMatch[1]);
            }
            setIsDataLoading(false);
            return;
          }
        }

        const firstSlug = Object.keys(loadedShowcases)[0] || 'new-client-f0c7';
        setActiveSlug(firstSlug);
      } catch (e: any) {
        console.error('Failed to load shared data', e);
        setCloudError(e?.message || 'Could not connect to the shared database.');
      } finally {
        setIsDataLoading(false);
      }
    })();
  }, []);

  // Update showcases in state + shared Firestore database
  const handleUpdateShowcase = async (updated: Showcase) => {
    const nextShowcases = {
      ...showcases,
      [updated.slug]: updated,
    };
    setShowcases(nextShowcases);
    try {
      await saveShowcaseToCloud(updated);
    } catch (e) {
      console.error('Failed to save showcase update to cloud', e);
    }
  };

  // Create new showcase
  const handleCreateShowcase = (newShowcase: Showcase) => {
    const nextShowcases = {
      ...showcases,
      [newShowcase.slug]: newShowcase,
    };
    setShowcases(nextShowcases);
    saveShowcaseToCloud(newShowcase).catch(() => {});
    setActiveSlug(newShowcase.slug);
  };

  // Delete showcase
  const handleDeleteShowcase = (slug: string) => {
    const nextShowcases = { ...showcases };
    delete nextShowcases[slug];
    setShowcases(nextShowcases);
    deleteShowcaseFromCloud(slug).catch(() => {});
    const remainingSlugs = Object.keys(nextShowcases);
    if (remainingSlugs.length > 0) {
      setActiveSlug(remainingSlugs[0]);
    }
  };

  // Add custom portfolio item
  const handleAddCustomItem = (newItem: PortfolioItem) => {
    saveCustomItemToCloud(newItem).catch(() => {});

    const updatedCatalog = getAllPortfolioItems();
    const nextCustom = [newItem, ...updatedCatalog.filter((i) => i.custom)];
    saveStoredCustomItems(nextCustom);
    setAllItems([newItem, ...updatedCatalog]);

    // If currently editing a showcase, optionally add to it
    if (showcases[activeSlug]) {
      handleUpdateShowcase({
        ...showcases[activeSlug],
        item_ids: [newItem.id, ...showcases[activeSlug].item_ids],
      });
    }
  };

  // Add many items at once (used by "Sync from Drive" and the Drive Links
  // bulk-paste tool). Awaits the cloud write and only updates local state
  // once it's confirmed saved — previously this fired the save without
  // waiting and silently swallowed any failure, so items could look added
  // in the UI for this session but never actually persist to the shared
  // database, reappearing as "new" on the next sync from another device.
  const handleBulkAddItems = async (newItems: PortfolioItem[]) => {
    if (newItems.length === 0) return;
    await saveCustomItemsToCloud(newItems);

    const updatedCatalog = getAllPortfolioItems();
    const nextCustom = [...newItems, ...updatedCatalog.filter((i) => i.custom)];
    saveStoredCustomItems(nextCustom);
    setAllItems([...newItems, ...updatedCatalog]);
  };

  // Permanently removes a custom item from the catalog (not just from one
  // showcase) — deletes it from Firestore, local state, and strips its id
  // out of every showcase's item_ids so no showcase is left pointing at a
  // deleted item.
  const handleDeleteCustomItem = async (itemId: string) => {
    await deleteCustomItemFromCloud(itemId);

    const updatedCatalog = getAllPortfolioItems().filter((i) => i.id !== itemId);
    const nextCustom = updatedCatalog.filter((i) => i.custom);
    saveStoredCustomItems(nextCustom);
    setAllItems(updatedCatalog);

    const affectedShowcases = Object.values<Showcase>(showcases).filter((sc) => sc.item_ids.includes(itemId));
    for (const sc of affectedShowcases) {
      await handleUpdateShowcase({
        ...sc,
        item_ids: sc.item_ids.filter((id) => id !== itemId),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const currentShowcase = showcases[activeSlug] || Object.values(showcases)[0];
  const theme = currentShowcase ? THEMES[currentShowcase.theme] || THEMES.indigo : THEMES.indigo;

  // Categories list for modal
  const availableCategories = Array.from(new Set(allItems.map((i) => i.category))).sort();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* Top Studio Navbar — admin/internal only, never shown on the client-facing showcase */}
      {viewMode !== 'client' && !notFoundSlug && (
        <Navbar
          viewMode={viewMode}
          onSelectViewMode={setViewMode}
          showcases={showcases}
          activeSlug={activeSlug}
          onSelectShowcase={setActiveSlug}
          onOpenCreateShowcase={() => {
            setViewMode('admin');
          }}
          onOpenCustomItemModal={() => setIsCustomItemModalOpen(true)}
          isAdminAuthed={isAdminAuthed === true}
          onAdminLogout={handleAdminLogout}
        />
      )}

      {/* Main View Area */}
      <div className="flex-1">
        {isDataLoading && (
          <div className="min-h-[80vh] flex items-center justify-center text-slate-400 text-sm font-space-grotesk">
            Loading portfolio...
          </div>
        )}

        {!isDataLoading && notFoundSlug && (
          <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 gap-2">
            <h2 className="font-space-grotesk font-bold text-xl text-slate-800">
              Showcase Not Found
            </h2>
            <p className="text-sm text-slate-500 max-w-sm">
              This link ("{notFoundSlug}") doesn't match any showcase. Please double-check the link with the studio.
            </p>
          </div>
        )}

        {!isDataLoading && cloudError && !notFoundSlug && (
          <div className="min-h-[40vh] flex items-center justify-center text-center px-4">
            <p className="text-xs text-amber-600 font-space-mono max-w-md">
              Couldn't connect to the shared database ({cloudError}). Showing local data only — changes may not sync across devices.
            </p>
          </div>
        )}

        {!isDataLoading && !notFoundSlug && viewMode === 'admin' && isAdminAuthed === null && (
          <div className="min-h-[80vh] flex items-center justify-center text-slate-400 text-sm font-space-grotesk">
            Checking access...
          </div>
        )}

        {!isDataLoading && !notFoundSlug && viewMode === 'admin' && isAdminAuthed === false && (
          <AdminLogin onSuccess={() => setIsAdminAuthed(true)} />
        )}

        {!isDataLoading && !notFoundSlug && viewMode === 'admin' && isAdminAuthed === true && (
          <AdminPanel
            showcases={showcases}
            activeSlug={activeSlug}
            allItems={allItems}
            onSelectShowcase={setActiveSlug}
            onUpdateShowcase={handleUpdateShowcase}
            onCreateShowcase={handleCreateShowcase}
            onDeleteShowcase={handleDeleteShowcase}
            onOpenClientView={() => setViewMode('client')}
            onOpenLightbox={(item) => setSelectedLightboxItem(item)}
            onOpenCustomItemModal={() => setIsCustomItemModalOpen(true)}
            onBulkAddItems={handleBulkAddItems}
            onDeleteCustomItem={handleDeleteCustomItem}
          />
        )}

        {!isDataLoading && !notFoundSlug && viewMode === 'client' && currentShowcase && (
          <ClientShowcaseView
            showcase={currentShowcase}
            allItems={allItems}
            onOpenLightbox={(item) => setSelectedLightboxItem(item)}
            onUpdateShowcase={handleUpdateShowcase}
            isAdminPreview={isAdminAuthed === true}
            onExitToAdmin={() => setViewMode('admin')}
          />
        )}

        {!isDataLoading && !notFoundSlug && viewMode === 'catalog' && (
          <CatalogExplorer
            items={allItems}
            showcases={showcases}
            activeSlug={activeSlug}
            onUpdateShowcase={handleUpdateShowcase}
            onOpenLightbox={(item) => setSelectedLightboxItem(item)}
            onOpenCustomItemModal={() => setIsCustomItemModalOpen(true)}
          />
        )}
      </div>

      {/* Fullscreen Interactive Lightbox Modal */}
      <LightboxModal
        item={selectedLightboxItem}
        items={allItems}
        theme={theme}
        isOpen={!!selectedLightboxItem}
        onClose={() => setSelectedLightboxItem(null)}
        onSelect={(item) => setSelectedLightboxItem(item)}
        isLiked={
          selectedLightboxItem && currentShowcase?.feedback?.[selectedLightboxItem.id]?.liked
        }
        onToggleLike={(itemId) => {
          if (currentShowcase) {
            const currentFb = currentShowcase.feedback || {};
            const liked = !currentFb[itemId]?.liked;
            handleUpdateShowcase({
              ...currentShowcase,
              feedback: {
                ...currentFb,
                [itemId]: {
                  ...currentFb[itemId],
                  liked,
                  timestamp: new Date().toISOString(),
                },
              },
            });
          }
        }}
      />

      {/* Add Custom Item Modal */}
      <AddCustomItemModal
        isOpen={isCustomItemModalOpen}
        onClose={() => setIsCustomItemModalOpen(false)}
        onAddItem={handleAddCustomItem}
        availableCategories={availableCategories}
        allItems={allItems}
      />
    </div>
  );
}
