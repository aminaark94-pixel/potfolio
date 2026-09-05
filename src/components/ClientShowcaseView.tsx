import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  ExternalLink, 
  Share2, 
  Download, 
  Sparkles, 
  Lock, 
  ArrowRight, 
  Check, 
  MessageSquare,
  QrCode,
  Layers,
  ChevronRight,
  Filter,
  Maximize2,
  X
} from 'lucide-react';
import { Showcase, PortfolioItem, ThemeConfig, ClientFeedback } from '../types/portfolio';
import { AnimatedMosaicHero } from './AnimatedMosaicHero';
import { THEMES } from '../data/themes';
import { generateStandaloneHTML } from '../utils/storage';
import confetti from 'canvas-confetti';
import founderPhoto from '../assets/founder-photo.png';

const AALA_LOGO_URL = 'https://aalastudio.com/wp-content/uploads/2025/03/Group-1.png';

interface ClientShowcaseViewProps {
  showcase: Showcase;
  allItems: PortfolioItem[];
  onOpenLightbox: (item: PortfolioItem) => void;
  onUpdateShowcase?: (updated: Showcase) => void;
  onOpenDownloadModal?: () => void;
  isAdminPreview?: boolean;
  onExitToAdmin?: () => void;
}

export const ClientShowcaseView: React.FC<ClientShowcaseViewProps> = ({
  showcase,
  allItems,
  onOpenLightbox,
  onUpdateShowcase,
  isAdminPreview,
  onExitToAdmin,
}) => {
  const theme: ThemeConfig = THEMES[showcase.theme] || THEMES.rust;
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(!showcase.pinProtection);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [exportedHtml, setExportedHtml] = useState<boolean>(false);

  // Get curated items for this showcase
  const showcaseItems = showcase.item_ids
    .map((id) => allItems.find((it) => it.id === id))
    .filter(Boolean) as PortfolioItem[];

  // Items to feature in the animated-mosaic hero: explicit picks if set,
  // otherwise auto-pick the first 5-8 from the showcase itself.
  const heroFeaturedItems = showcase.heroImageIds && showcase.heroImageIds.length > 0
    ? (showcase.heroImageIds.map((id) => allItems.find((it) => it.id === id)).filter(Boolean) as PortfolioItem[])
    : showcaseItems.slice(0, 7);

  const galleryRef = React.useRef<HTMLElement>(null);

  // Get available categories in this showcase
  const categories = ['All', ...Array.from(new Set(showcaseItems.map((i) => i.category)))];

  // Filter items
  const filteredItems = selectedCategory === 'All'
    ? showcaseItems
    : showcaseItems.filter((i) => i.category === selectedCategory);

  // Group by category if "All" is selected, for organized presentation
  const itemsByCategory: Record<string, PortfolioItem[]> = {};
  showcaseItems.forEach((it) => {
    if (!itemsByCategory[it.category]) itemsByCategory[it.category] = [];
    itemsByCategory[it.category].push(it);
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === showcase.pinProtection) {
      setIsUnlocked(true);
      setPinError(false);
      confetti({ particleCount: 50, spread: 50 });
    } else {
      setPinError(true);
    }
  };

  const handleToggleLike = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateShowcase) return;
    const currentFeedback = showcase.feedback || {};
    const itemFb = currentFeedback[itemId] || {};
    const newLiked = !itemFb.liked;

    const updated = {
      ...showcase,
      feedback: {
        ...currentFeedback,
        [itemId]: {
          ...itemFb,
          liked: newLiked,
          timestamp: new Date().toISOString(),
        },
      },
    };
    onUpdateShowcase(updated);

    if (newLiked) {
      confetti({
        particleCount: 25,
        spread: 40,
        origin: { y: 0.8 },
      });
    }
  };

  const handleExportHtml = () => {
    const htmlString = generateStandaloneHTML(showcase, allItems);
    const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${showcase.slug}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportedHtml(true);
    setTimeout(() => setExportedHtml(false), 2500);
  };

  const handleCopyLink = () => {
    const currentUrl = `${window.location.origin}${window.location.pathname}#showcase=${showcase.slug}`;
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // PIN PROTECTION SCREEN
  if (!isUnlocked && showcase.pinProtection) {
    return (
      <div className="aurora-canvas min-h-screen flex items-center justify-center p-4 overflow-hidden">
        <div
          className="aurora-blob w-[420px] h-[420px] -top-32 -left-24 opacity-50"
          style={{ background: `radial-gradient(circle, ${theme.gradientFrom}, transparent 70%)` }}
        />
        <div
          className="aurora-blob w-[380px] h-[380px] -bottom-28 -right-16 opacity-40"
          style={{ background: `radial-gradient(circle, ${theme.gradientTo}, transparent 70%)` }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 shine-sweep max-w-md w-full p-8 rounded-3xl glass-surface-strong text-center space-y-6 overflow-hidden"
        >
          <div
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg glass-hairline"
            style={{
              background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
              boxShadow: `0 8px 28px ${theme.accentGlow}`,
            }}
          >
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="font-syne font-extrabold text-2xl glass-text-primary">
              Private Client Showcase
            </h2>
            <p className="text-xs font-space-mono glass-text-muted">
              Prepared by {showcase.brand_name} for {showcase.heading}
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1.5">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="Enter access PIN / password"
                className={`w-full text-center tracking-widest text-lg font-space-mono px-4 py-3 rounded-xl glass-chip focus:outline-none focus:ring-2 transition-all glass-text-primary placeholder-white/30 ${
                  pinError ? 'ring-2 ring-rose-500/50 border-rose-400/50' : 'focus:ring-white/20'
                }`}
                autoFocus
              />
              {pinError && (
                <p className="text-xs font-space-mono text-rose-300">Incorrect PIN. Please try again.</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-space-grotesk font-bold text-white transition-all active:scale-98 cursor-pointer glass-hairline"
              style={{
                background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
                boxShadow: `0 10px 30px -8px ${theme.accentGlow}`,
              }}
            >
              Unlock Presentation
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const likedCount = Object.values(showcase.feedback || {}).filter((f: ClientFeedback) => f?.liked).length;

  return (
    <div className="aurora-canvas min-h-screen glass-text-primary selection:bg-white/20 selection:text-white transition-colors duration-500">
      {/* Ambient monochrome glow — matches Aala Studio's minimal dark palette */}
      <div className="aurora-blob w-[520px] h-[520px] -top-40 -left-32 opacity-[0.07] animate-blob-slow bg-white" />
      <div className="aurora-blob w-[440px] h-[440px] top-32 -right-24 opacity-[0.05] animate-blob bg-white" />
      <div
        className="aurora-blob w-[360px] h-[360px] bottom-0 left-1/4 opacity-[0.12] animate-blob-slow"
        style={{ background: `radial-gradient(circle, ${theme.accentSoft}, transparent 70%)` }}
      />

      {/* Floating Glass Sticky Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled ? 'py-3 glass-surface-strong' : 'py-4 glass-surface'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Studio Brand */}
          <div className="flex items-center gap-3 min-w-0">
            {isAdminPreview && onExitToAdmin && (
              <button
                onClick={onExitToAdmin}
                title="Back to Studio Hub"
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg glass-chip glass-text-secondary hover:glass-text-primary hover:bg-white/10 transition-all cursor-pointer text-[11px] font-space-mono shrink-0"
              >
                <ChevronRight className="w-3 h-3 rotate-180" />
                <span>Studio Hub</span>
              </button>
            )}
            {showcase.logo_url ? (
              <img
                src={showcase.logo_url}
                alt="Logo"
                className="h-9 w-auto rounded-lg object-contain bg-white p-1"
              />
            ) : (
              <img
                src={AALA_LOGO_URL}
                alt="Aala Studio"
                className="h-9 w-auto rounded-lg object-contain bg-white p-1.5"
              />
            )}
            <img
              src={founderPhoto}
              alt="Aala Studio"
              className="hidden sm:block w-9 h-9 rounded-full object-cover glass-hairline shrink-0"
            />
          </div>

          {/* Client Target & Action Suite */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <span className="text-[11px] font-space-mono uppercase tracking-widest glass-text-muted font-semibold block">
                Prepared Specifically For
              </span>
              <span 
                className="font-space-grotesk font-bold text-xs sm:text-sm tracking-wide block truncate max-w-[220px] glass-text-primary"
              >
                {showcase.heading}
              </span>
            </div>

            {likedCount > 0 && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-chip text-rose-300 text-xs font-space-mono font-bold">
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>{likedCount} Liked</span>
              </div>
            )}

            {/* Share / QR Modal Trigger */}
            <button
              onClick={() => setShareModalOpen(true)}
              className="p-2 rounded-xl glass-chip glass-text-secondary hover:glass-text-primary hover:bg-white/10 transition-all cursor-pointer"
              title="Share Showcase / QR Code"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Spacer */}
      <div className="h-20 sm:h-24"></div>

      {/* Hero — new animated mosaic template (opt-in per showcase) or the
          original hero, rendered completely unchanged for every existing
          showcase that hasn't picked the new one. */}
      {showcase.heroTemplate === 'animated-mosaic' ? (
        <AnimatedMosaicHero
          showcase={showcase}
          featuredItems={heroFeaturedItems}
          theme={theme}
          onScrollToGallery={() => galleryRef.current?.scrollIntoView({ behavior: 'smooth' })}
        />
      ) : (
      <>
      {/* Hero Presentation Slab */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        <div className="relative shine-sweep max-w-4xl rounded-[2rem] glass-surface-strong px-6 py-8 sm:px-10 sm:py-12 overflow-hidden">
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-4">
              <img
                src={founderPhoto}
                alt="Aala Studio"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-xl border-2 glass-hairline shrink-0"
                style={{ borderColor: theme.accentSoft }}
              />
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-space-mono uppercase font-bold tracking-wider glass-chip glass-text-secondary"
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: theme.accentSoft }} />
                <span>Curated Portfolio Showcase</span>
              </motion.div>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-roboto text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight glass-text-primary leading-[1.15]"
            >
              {showcase.heading && showcase.heading.trim() ? (
                <>
                  Personalized Portfolio for{' '}
                  <span
                    style={{
                      background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.accentSoft})`,
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
                    {showcase.heading}
                  </span>
                </>
              ) : (
                <span
                  style={{
                    background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.accentSoft})`,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  Custom Portfolio
                </span>
              )}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-xl glass-text-secondary font-inter leading-relaxed max-w-2xl"
            >
              {showcase.tagline}
            </motion.p>
          </div>
        </div>
      </section>
      </>
      )}

      {/* Category Tabs Filter */}
      {categories.length > 2 && (
        <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <span className="text-xs font-space-mono glass-text-muted flex items-center gap-1.5 pl-1 pr-2 shrink-0">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            {categories.map((cat) => {
              const count = cat === 'All' 
                ? showcaseItems.length 
                : showcaseItems.filter((i) => i.category === cat).length;

              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-space-grotesk font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? 'text-white'
                      : 'glass-chip glass-text-secondary hover:glass-text-primary hover:bg-white/10'
                  }`}
                  style={selectedCategory === cat ? {
                    background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
                    boxShadow: `0 3px 16px ${theme.accentGlow}`,
                  } : {}}
                >
                  <span>{cat}</span>
                  <span className="text-[10px] font-space-mono opacity-80">({count})</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Showcase Gallery (Masonry Layout) */}
      <main ref={galleryRef} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {showcaseItems.length === 0 ? (
          <div className="p-12 sm:p-20 text-center rounded-3xl glass-surface space-y-4">
            <Layers className="w-12 h-12 mx-auto glass-text-muted" />
            <h3 className="font-space-grotesk font-bold text-xl glass-text-primary">
              No Work Added to Showcase Yet
            </h3>
            <p className="text-sm font-space-grotesk glass-text-secondary max-w-md mx-auto">
              Open the Studio Hub tab in the navbar above to search and curate design items for this client showcase.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* If a specific category is chosen, OR the showcase is set to
                "flow" layout, render everything in one flat gallery. */}
            {selectedCategory !== 'All' || showcase.layoutMode === 'flow' ? (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
                {filteredItems.map((item, index) => (
                  <ShowcaseCard
                    key={item.id}
                    item={item}
                    index={index}
                    theme={theme}
                    isLiked={!!showcase.feedback?.[item.id]?.liked}
                    onOpen={() => onOpenLightbox(item)}
                    onToggleLike={(e) => handleToggleLike(item.id, e)}
                  />
                ))}
              </div>
            ) : (
              /* If "All" is selected, render neatly grouped sections */
              Object.entries(itemsByCategory).map(([catName, itemsInCat]) => (
                <div key={catName} className="space-y-5">
                  <div className="flex items-center justify-between glass-hairline border-t-0 border-l-0 border-r-0 pb-3">
                    <div className="flex items-center gap-2.5">
                      <h2 className="font-space-grotesk font-bold text-xl sm:text-2xl glass-text-primary">
                        {catName}
                      </h2>
                      <span 
                        className="px-2.5 py-0.5 rounded-full text-xs font-space-mono font-bold glass-chip"
                        style={{ color: theme.accentSoft }}
                      >
                        {itemsInCat.length}
                      </span>
                    </div>
                  </div>

                  <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
                    {itemsInCat.map((item, index) => (
                      <ShowcaseCard
                        key={item.id}
                        item={item}
                        index={index}
                        theme={theme}
                        isLiked={!!showcase.feedback?.[item.id]?.liked}
                        onOpen={() => onOpenLightbox(item)}
                        onToggleLike={(e) => handleToggleLike(item.id, e)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 glass-hairline border-l-0 border-r-0 border-b-0 py-10 px-4 text-center space-y-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 text-xs font-space-mono glass-text-muted">
          <span>© {new Date().getFullYear()} {showcase.brand_name || 'Aala Studio'}</span>
          <span className="hidden sm:inline">•</span>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="hover:glass-text-primary transition-colors cursor-pointer"
          >
            Back to Top ↑
          </button>
        </div>
      </footer>

      {/* Share / QR Modal */}
      <AnimatePresence>
        {shareModalOpen && (
          <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShareModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 max-w-sm w-full p-6 rounded-3xl glass-surface-strong text-center space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-space-grotesk font-bold text-base glass-text-primary">
                  Share Client Showcase
                </h3>
                <button
                  onClick={() => setShareModalOpen(false)}
                  className="p-1 rounded-lg glass-text-muted hover:glass-text-primary cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* QR Code generator */}
              <div className="p-4 rounded-2xl glass-chip flex items-center justify-center mx-auto w-48 h-48">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `${window.location.origin}${window.location.pathname}#showcase=${showcase.slug}`
                  )}`}
                  alt="QR Code"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>

              <p className="text-xs font-space-mono glass-text-muted">
                Scan with phone camera or copy public direct link:
              </p>

              <button
                onClick={handleCopyLink}
                className="w-full py-2.5 rounded-xl text-white font-space-grotesk text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer glass-hairline"
                style={{
                  background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
                  boxShadow: `0 10px 30px -8px ${theme.accentGlow}`,
                }}
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy Direct Link'}</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface ShowcaseCardProps {
  item: PortfolioItem;
  index: number;
  theme: ThemeConfig;
  isLiked: boolean;
  onOpen: () => void;
  onToggleLike: (e: React.MouseEvent) => void;
}

const ShowcaseCard: React.FC<ShowcaseCardProps> = ({
  item,
  index,
  theme,
  isLiked,
  onOpen,
  onToggleLike,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3) }}
      onClick={onOpen}
      className="break-inside-avoid group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300"
    >
      {/* Image Wrap — pure image tile, no text, reference-gallery style */}
      <div className="relative bg-black/20 overflow-hidden rounded-2xl">
        <img
          src={item.thumb || item.thumb_large || ''}
          alt={item.name}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-auto object-cover transition-all duration-500 ease-out group-hover:scale-[1.04] ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Video badge */}
        {item.mediaType === 'video' && (
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md glass-chip text-[10px] font-space-mono text-cyan-300 uppercase z-10">
            Video
          </span>
        )}

        {/* Subtle professional hover tint */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Centered expand icon on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100">
          <div className="w-11 h-11 rounded-full glass-chip flex items-center justify-center text-white shadow-lg">
            <Maximize2 className="w-4 h-4" />
          </div>
        </div>

        {/* Heart Like Floating Button */}
        <button
          onClick={onToggleLike}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md border transition-all z-10 cursor-pointer ${
            isLiked
              ? 'bg-rose-500 text-white border-rose-400 scale-110 shadow-lg opacity-100'
              : 'bg-black/30 text-white/80 hover:text-rose-400 hover:bg-black/50 border-white/15 opacity-0 group-hover:opacity-100'
          }`}
          title={isLiked ? 'Liked' : 'Like design'}
        >
          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
        </button>
      </div>
    </motion.div>
  );
};
