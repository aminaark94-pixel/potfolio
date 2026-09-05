/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Showcase, PortfolioItem, ThemeConfig } from '../types/portfolio';

interface AnimatedMosaicHeroProps {
  showcase: Showcase;
  featuredItems: PortfolioItem[];
  theme: ThemeConfig;
  onScrollToGallery: () => void;
}

// Layout for each of the 7 photo slots: position/size (as % of the collage
// box), a drag "speed" multiplier (how far it travels relative to the
// pointer), and whether it's shown in grayscale — ported directly from the
// reference design so the collage keeps its exact asymmetric, layered look
// no matter which images are dropped into it.
const SLOTS = [
  { left: '7%', top: '8%', width: '34%', height: '31%', speed: 0.5, grayscale: true },
  { left: '30%', top: '3%', width: '33%', height: '68%', speed: 1, grayscale: false },
  { left: '-1%', top: '38%', width: '33%', height: '60%', speed: 0.8, grayscale: false },
  { left: '36%', top: '66%', width: '33%', height: '29%', speed: 1.25, grayscale: true },
  { left: '66%', top: '4%', width: '32%', height: '34%', speed: 0.9, grayscale: false },
  { left: '68%', top: '42%', width: '30%', height: '32%', speed: 1.15, grayscale: true },
  { left: '64%', top: '76%', width: '28%', height: '20%', speed: 0.65, grayscale: false },
];

export const AnimatedMosaicHero: React.FC<AnimatedMosaicHeroProps> = ({
  showcase,
  featuredItems,
  theme,
  onScrollToGallery,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const imgRefs = useRef<Array<HTMLDivElement | null>>([]);
  const images = featuredItems.slice(0, SLOTS.length);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const els = imgRefs.current.filter(Boolean) as HTMLDivElement[];
    if (els.length === 0) return;

    // Per-image animation state (kept in refs/plain objects, not React
    // state, so the 60fps loop below never triggers a re-render).
    const state = els.map((_, i) => ({
      rawX: 0,
      rawY: 0,
      vx: 0,
      vy: 0,
      ampX: 12 + (i % 3) * 5,
      ampY: 10 + ((i + 1) % 3) * 5,
      freqX: 0.0008 + i * 0.0001,
      freqY: 0.0006 + i * 0.0001,
      phase: i * 1.5,
    }));

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    let rafId = 0;

    const FRICTION = 0.92;
    const STOP_THRESHOLD = 0.01;
    const BOUND = 140;
    const SOFT_FACTOR = 0.25;

    function elastic(raw: number, bound: number) {
      const abs = Math.abs(raw);
      if (abs <= bound) return raw;
      const over = abs - bound;
      const softened = bound + over * SOFT_FACTOR;
      return raw < 0 ? -softened : softened;
    }

    function applyTransform(i: number, t: number) {
      const s = state[i];
      const speed = SLOTS[i]?.speed || 1;
      const bound = BOUND * speed;
      const dragX = elastic(s.rawX, bound);
      const dragY = elastic(s.rawY, bound);
      const idleX = Math.sin(t * s.freqX + s.phase) * s.ampX;
      const idleY = Math.cos(t * s.freqY + s.phase) * s.ampY;
      els[i].style.transform = `translate(${dragX + idleX}px, ${dragY + idleY}px)`;
    }

    function pointerPos(e: MouseEvent | TouchEvent) {
      if ('touches' in e && e.touches.length) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      const me = e as MouseEvent;
      return { x: me.clientX, y: me.clientY };
    }

    function onDown(e: MouseEvent | TouchEvent) {
      dragging = true;
      track?.classList.add('cursor-grabbing');
      const p = pointerPos(e);
      lastX = p.x;
      lastY = p.y;
      lastT = performance.now();
    }

    function onMove(e: MouseEvent | TouchEvent) {
      if (!dragging) return;
      const p = pointerPos(e);
      const now = performance.now();
      const dt = Math.max(now - lastT, 1);
      const dx = p.x - lastX;
      const dy = p.y - lastY;

      els.forEach((_, i) => {
        const speed = SLOTS[i]?.speed || 1;
        const s = state[i];
        s.rawX += dx * speed;
        s.rawY += dy * speed;
        s.vx = (dx * speed) / dt;
        s.vy = (dy * speed) / dt;
      });

      lastX = p.x;
      lastY = p.y;
      lastT = now;
      if (e.cancelable) e.preventDefault();
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      track?.classList.remove('cursor-grabbing');
    }

    function tick(t: number) {
      els.forEach((_, i) => {
        const s = state[i];
        if (!dragging) {
          s.rawX += s.vx * 16;
          s.rawY += s.vy * 16;
          s.vx *= FRICTION;
          s.vy *= FRICTION;
          if (Math.abs(s.vx) < STOP_THRESHOLD && Math.abs(s.vy) < STOP_THRESHOLD) {
            s.rawX += (0 - s.rawX) * 0.05;
            s.rawY += (0 - s.rawY) * 0.05;
            s.vx = 0;
            s.vy = 0;
          }
        }
        applyTransform(i, t);
      });
      rafId = requestAnimationFrame(tick);
    }

    track.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    track.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      track.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      track.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.map((i) => i.id).join(',')]);

  return (
    <div className="relative w-full overflow-hidden px-4 sm:px-6 lg:px-10 pt-2 pb-10">
      <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[1fr_1.15fr] gap-5 lg:gap-8 items-center">
        {/* Side text */}
        <div className="relative z-30 space-y-4 max-w-xl">
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
            <p className="text-sm sm:text-base glass-text-secondary font-inter leading-relaxed max-w-xs">
              {showcase.tagline}
            </p>
          )}
          <button
            onClick={onScrollToGallery}
            className="inline-block px-6 py-3.5 rounded-lg text-white text-[13px] font-bold tracking-wide transition-transform hover:-translate-y-0.5 cursor-pointer"
            style={{ background: theme.gradientFrom }}
          >
            View Gallery
          </button>
        </div>

        {/* Draggable / idle-drifting photo collage */}
        <div
          className="relative w-full mx-auto lg:ml-auto"
          style={{ maxWidth: '760px', height: 'min(37vw, 380px)', touchAction: 'pan-y' }}
        >
          <div ref={trackRef} className="absolute inset-0 cursor-grab select-none">
            {/* Rust accent block */}
            <div
              className="absolute z-0"
              style={{ left: '62%', top: '54%', width: '4%', height: '20%', background: theme.gradientFrom }}
            />

            {images.map((item, i) => {
              const slot = SLOTS[i];
              const thumb = item.thumb_large || item.thumb || item.thumb_small || '';
              return (
                <div
                  key={item.id}
                  ref={(el) => { imgRefs.current[i] = el; }}
                  className="absolute overflow-hidden shadow-2xl bg-slate-300"
                  style={{
                    left: slot.left,
                    top: slot.top,
                    width: slot.width,
                    height: slot.height,
                    willChange: 'transform',
                  }}
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={item.name}
                      draggable={false}
                      className="w-full h-full object-cover pointer-events-none"
                      style={slot.grayscale ? { filter: 'grayscale(1) contrast(1.05)' } : undefined}
                    />
                  ) : (
                    <div className="w-full h-full" style={{ background: theme.gradientFrom }} />
                  )}
                </div>
              );
            })}

            {/* Decorative marks */}
            <div className="absolute text-2xl font-light glass-text-primary pointer-events-none" style={{ left: '27%', top: '9%' }}>+</div>
            <div className="absolute text-2xl font-light glass-text-primary pointer-events-none" style={{ left: '68%', top: '64%' }}>+</div>
            <div className="absolute pointer-events-none" style={{ right: 0, top: '6%', width: '22px', height: '22px', background: theme.gradientFrom }} />

            <button
              onClick={onScrollToGallery}
              className="absolute pointer-events-auto cursor-pointer glass-text-primary hover:opacity-70 transition-opacity"
              style={{ left: '33%', top: '82%', width: '16px', height: '44px' }}
              title="Scroll to gallery"
            >
              <svg viewBox="0 0 16 60" className="w-full h-full">
                <line x1="8" y1="0" x2="8" y2="48" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 44 L8 52 L14 44" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>

          <div className="absolute left-1/2 -bottom-7 -translate-x-1/2 text-[10px] tracking-widest uppercase glass-text-muted opacity-70 pointer-events-none">
            Drag to move
          </div>
        </div>
      </div>
    </div>
  );
};
