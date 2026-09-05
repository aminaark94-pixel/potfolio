/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PortfolioItem, ThemeConfig } from '../types/portfolio';

interface ParallaxScrollGalleryProps {
  items: PortfolioItem[];
  theme: ThemeConfig;
  onOpenLightbox: (item: PortfolioItem) => void;
}

// Ported from the reference "Weichie" scroll-parallax grid: as a card
// travels through the viewport, its image slides vertically inside the
// card's fixed frame (not the whole card moving) — a classic reveal-style
// parallax. Alternating base speeds per item plus a left/right column
// split with the right column offset downward creates the staggered,
// asymmetric layout look.
export const ParallaxScrollGallery: React.FC<ParallaxScrollGalleryProps> = ({
  items,
  theme,
  onOpenLightbox,
}) => {
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [scrollProgressMap, setScrollProgressMap] = useState<Record<string, number>>({});

  const updateCardParallax = useCallback(() => {
    const windowH = window.innerHeight;
    const newProgress: Record<string, number> = {};

    cardRefs.current.forEach((el, id) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const totalDist = windowH + rect.height;
      const currentDist = windowH - rect.top;
      const rawProgress = currentDist / totalDist;
      const centeredProgress = (rawProgress - 0.5) * 2;
      newProgress[id] = Math.max(-1.5, Math.min(1.5, centeredProgress));
    });

    setScrollProgressMap(newProgress);
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    const handleScroll = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(updateCardParallax);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    updateCardParallax();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, [updateCardParallax]);

  // Auto-assign column (alternating) and base parallax speed per item,
  // since portfolio items don't carry that metadata themselves.
  const leftItems = items.filter((_, i) => i % 2 === 0);
  const rightItems = items.filter((_, i) => i % 2 === 1);
  const speedFor = (i: number) => (i % 2 === 0 ? -12 : -18);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
      <div className="flex flex-col gap-16">
        {leftItems.map((item, i) => (
          <ParallaxCard
            key={item.id}
            item={item}
            progress={scrollProgressMap[item.id] ?? 0}
            baseParallax={speedFor(i)}
            theme={theme}
            onOpen={() => onOpenLightbox(item)}
            setRef={(el) => {
              if (el) cardRefs.current.set(item.id, el);
              else cardRefs.current.delete(item.id);
            }}
          />
        ))}
      </div>
      <div className="flex flex-col gap-16 md:mt-28">
        {rightItems.map((item, i) => (
          <ParallaxCard
            key={item.id}
            item={item}
            progress={scrollProgressMap[item.id] ?? 0}
            baseParallax={speedFor(i + 1)}
            theme={theme}
            onOpen={() => onOpenLightbox(item)}
            setRef={(el) => {
              if (el) cardRefs.current.set(item.id, el);
              else cardRefs.current.delete(item.id);
            }}
          />
        ))}
      </div>
    </div>
  );
};

interface ParallaxCardProps {
  key?: string;
  item: PortfolioItem;
  progress: number;
  baseParallax: number;
  theme: ThemeConfig;
  onOpen: () => void;
  setRef: (el: HTMLDivElement | null) => void;
}

function ParallaxCard({ item, progress, baseParallax, theme, onOpen, setRef }: ParallaxCardProps) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const thumb = item.thumb_large || item.thumb || item.thumb_small || '';

  const scale = 1 + (Math.abs(baseParallax) * 2.4) / 100;
  const yPercent = -progress * baseParallax;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 6, y: -y * 6 });
  };

  return (
    <article
      ref={setRef}
      className="flex flex-col group cursor-pointer"
      onClick={onOpen}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setIsHovered(false); }}
      onMouseMove={handleMouseMove}
    >
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl glass-hairline transition-all duration-500">
        <div
          className="w-full h-full relative transition-transform duration-200 ease-out"
          style={{ transform: `perspective(1000px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)` }}
        >
          <div
            className="absolute inset-0 w-full h-full will-change-transform"
            style={{ transform: `translate3d(0, ${yPercent}%, 0) scale(${scale})` }}
          >
            {thumb ? (
              <img
                src={thumb}
                alt={item.name}
                loading="lazy"
                className={`w-full h-full object-cover transition-transform duration-700 ease-out ${isHovered ? 'scale-105' : 'scale-100'}`}
              />
            ) : (
              <div className="w-full h-full" style={{ background: theme.gradientFrom }} />
            )}
          </div>
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>

      <div className="pt-5 flex flex-col">
        <span className="text-[10px] font-space-mono font-bold tracking-[0.2em] uppercase mb-1.5" style={{ color: theme.gradientFrom }}>
          {item.category}
        </span>
        <h3 className="font-roboto font-bold text-xl sm:text-2xl tracking-tight glass-text-primary group-hover:opacity-80 transition-opacity">
          {item.name}
        </h3>
      </div>
    </article>
  );
}
