/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, Plus } from 'lucide-react';
import { Showcase, PortfolioItem, ThemeConfig } from '../types/portfolio';

interface AnimatedMosaicHeroProps {
  showcase: Showcase;
  featuredItems: PortfolioItem[];
  theme: ThemeConfig;
  onScrollToGallery: () => void;
}

// Each slot's position/size in the mosaic and how strongly it drifts with
// the cursor (bigger images drift less, so nothing feels chaotic).
const MOSAIC_SLOTS = [
  { className: 'absolute top-[4%] right-[30%] w-[26%] aspect-[3/4] z-10', depth: 18 },
  { className: 'absolute top-[2%] right-[2%] w-[38%] aspect-[3/4] z-20', depth: 26 },
  { className: 'absolute top-[46%] right-[26%] w-[20%] aspect-square z-10', depth: 14 },
  { className: 'absolute top-[50%] right-[0%] w-[30%] aspect-[4/5] z-20', depth: 22 },
  { className: 'absolute top-[10%] right-[55%] w-[16%] aspect-square z-0 hidden lg:block', depth: 10 },
  { className: 'absolute top-[62%] right-[58%] w-[14%] aspect-square z-0 hidden lg:block', depth: 8 },
];

export const AnimatedMosaicHero: React.FC<AnimatedMosaicHeroProps> = ({
  showcase,
  featuredItems,
  theme,
  onScrollToGallery,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 }); // -1..1 range from center

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMouse({ x, y });
  };

  const images = featuredItems.slice(0, MOSAIC_SLOTS.length);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMouse({ x: 0, y: 0 })}
      // ~92vh (not a full 100vh) so a sliver of the gallery grid is
      // naturally visible at the bottom of the viewport on load — a quiet
      // hint to the visitor that there's more to scroll to.
      className="relative w-full min-h-[92vh] overflow-hidden px-4 sm:px-6 lg:px-10 pt-28 pb-10"
    >
      <div className="relative max-w-7xl mx-auto h-full grid lg:grid-cols-2 gap-8 items-center">
        {/* Side text */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-30 space-y-5 max-w-xl"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-space-mono uppercase font-bold tracking-wider glass-chip glass-text-secondary">
            Curated Portfolio Showcase
          </span>
          <h1 className="font-roboto text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight glass-text-primary leading-[1.12]">
            {showcase.heading && showcase.heading.trim() ? (
              showcase.heading
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
          </h1>
          {showcase.tagline && (
            <p className="text-base sm:text-lg glass-text-secondary font-inter leading-relaxed">
              {showcase.tagline}
            </p>
          )}
        </motion.div>

        {/* Parallax image mosaic */}
        <div className="relative h-[52vh] lg:h-[72vh] w-full">
          {/* Decorative plus marks, drift a little too */}
          <Plus
            className="absolute top-[2%] left-[8%] w-5 h-5 glass-text-muted z-0 hidden sm:block"
            style={{ transform: `translate(${mouse.x * 6}px, ${mouse.y * 6}px)` }}
          />
          <Plus
            className="absolute bottom-[6%] right-[2%] w-5 h-5 glass-text-muted z-30 hidden sm:block"
            style={{ transform: `translate(${mouse.x * 10}px, ${mouse.y * 10}px)` }}
          />

          {images.map((item, i) => {
            const slot = MOSAIC_SLOTS[i];
            const thumb = item.thumb_large || item.thumb || item.thumb_small || '';
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.08 * i }}
                className={`${slot.className} rounded-2xl overflow-hidden shadow-2xl glass-hairline transition-transform duration-300 ease-out`}
                style={{
                  transform: `translate(${mouse.x * slot.depth}px, ${mouse.y * slot.depth}px)`,
                }}
              >
                {thumb ? (
                  <img src={thumb} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" style={{ background: theme.gradientFrom }} />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Scroll hint */}
      <button
        onClick={onScrollToGallery}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 glass-text-muted hover:glass-text-primary transition-colors cursor-pointer"
        title="Scroll to gallery"
      >
        <span className="text-[10px] font-space-mono uppercase tracking-widest">Gallery below</span>
        <motion.span
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      </button>
    </div>
  );
};
