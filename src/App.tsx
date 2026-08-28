import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AdminPanel } from './components/AdminPanel';
import { AdminLogin } from './components/AdminLogin';
import { ClientShowcaseView } from './components/ClientShowcaseView';
import { CatalogExplorer } from './components/CatalogExplorer';
import { LightboxModal } from './components/LightboxModal';
import { SetupInstructionsModal } from './components/SetupInstructionsModal';
import { AddCustomItemModal } from './components/AddCustomItemModal';
import { Showcase, PortfolioItem } from './types/portfolio';
import { THEMES } from './data/themes';
import {
  loadStoredShowcases,
  saveStoredShowcases,
  getAllPortfolioItems,
  saveStoredCustomItems,
  loadStoredCustomItems,
} from './utils/storage';

export default function App() {
  const [showcases, setShowcases] = useState<Record<string, Showcase>>({});
  const [activeSlug, setActiveSlug] = useState<string>('new-client-f0c7');
  const [viewMode, setViewMode] = useState<'admin' | 'client' | 'catalog'>('admin');
  const [allItems, setAllItems] = useState<PortfolioItem[]>([]);

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
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState<boolean>(false);

  // Initialize data on mount
  useEffect(() => {
    const loadedShowcases = loadStoredShowcases();
    setShowcases(loadedShowcases);

    const items = getAllPortfolioItems();
    setAllItems(items);

    // Check URL hash for direct client showcase link (e.g. #showcase=new-client-f0c7)
    const hash = window.location.hash;
    if (hash.includes('showcase=')) {
      const slugMatch = hash.match(/showcase=([a-zA-Z0-9_-]+)/);
      if (slugMatch && slugMatch[1] && loadedShowcases[slugMatch[1]]) {
        setActiveSlug(slugMatch[1]);
        setViewMode('client');
        return;
      }
    }

    const firstSlug = Object.keys(loadedShowcases)[0] || 'new-client-f0c7';
    setActiveSlug(firstSlug);
  }, []);

  // Update showcases in state and localStorage
  const handleUpdateShowcase = (updated: Showcase) => {
    const nextShowcases = {
      ...showcases,
      [updated.slug]: updated,
    };
    setShowcases(nextShowcases);
    saveStoredShowcases(nextShowcases);
  };

  // Create new showcase
  const handleCreateShowcase = (newShowcase: Showcase) => {
    const nextShowcases = {
      ...showcases,
      [newShowcase.slug]: newShowcase,
    };
    setShowcases(nextShowcases);
    saveStoredShowcases(nextShowcases);
    setActiveSlug(newShowcase.slug);
  };

  // Delete showcase
  const handleDeleteShowcase = (slug: string) => {
    const nextShowcases = { ...showcases };
    delete nextShowcases[slug];
    setShowcases(nextShowcases);
    saveStoredShowcases(nextShowcases);
    const remainingSlugs = Object.keys(nextShowcases);
    if (remainingSlugs.length > 0) {
      setActiveSlug(remainingSlugs[0]);
    }
  };

  // Add custom portfolio item
  const handleAddCustomItem = (newItem: PortfolioItem) => {
    const customItems = loadStoredCustomItems();
    const nextCustom = [newItem, ...customItems];
    saveStoredCustomItems(nextCustom);

    const updatedCatalog = getAllPortfolioItems();
    setAllItems(updatedCatalog);

    // If currently editing a showcase, optionally add to it
    if (showcases[activeSlug]) {
      handleUpdateShowcase({
        ...showcases[activeSlug],
        item_ids: [newItem.id, ...showcases[activeSlug].item_ids],
      });
    }
  };

  // Add many items at once (used by "Sync from Drive")
  const handleBulkAddItems = (newItems: PortfolioItem[]) => {
    if (newItems.length === 0) return;
    const customItems = loadStoredCustomItems();
    const nextCustom = [...newItems, ...customItems];
    saveStoredCustomItems(nextCustom);

    const updatedCatalog = getAllPortfolioItems();
    setAllItems(updatedCatalog);
  };

  const currentShowcase = showcases[activeSlug] || Object.values(showcases)[0];
  const theme = currentShowcase ? THEMES[currentShowcase.theme] || THEMES.indigo : THEMES.indigo;

  // Categories list for modal
  const availableCategories = Array.from(new Set(allItems.map((i) => i.category))).sort();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* Top Studio Navbar — admin/internal only, never shown on the client-facing showcase */}
      {viewMode !== 'client' && (
        <Navbar
          viewMode={viewMode}
          onSelectViewMode={setViewMode}
          showcases={showcases}
          activeSlug={activeSlug}
          onSelectShowcase={setActiveSlug}
          onOpenCreateShowcase={() => {
            setViewMode('admin');
          }}
          onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
          onOpenCustomItemModal={() => setIsCustomItemModalOpen(true)}
          isAdminAuthed={isAdminAuthed === true}
          onAdminLogout={handleAdminLogout}
        />
      )}

      {/* Main View Area */}
      <div className="flex-1">
        {viewMode === 'admin' && isAdminAuthed === null && (
          <div className="min-h-[80vh] flex items-center justify-center text-slate-400 text-sm font-space-grotesk">
            Checking access...
          </div>
        )}

        {viewMode === 'admin' && isAdminAuthed === false && (
          <AdminLogin onSuccess={() => setIsAdminAuthed(true)} />
        )}

        {viewMode === 'admin' && isAdminAuthed === true && (
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
            onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
            onBulkAddItems={handleBulkAddItems}
          />
        )}

        {viewMode === 'client' && currentShowcase && (
          <ClientShowcaseView
            showcase={currentShowcase}
            allItems={allItems}
            onOpenLightbox={(item) => setSelectedLightboxItem(item)}
            onUpdateShowcase={handleUpdateShowcase}
            onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
            isAdminPreview={isAdminAuthed === true}
            onExitToAdmin={() => setViewMode('admin')}
          />
        )}

        {viewMode === 'catalog' && (
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

      {/* 1-Click Code Download & Windows 10 Setup Guide Modal */}
      <SetupInstructionsModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
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
