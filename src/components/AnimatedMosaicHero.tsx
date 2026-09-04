/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { Showcase, PortfolioItem, ThemeConfig } from '../types/portfolio';

interface AnimatedMosaicHeroProps {
  showcase: Showcase;
  featuredItems: PortfolioItem[];
  theme: ThemeConfig;
  onScrollToGallery: () => void;
}

// CSS-grid spans (not absolute percentage positions) so images always tile
// together with no dead gaps, regardless of viewport size. Each entry also
// has its own parallax "depth" so bigger tiles drift less than small ones.
const MOSAIC_SLOTS = [
  { span: 'col-span-3 row-span-4', depth: 10 },
  { span: 'col-span-3 row-span-3', depth: 18 },
  { span: 'col-span-2 row-span-3', depth: 14 },
  { span: 'col-span-4 row-span-3', depth: 22 },
  { span: 'col-span-3 row-span-3', depth: 16 },
  { span: 'col-span-3 row-span-3', depth: 12 },
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
      // Height is intentionally short of a full screen (not 100vh, no
      // vertical centering that stretches content into empty space) so a
      // slice of the actual gallery is visible in the viewport on load —
      // the whole point is the visitor sees it's a gallery, not just this.
      className="relative w-full h-[62vh] sm:h-[68vh] overflow-hidden px-4 sm:px-6 lg:px-10 pt-2 pb-4"
    >
      <div className="relative max-w-7xl mx-auto h-full grid lg:grid-cols-2 gap-6 lg:gap-10 items-stretch">
        {/* Side text */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-30 flex flex-col justify-center space-y-4 max-w-xl"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-space-mono uppercase font-bold tracking-wider glass-chip glass-text-secondary w-fit">
            Curated Portfolio Showcase
          </span>
          <h1 className="font-roboto text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight glass-text-primary leading-[1.12]">
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
            <p className="text-sm sm:text-base glass-text-secondary font-inter leading-relaxed">
              {showcase.tagline}
            </p>
          )}
        </motion.div>

        {/* Parallax image mosaic — CSS grid, so tiles always fit together
            with no gaps. Mouse tracking lives on this outer container;
            each tile's OWN inner wrapper (not the fade-in motion.div)
            gets the parallax transform, so the two animations never
            fight over the same element's transform. */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setMouse({ x: 0, y: 0 })}
          className="relative h-full w-full grid grid-cols-8 grid-rows-6 gap-3"
        >
          {images.map((item, i) => {
            const slot = MOSAIC_SLOTS[i];
            const thumb = item.thumb_large || item.thumb || item.thumb_small || '';
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.06 * i }}
                className={`${slot.span} rounded-2xl overflow-hidden shadow-2xl glass-hairline`}
              >
                {/* Inner wrapper owns the parallax transform exclusively —
                    kept separate from the motion.div above so Framer
                    Motion's own transform animation never overwrites it. */}
                <div
                  className="w-full h-full transition-transform duration-200 ease-out will-change-transform"
                  style={{ transform: `translate(${mouse.x * slot.depth}px, ${mouse.y * slot.depth}px) scale(1.08)` }}
                >
                  {thumb ? (
                    <img src={thumb} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ background: theme.gradientFrom }} />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Scroll hint */}
      <button
        onClick={onScrollToGallery}
        className="absolute bottom-1 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-0.5 glass-text-muted hover:glass-text-primary transition-colors cursor-pointer"
        title="Scroll to gallery"
      >
        <span className="text-[9px] font-space-mono uppercase tracking-widest">Gallery below</span>
        <motion.span
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.span>
      </button>
    </div>
  );
};
