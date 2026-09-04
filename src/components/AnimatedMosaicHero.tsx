/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Showcase, PortfolioItem, ThemeConfig } from '../types/portfolio';

interface AnimatedMosaicHeroProps {
  showcase: Showcase;
  featuredItems: PortfolioItem[];
  theme: ThemeConfig;
  onScrollToGallery: () => void;
}

// Simple, deliberately bullet-proof 2x2 grid — no CSS grid row/col spanning
// (which can mis-pack unpredictably), no scale/zoom on the images (which
// was cropping content oddly). Each tile has its own parallax depth so
// they don't all move in lockstep.
const DEPTHS = [10, 16, 14, 20];

export const AnimatedMosaicHero: React.FC<AnimatedMosaicHeroProps> = ({
  showcase,
  featuredItems,
  theme,
  onScrollToGallery,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 }); // -1..1 range from center
  const [hasEntered, setHasEntered] = useState(false);

  React.useEffect(() => {
    // Fade content in shortly after mount — a plain CSS transition, not an
    // animation library, so there is no risk of it ever getting stuck
    // invisible (which happened with the previous Framer Motion version).
    const t = setTimeout(() => setHasEntered(true), 30);
    return () => clearTimeout(t);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMouse({ x, y });
  };

  const images = featuredItems.slice(0, 4);

  return (
    <div className="relative w-full h-[62vh] sm:h-[68vh] overflow-hidden px-4 sm:px-6 lg:px-10 pt-2 pb-4">
      <div className="relative max-w-7xl mx-auto h-full grid lg:grid-cols-2 gap-6 lg:gap-10 items-center">
        {/* Side text — always rendered, opacity is plain CSS so it can
            never get stuck invisible. */}
        <div
          className="relative z-30 flex flex-col justify-center space-y-4 max-w-xl transition-opacity duration-700"
          style={{ opacity: hasEntered ? 1 : 0 }}
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
        </div>

        {/* Simple bullet-proof 2x2 image grid with gentle parallax drift */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setMouse({ x: 0, y: 0 })}
          className="relative h-full w-full grid grid-cols-2 grid-rows-2 gap-3 sm:gap-4"
        >
          {images.map((item, i) => {
            const thumb = item.thumb_large || item.thumb || item.thumb_small || '';
            return (
              <div
                key={item.id}
                className="relative rounded-2xl overflow-hidden shadow-2xl glass-hairline transition-opacity duration-700"
                style={{ opacity: hasEntered ? 1 : 0, transitionDelay: `${i * 80}ms` }}
              >
                <div
                  className="w-full h-full transition-transform duration-200 ease-out will-change-transform"
                  style={{ transform: `translate(${mouse.x * DEPTHS[i]}px, ${mouse.y * DEPTHS[i]}px)` }}
                >
                  {thumb ? (
                    <img src={thumb} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ background: theme.gradientFrom }} />
                  )}
                </div>
              </div>
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
        <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
      </button>
    </div>
  );
};
