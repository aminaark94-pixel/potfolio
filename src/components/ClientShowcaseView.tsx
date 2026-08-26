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
  X
} from 'lucide-react';
import { Showcase, PortfolioItem, ThemeConfig, ClientFeedback } from '../types/portfolio';
import { THEMES } from '../data/themes';
import { generateStandaloneHTML } from '../utils/storage';
import confetti from 'canvas-confetti';

interface ClientShowcaseViewProps {
  showcase: Showcase;
  allItems: PortfolioItem[];
  onOpenLightbox: (item: PortfolioItem) => void;
  onUpdateShowcase?: (updated: Showcase) => void;
  onOpenDownloadModal?: () => void;
}

export const ClientShowcaseView: React.FC<ClientShowcaseViewProps> = ({
  showcase,
  allItems,
  onOpenLightbox,
  onUpdateShowcase,
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
      <div 
        className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC]"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full p-8 rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 text-center space-y-6"
        >
          <div 
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl shadow-lg shadow-indigo-200 bg-indigo-600"
          >
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="font-space-grotesk font-bold text-2xl text-slate-900">
              Private Client Showcase
            </h2>
            <p className="text-xs font-mono text-slate-500">
              Prepared by {showcase.brand_name} for {showcase.heading}
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="Enter access PIN / password"
                className={`w-full text-center tracking-widest text-lg font-mono px-4 py-3 rounded-xl bg-slate-50 border focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-900 placeholder-slate-400 ${
                  pinError ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 focus:border-indigo-500'
                }`}
                autoFocus
              />
              {pinError && (
                <p className="text-xs text-rose-600 font-mono">Incorrect PIN. Please try again.</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-space-grotesk font-bold text-white transition-all shadow-md shadow-indigo-200 bg-indigo-600 hover:bg-indigo-700 active:scale-98 cursor-pointer"
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
    <div 
      className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-indigo-600 selection:text-white transition-colors duration-500"
    >
      {/* Floating Glass Sticky Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'py-3 bg-white/95 backdrop-blur-2xl shadow-md border-b border-slate-200/80'
            : 'py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/60'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Studio Brand */}
          <div className="flex items-center gap-3 min-w-0">
            {showcase.logo_url ? (
              <img src={showcase.logo_url} alt="Logo" className="h-8 w-auto rounded-lg object-contain shadow-sm" />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-md shadow-indigo-200"
                style={{
                  background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
                  boxShadow: `0 4px 14px ${theme.accentGlow}`,
                }}
              >
                ◆
              </div>
            )}
            <div className="min-w-0">
              <span className="font-space-grotesk font-bold text-base text-slate-900 tracking-tight truncate block">
                {showcase.brand_name || 'Studio'}
              </span>
            </div>
          </div>

          {/* Client Target & Action Suite */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-semibold block">
                Prepared Specifically For
              </span>
              <span 
                className="font-space-grotesk font-bold text-xs sm:text-sm tracking-wide block truncate max-w-[220px] text-slate-800"
              >
                {showcase.heading}
              </span>
            </div>

            {likedCount > 0 && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-mono font-bold">
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>{likedCount} Liked</span>
              </div>
            )}

            {/* Share / QR Modal Trigger */}
            <button
              onClick={() => setShareModalOpen(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
              title="Share Showcase / QR Code"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* 1-Click HTML Standalone Export */}
            <button
              onClick={handleExportHtml}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-space-grotesk font-semibold text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
              title="Export single standalone .html file to email/WhatsApp to client"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>{exportedHtml ? 'Saved .HTML!' : 'Export HTML'}</span>
            </button>

            {/* Primary CTA */}
            {showcase.ctaText && (
              <a
                href={showcase.ctaLink || '#'}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-space-grotesk font-bold text-xs sm:text-sm text-white transition-all shadow-md hover:opacity-95 active:scale-95 shrink-0 cursor-pointer"
                style={{
                  backgroundColor: theme.accent,
                  boxShadow: `0 4px 16px ${theme.accentGlow}`,
                }}
              >
                <span>{showcase.ctaText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Spacer */}
      <div className="h-20 sm:h-24"></div>

      {/* Hero Presentation Header */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16 overflow-hidden">
        {/* Background Morphing Liquid Blob */}
        {showcase.heroStyle === 'fluid-blob' && (
          <div
            className="absolute -top-12 -right-12 w-[340px] sm:w-[500px] h-[340px] sm:h-[500px] rounded-full animate-blob pointer-events-none opacity-40 blur-3xl z-0"
            style={{
              background: `radial-gradient(circle at 35% 35%, ${theme.gradientFrom}, ${theme.gradientTo} 70%)`,
            }}
          />
        )}

        {showcase.heroStyle === 'cyber-grid' && (
          <div className="absolute inset-0 bg-grid-pattern opacity-60 z-0 pointer-events-none" />
        )}

        {showcase.heroStyle === 'minimal-glow' && (
          <div 
            className="absolute top-0 right-1/4 w-96 h-96 rounded-full blur-[100px] pointer-events-none opacity-20 z-0"
            style={{ backgroundColor: theme.accent }}
          />
        )}

        <div className="relative z-10 max-w-3xl space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase font-bold tracking-wider border shadow-sm bg-indigo-50 border-indigo-100 text-indigo-700"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Curated Portfolio Showcase</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-archivo text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.04]"
          >
            {showcase.heading.split(' ')[0]} <br />
            <span style={{ color: theme.accent }}>
              {showcase.heading.split(' ').slice(1).join(' ') || 'Showcase'}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-xl text-slate-600 font-inter leading-relaxed max-w-2xl"
          >
            {showcase.tagline}
          </motion.p>

          {/* Client Personal Note Card */}
          {showcase.clientNote && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="p-5 sm:p-6 rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-xl flex items-start gap-4 mt-6 shadow-sm"
            >
              <div 
                className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-700 shrink-0 mt-0.5 border border-indigo-100 shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-slate-400 block">
                  Message from Studio Director
                </span>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-inter">
                  {showcase.clientNote}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Category Tabs Filter */}
      {categories.length > 2 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5 pl-1 pr-2 shrink-0">
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
                      ? 'text-white shadow-md'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm'
                  }`}
                  style={selectedCategory === cat ? {
                    backgroundColor: theme.accent,
                    boxShadow: `0 3px 12px ${theme.accentGlow}`,
                  } : {}}
                >
                  <span>{cat}</span>
                  <span className="text-[10px] font-mono opacity-80">({count})</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Showcase Gallery (Masonry Layout) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {showcaseItems.length === 0 ? (
          <div 
            className="p-12 sm:p-20 text-center rounded-3xl border border-slate-200 bg-white shadow-sm space-y-4"
          >
            <Layers className="w-12 h-12 mx-auto text-slate-300" />
            <h3 className="font-space-grotesk font-bold text-xl text-slate-900">
              No Work Added to Showcase Yet
            </h3>
            <p className="text-sm font-space-grotesk text-slate-500 max-w-md mx-auto">
              Open the Studio Hub tab in the navbar above to search and curate design items for this client showcase.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* If a specific category is chosen */}
            {selectedCategory !== 'All' ? (
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
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <h2 className="font-space-grotesk font-bold text-xl sm:text-2xl text-slate-900">
                        {catName}
                      </h2>
                      <span 
                        className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100"
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
      <footer 
        className="border-t border-slate-200/80 py-12 px-4 text-center space-y-3 bg-white"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <div>
            © {new Date().getFullYear()} {showcase.brand_name || 'Studio'} — Private Client Presentation.
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleExportHtml}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Export Standalone HTML
            </button>
            <span>•</span>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Back to Top ↑
            </button>
          </div>
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
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 max-w-sm w-full p-6 rounded-3xl bg-white border border-slate-200 shadow-2xl text-center space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-space-grotesk font-bold text-base text-slate-900">
                  Share Client Showcase
                </h3>
                <button
                  onClick={() => setShareModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* QR Code generator */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto w-48 h-48 shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `${window.location.origin}${window.location.pathname}#showcase=${showcase.slug}`
                  )}`}
                  alt="QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <p className="text-xs font-mono text-slate-500">
                Scan with phone camera or copy public direct link:
              </p>

              <button
                onClick={handleCopyLink}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-space-grotesk text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-200 cursor-pointer"
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
      className="break-inside-avoid group relative rounded-3xl overflow-hidden border border-slate-200/90 bg-white cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl hover:border-indigo-200"
    >
      {/* Image Wrap */}
      <div className="relative bg-slate-100 overflow-hidden aspect-auto min-h-[160px]">
        <img
          src={item.thumb || item.thumb_large || ''}
          alt={item.name}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-auto object-cover transition-all duration-500 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Video / Media badge */}
        {item.mediaType === 'video' && (
          <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-white/10 uppercase">
            Video
          </span>
        )}

        {/* Heart Like Floating Button */}
        <button
          onClick={onToggleLike}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md border transition-all z-10 cursor-pointer ${
            isLiked
              ? 'bg-rose-500 text-white border-rose-400 scale-110 shadow-lg'
              : 'bg-white/80 text-slate-600 hover:text-rose-500 hover:bg-white border-slate-200 opacity-0 group-hover:opacity-100 shadow-sm'
          }`}
          title={isLiked ? 'Liked' : 'Like design'}
        >
          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
        </button>

        {/* Hover Information Overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span 
            className="text-[11px] font-mono font-bold uppercase tracking-wider block text-indigo-300"
          >
            {item.category}
          </span>
          <h4 className="font-space-grotesk font-bold text-sm text-white leading-snug line-clamp-2">
            {item.name}
          </h4>
          <span className="text-[10px] font-mono text-white/70 mt-1 flex items-center gap-1">
            <span>Click to explore</span>
            <ExternalLink className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* Card Base Bar */}
      <div className="p-3.5 flex items-center justify-between border-t border-slate-100 bg-white">
        <span className="font-space-grotesk font-semibold text-xs text-slate-800 truncate max-w-[80%]">
          {item.name}
        </span>
        <span className="text-[10px] font-mono text-slate-400 shrink-0">
          {item.category}
        </span>
      </div>
    </motion.div>
  );
};
