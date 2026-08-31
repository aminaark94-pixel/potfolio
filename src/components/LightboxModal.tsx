import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  Heart, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Share2, 
  Tag, 
  Folder
} from 'lucide-react';
import { PortfolioItem, ThemeConfig } from '../types/portfolio';
import { getDriveVideoEmbed } from '../data/rawPortfolioData';

interface LightboxModalProps {
  item: PortfolioItem | null;
  items: PortfolioItem[];
  theme: ThemeConfig;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: PortfolioItem) => void;
  onToggleLike?: (itemId: string) => void;
  isLiked?: boolean;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  item,
  items,
  theme,
  isOpen,
  onClose,
  onSelect,
  onToggleLike,
  isLiked = false,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setZoomLevel(1);
  }, [item?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !item) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, item, items]);

  if (!isOpen || !item) return null;

  const currentIndex = items.findIndex((i) => i.id === item.id);
  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelect(items[currentIndex - 1]);
    } else if (items.length > 0) {
      onSelect(items[items.length - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      onSelect(items[currentIndex + 1]);
    } else if (items.length > 0) {
      onSelect(items[0]);
    }
  };

  const handleCopyLink = () => {
    if (item.drive_link) {
      navigator.clipboard.writeText(item.drive_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const imageSrc = item.thumb_large || item.thumb || item.drive_link || '';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 md:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#050508]/95 backdrop-blur-xl"
        />

        {/* Top Control Bar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-xs font-mono text-white">
            <span>
              {currentIndex + 1} / {items.length}
            </span>
            <span className="text-white/30">•</span>
            <span className="uppercase text-indigo-300 font-semibold">{item.category}</span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Zoom Controls */}
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.25))}
              className="p-2.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white/80 hover:text-white border border-white/15 hover:border-white/30 transition-all cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
              className="p-2.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white/80 hover:text-white border border-white/15 hover:border-white/30 transition-all cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {/* Like */}
            {onToggleLike && (
              <button
                onClick={() => onToggleLike(item.id)}
                className={`p-2.5 rounded-full backdrop-blur-md border transition-all cursor-pointer ${
                  isLiked
                    ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-900/30'
                    : 'bg-slate-900/80 text-white/80 hover:text-rose-400 border-white/15'
                }`}
                title={isLiked ? 'Liked' : 'Like design'}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              </button>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-slate-900/90 backdrop-blur-md text-white hover:bg-rose-600 border border-white/20 transition-all cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Previous Button */}
        {items.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-slate-900/80 backdrop-blur-md text-white/90 hover:text-white hover:bg-slate-900 border border-white/15 hover:border-indigo-400 transition-all hover:scale-110 cursor-pointer shadow-xl"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {items.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-slate-900/80 backdrop-blur-md text-white/90 hover:text-white hover:bg-slate-900 border border-white/15 hover:border-indigo-400 transition-all hover:scale-110 cursor-pointer shadow-xl"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Modal Container */}
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 max-w-5xl w-full max-h-[90vh] flex flex-col items-center"
        >
          {/* Main Media Viewer */}
          <div className="relative w-full flex items-center justify-center overflow-auto max-h-[72vh] rounded-3xl bg-slate-950/80 border border-white/15 p-2 sm:p-4 shadow-2xl">
            {item.mediaType === 'video' ? (
              <iframe
                src={getDriveVideoEmbed(item.drive_link) || ''}
                allow="autoplay; encrypted-media"
                allowFullScreen
                className="w-full aspect-video max-h-[68vh] rounded-2xl shadow-2xl border-0"
                title={item.name}
              />
            ) : (
              <img
                src={imageSrc}
                alt={item.name}
                style={{ transform: `scale(${zoomLevel})` }}
                className="max-h-[68vh] max-w-full rounded-2xl object-contain shadow-2xl transition-transform duration-200"
                loading="eager"
              />
            )}
          </div>

          {/* Caption & Metadata Footer */}
          <div className="w-full mt-3 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl text-slate-900">
            <div className="min-w-0 flex-1">
              <h3 className="font-space-grotesk font-bold text-base sm:text-lg text-slate-900 truncate">
                {item.name}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                  <Folder className="w-3 h-3" />
                  {item.category}
                </span>

                {item.keywords && item.keywords.slice(0, 3).map((kw, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-space-grotesk font-semibold text-slate-700 transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>{copied ? 'Copied Link!' : 'Share'}</span>
              </button>

              {item.drive_link && (
                <a
                  href={item.drive_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-space-grotesk font-bold text-white transition-all shadow-md shadow-indigo-200 bg-indigo-600 hover:bg-indigo-700 active:scale-95 cursor-pointer"
                >
                  <span>Open Full Asset</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
