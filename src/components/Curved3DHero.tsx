/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Showcase, PortfolioItem, ThemeConfig } from '../types/portfolio';

interface Curved3DHeroProps {
  showcase: Showcase;
  featuredItems: PortfolioItem[];
  theme: ThemeConfig;
  onScrollToGallery: () => void;
}

// Ported from the reference "Weichie" 3D curved carousel: cards arranged
// on a virtual cylinder, dragged/scrolled/wheeled through, with inertial
// lerp physics for a smooth glide instead of a hard snap, plus a subtle
// mirror-floor reflection under the active card.
export const Curved3DHero: React.FC<Curved3DHeroProps> = ({
  showcase,
  featuredItems,
  theme,
  onScrollToGallery,
}) => {
  const items = featuredItems.slice(0, 7);
  const containerRef = useRef<HTMLDivElement>(null);

  // Start from center: if 7 items, start at item 3 (middle)
  const startIndex = Math.floor(items.length / 2);
  
  const [targetOffset, setTargetOffset] = useState(startIndex);
  const [currentOffset, setCurrentOffset] = useState(startIndex);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);

  const requestRef = useRef(0);
  const targetOffsetRef = useRef(0);
  const currentOffsetRef = useRef(0);
  targetOffsetRef.current = targetOffset;
  currentOffsetRef.current = currentOffset;

  // Inertial lerp: currentOffset glides smoothly towards targetOffset.
  useEffect(() => {
    const tick = () => {
      const diff = targetOffsetRef.current - currentOffsetRef.current;
      if (Math.abs(diff) > 0.0005) {
        setCurrentOffset(currentOffsetRef.current + diff * 0.14);
      }
      requestRef.current = requestAnimationFrame(tick);
    };
    requestRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  // Horizontal mouse-wheel support
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
        e.preventDefault();
        const step = (e.deltaX || e.deltaY) * 0.002;
        setTargetOffset((prev) => Math.max(-0.5, Math.min(items.length - 0.5, prev + step)));
      }
    },
    [items.length]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    setDragStartX(clientX);
    setDragStartOffset(currentOffsetRef.current);
  };
  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    const deltaX = clientX - dragStartX;
    const cardStep = 380;
    const next = dragStartOffset - deltaX / cardStep;
    setTargetOffset(Math.max(-0.5, Math.min(items.length - 0.5, next)));
  };
  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setTargetOffset((prev) => Math.round(Math.max(0, Math.min(items.length - 1, prev))));
  };

  const goTo = (i: number) => setTargetOffset(i);
  const next = () => setTargetOffset((p) => Math.min(items.length - 1, Math.round(p) + 1));
  const prev = () => setTargetOffset((p) => Math.max(0, Math.round(p) - 1));

  const activeIndex = Math.max(0, Math.min(items.length - 1, Math.round(currentOffset)));
  const activeItem = items[activeIndex];

  if (items.length === 0) return null;

  return (
    <div className="relative w-full pt-4 pb-8 select-none overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 mb-4 flex items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-space-mono uppercase font-bold tracking-wider glass-chip glass-text-secondary w-fit">
            Curated Portfolio Showcase
          </span>
          <h1 className="mt-3 font-roboto text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight glass-text-primary leading-[1.12]">
            {showcase.heading && showcase.heading.trim() ? showcase.heading : 'Custom Portfolio'}
          </h1>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <button
            onClick={prev}
            disabled={targetOffset <= 0}
            className="w-9 h-9 rounded-full flex items-center justify-center border glass-hairline disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-70 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 glass-text-primary" />
          </button>
          <button
            onClick={next}
            disabled={targetOffset >= items.length - 1}
            className="w-9 h-9 rounded-full flex items-center justify-center border glass-hairline disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-70 transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 glass-text-primary" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full h-[280px] sm:h-[360px] lg:h-[400px] flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{ perspective: '1400px', perspectiveOrigin: '50% 48%' }}
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onMouseMove={(e) => handleDragMove(e.clientX)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={handleDragEnd}
      >
        <div className="relative w-full h-full flex items-center justify-center pointer-events-none" style={{ transformStyle: 'preserve-3d' }}>
          {items.map((item, i) => {
            const diff = i - currentOffset;
            const rotateY = -diff * 24;
            const translateZ = -Math.pow(Math.abs(diff), 1.25) * 80;
            const cardWidth = 300;
            const translateX = diff * cardWidth;
            const scale = Math.max(0.72, 1 - Math.abs(diff) * 0.06);
            const opacity = Math.max(0.15, 1 - Math.abs(diff) * 0.25);
            const zIndex = Math.round(100 - Math.abs(diff) * 10);
            const isCenter = Math.abs(diff) < 0.5;
            const thumb = item.thumb_large || item.thumb || item.thumb_small || '';

            return (
              <div
                key={item.id}
                onClick={() => goTo(i)}
                className="absolute top-1/2 left-1/2 w-[200px] sm:w-[260px] md:w-[300px] h-[240px] sm:h-[300px] md:h-[340px] -mt-[120px] sm:-mt-[150px] md:-mt-[170px] -ml-[100px] sm:-ml-[130px] md:-ml-[150px] rounded-3xl cursor-pointer will-change-transform pointer-events-auto overflow-hidden shadow-2xl glass-hairline"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  opacity,
                  zIndex,
                }}
              >
                {thumb ? (
                  <img src={thumb} alt={item.name} draggable={false} className="w-full h-full object-cover pointer-events-none" />
                ) : (
                  <div className="w-full h-full" style={{ background: theme.gradientFrom }} />
                )}

                {/* Mirror floor reflection */}
                <div
                  className="absolute top-full left-0 w-full h-[80px] sm:h-[100px] mt-3 rounded-3xl overflow-hidden pointer-events-none opacity-20"
                  style={{
                    transform: 'scaleY(-1)',
                    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 80%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 80%)',
                  }}
                >
                  {thumb && <img src={thumb} alt="" className="w-full h-full object-cover" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active item banner + dots + scroll-to-gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 mt-4">
        <div className="p-4 sm:p-6 rounded-2xl glass-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-space-mono font-bold uppercase tracking-wider" style={{ color: theme.gradientFrom }}>
              {activeItem?.category}
            </span>
            <h3 className="font-roboto font-bold text-lg sm:text-xl glass-text-primary mt-0.5">
              {activeItem?.name}
            </h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              {items.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => goTo(idx)}
                  title={item.name}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${activeIndex === idx ? 'w-6' : 'w-1.5 opacity-40 hover:opacity-70'}`}
                  style={{ background: theme.gradientFrom }}
                />
              ))}
            </div>
            <button
              onClick={onScrollToGallery}
              className="px-5 py-2.5 rounded-full text-white text-xs font-bold tracking-wide cursor-pointer whitespace-nowrap"
              style={{ background: theme.gradientFrom }}
            >
              View Gallery
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
