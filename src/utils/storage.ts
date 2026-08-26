import { Showcase, PortfolioItem } from '../types/portfolio';
import { initializeCatalog } from '../data/rawPortfolioData';
import { THEMES } from '../data/themes';

const SHOWCASES_STORAGE_KEY = 'studio_portfolio_showcases_v1';
const CUSTOM_ITEMS_STORAGE_KEY = 'studio_portfolio_custom_items_v1';

export function getInitialShowcases(): Record<string, Showcase> {
  return {
    'new-client-f0c7': {
      id: 'showcase-1',
      slug: 'new-client-f0c7',
      brand_name: 'Studio Design Co.',
      heading: 'New Client Selection',
      tagline: 'A selection of work, put together specifically for your brand vision.',
      logo_url: '',
      item_ids: ['1', '2', '3', '4', '7', '8', '29', '30', '31', '52', '53', '55'],
      theme: 'rust',
      heroStyle: 'fluid-blob',
      clientNote: 'Hello! We carefully assembled these selected case studies and visual identity concepts for your upcoming launch. Click any item to explore full resolution.',
      ctaText: 'Approve & Schedule Kickoff',
      ctaLink: 'mailto:contact@studio.example.com?subject=Showcase%20Approval',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      feedback: {},
    },
    'apex-logistics-e4a1': {
      id: 'showcase-2',
      slug: 'apex-logistics-e4a1',
      brand_name: 'Vanguard Design Studio',
      heading: 'Apex Global Logistics',
      tagline: 'Corporate identity, fleet visual system, and digital application design.',
      logo_url: '',
      item_ids: ['32', '33', '34', '54', '55', '56', '57', '74', '75', '84', '85'],
      theme: 'cyber',
      heroStyle: 'cyber-grid',
      clientNote: 'Custom brand identity package and mobile terminal UI concepts created for your fleet operations.',
      ctaText: 'Request Revisions',
      ctaLink: 'mailto:studio@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      feedback: {},
    },
    'luxe-hospitality-9b2c': {
      id: 'showcase-3',
      slug: 'luxe-hospitality-9b2c',
      brand_name: 'Atelier Maison',
      heading: 'The Sovereign Collection',
      tagline: 'Luxury hospitality branding, bespoke collateral, and editorial merchandise.',
      logo_url: '',
      item_ids: ['86', '87', '88', '89', '90', '91', '92', '93', '94', '95', '96', '97'],
      theme: 'gold',
      heroStyle: 'luxury-split',
      clientNote: 'Curated packaging, staff workwear, and print collateral tailored for five-star hospitality.',
      ctaText: 'Download Presentation Kit',
      ctaLink: '#',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      feedback: {},
    },
  };
}

export function loadStoredShowcases(): Record<string, Showcase> {
  try {
    const raw = localStorage.getItem(SHOWCASES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load showcases from localStorage', e);
  }
  const defaults = getInitialShowcases();
  saveStoredShowcases(defaults);
  return defaults;
}

export function saveStoredShowcases(showcases: Record<string, Showcase>): void {
  try {
    localStorage.setItem(SHOWCASES_STORAGE_KEY, JSON.stringify(showcases));
  } catch (e) {
    console.error('Failed to save showcases to localStorage', e);
  }
}

export function loadStoredCustomItems(): PortfolioItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_ITEMS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load custom items from localStorage', e);
  }
  return [];
}

export function saveStoredCustomItems(items: PortfolioItem[]): void {
  try {
    localStorage.setItem(CUSTOM_ITEMS_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save custom items to localStorage', e);
  }
}

export function getAllPortfolioItems(): PortfolioItem[] {
  const base = initializeCatalog();
  const custom = loadStoredCustomItems();
  return [...custom, ...base];
}

export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || 'showcase';
}

/**
 * Generate Standalone, Zero-Dependency HTML File
 * Matches the requested feature to export and email clients direct HTML files.
 */
export function generateStandaloneHTML(showcase: Showcase, items: PortfolioItem[]): string {
  const theme = THEMES[showcase.theme] || THEMES.rust;
  const showcaseItems = showcase.item_ids
    .map((id) => items.find((it) => it.id === id))
    .filter(Boolean) as PortfolioItem[];

  // Group by category
  const categories: Record<string, PortfolioItem[]> = {};
  showcaseItems.forEach((it) => {
    if (!categories[it.category]) categories[it.category] = [];
    categories[it.category].push(it);
  });

  const cardsHtml = Object.entries(categories)
    .map(([category, catItems]) => {
      const itemCards = catItems
        .map(
          (it) => `
        <div class="card" tabindex="0" role="button"
             data-full="${it.thumb_large || it.thumb || ''}"
             data-link="${it.drive_link || '#'}"
             data-name="${escapeHtml(it.name)}"
             data-cat="${escapeHtml(it.category)}"
             onclick="openLightbox(this)" onkeypress="if(event.key==='Enter')openLightbox(this)">
            <div class="card-img-wrap">
              <img src="${it.thumb || it.thumb_large || ''}" loading="lazy" alt="${escapeHtml(it.name)}" />
            </div>
            <div class="card-overlay">
                <div class="card-name">${escapeHtml(it.name)}</div>
                <div class="card-cat">${escapeHtml(it.category)}</div>
            </div>
        </div>`
        )
        .join('');

      return `
      <div class="cat-section">
        <div class="cat-heading">
          <span>${escapeHtml(category)}</span>
          <span class="cat-count">${catItems.length}</span>
        </div>
        <div class="masonry">${itemCards}</div>
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(showcase.brand_name)} — ${escapeHtml(showcase.heading)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
    background: ${theme.bg};
    color: ${theme.text};
    font-family: 'Inter', sans-serif;
    min-height: 100vh;
    overflow-x: hidden;
}
.wrap { max-width: 1360px; margin: 0 auto; padding: 2rem 2rem 5rem 2rem; }

@keyframes fluidBlob {
    0% { border-radius: 42% 58% 65% 35% / 45% 40% 60% 55%; transform: rotate(0deg) scale(1); }
    50% { border-radius: 60% 40% 30% 70% / 55% 65% 35% 45%; transform: rotate(25deg) scale(1.06); }
    100% { border-radius: 42% 58% 65% 35% / 45% 40% 60% 55%; transform: rotate(0deg) scale(1); }
}

@keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
}

.site-header {
    position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
    display: flex; justify-content: space-between; align-items: center; gap: 1rem;
    padding: 16px 2.5rem; background: rgba(10,10,12,0.6);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid ${theme.border};
    transition: all 0.3s ease;
}
.site-header.scrolled {
    background: rgba(10,10,12,0.95); padding: 12px 2.5rem;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}
.site-logo { display: flex; align-items: center; gap: 0.75rem; }
.site-logo-mark {
    width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center;
    justify-content: center; background: linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo});
    color: #fff; font-size: 1.1rem; box-shadow: 0 4px 14px ${theme.accentGlow};
}
.site-logo img { height: 32px; border-radius: 8px; }
.site-brand { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.15rem; color: ${theme.text}; }
.site-client { font-family: 'Space Mono', monospace; font-size: 0.75rem; color: ${theme.textDim}; text-transform: uppercase; letter-spacing: 0.08em; }
.site-client span { color: ${theme.accentSoft}; font-weight: 700; }

.header-spacer { height: 90px; }

.hero-wrap {
    position: relative; padding: 4rem 0 3rem 0; min-height: 40vh;
    display: flex; flex-direction: column; justify-content: center;
    overflow: hidden;
}
.hero-blob {
    position: absolute; top: -15%; right: -5%; width: 480px; height: 480px;
    background: radial-gradient(circle at 30% 30%, ${theme.gradientFrom}, ${theme.gradientTo} 75%);
    opacity: 0.75; filter: blur(30px);
    animation: fluidBlob 14s ease-in-out infinite;
    z-index: 0; pointer-events: none;
}
.hero-eyebrow {
    font-family: 'Space Mono', monospace; color: ${theme.accentSoft};
    font-size: 0.85rem; letter-spacing: 0.2em; text-transform: uppercase;
    animation: fadeUp 0.6s ease both; position: relative; z-index: 1; margin-bottom: 0.6rem;
}
.hero-title {
    font-family: 'Archivo Black', sans-serif; color: ${theme.text};
    font-size: clamp(2.4rem, 6vw, 4.5rem); line-height: 1.05;
    animation: fadeUp 0.8s ease both 0.1s; position: relative; z-index: 1; margin-bottom: 1.2rem;
}
.hero-title span { color: ${theme.accent}; }
.hero-sub {
    color: ${theme.textDim}; font-size: 1.15rem; max-width: 600px;
    line-height: 1.6; animation: fadeUp 1s ease both 0.2s; position: relative; z-index: 1;
}

.cat-section { margin-top: 3.5rem; animation: fadeUp 0.8s ease both; }
.cat-heading {
    font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 1.4rem;
    color: ${theme.text}; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.8rem;
    padding-bottom: 0.75rem; border-bottom: 1px solid ${theme.border};
}
.cat-count {
    font-family: 'Space Mono', monospace; font-size: 0.75rem; background: ${theme.bgElev2};
    color: ${theme.accentSoft}; padding: 3px 9px; border-radius: 999px; border: 1px solid ${theme.border};
}

.masonry {
    column-count: 3; column-gap: 20px;
}
@media (max-width: 1024px) { .masonry { column-count: 2; } }
@media (max-width: 640px) { .masonry { column-count: 1; } .wrap { padding: 1rem 1rem 4rem 1rem; } }

.card {
    break-inside: avoid; margin-bottom: 20px; position: relative;
    border-radius: 14px; overflow: hidden; border: 1px solid ${theme.border};
    background: ${theme.bgElev}; cursor: pointer; transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}
.card:hover {
    transform: translateY(-4px);
    border-color: ${theme.accent};
    box-shadow: 0 12px 32px ${theme.accentGlow};
}
.card-img-wrap { overflow: hidden; background: #000; }
.card img {
    width: 100%; display: block; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), filter 0.6s ease;
}
.card:hover img { transform: scale(1.05); filter: brightness(0.7); }
.card-overlay {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    justify-content: flex-end; padding: 18px; opacity: 0; transition: opacity 0.3s ease;
    background: linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.9) 100%);
}
.card:hover .card-overlay { opacity: 1; }
.card-name { font-family: 'Space Grotesk', sans-serif; font-weight: 700; color: #fff; font-size: 1.05rem; }
.card-cat { font-family: 'Space Mono', monospace; color: ${theme.accentSoft}; font-size: 0.75rem; text-transform: uppercase; margin-top: 4px; }

.footer-section {
    margin-top: 5rem; padding-top: 2.5rem; border-top: 1px solid ${theme.border};
    text-align: center; color: ${theme.textDim}; font-family: 'Space Mono', monospace; font-size: 0.85rem;
}

/* Lightbox */
.lightbox {
    display: none; position: fixed; inset: 0; z-index: 2000;
    background: rgba(6,6,8,0.96); backdrop-filter: blur(12px);
    align-items: center; justify-content: center; padding: 2rem;
}
.lightbox.open { display: flex; animation: fadeUp 0.25s ease both; }
.lightbox-inner { max-width: 1200px; width: 100%; text-align: center; }
.lightbox img {
    max-width: 100%; max-height: 78vh; border-radius: 12px;
    box-shadow: 0 25px 80px rgba(0,0,0,0.7); margin: 0 auto; display: block;
}
.lightbox-caption {
    margin-top: 1.2rem; display: flex; justify-content: space-between; align-items: center;
    flex-wrap: wrap; gap: 1rem; background: ${theme.bgElev}; padding: 12px 20px;
    border-radius: 10px; border: 1px solid ${theme.border};
}
.lightbox-name { font-family: 'Space Grotesk', sans-serif; font-size: 1.1rem; font-weight: 700; color: #fff; text-align: left; }
.lightbox-cat { font-family: 'Space Mono', monospace; color: ${theme.accentSoft}; font-size: 0.75rem; text-transform: uppercase; }
.lightbox-btn {
    font-family: 'Space Mono', monospace; font-size: 0.8rem; background: ${theme.accent};
    color: #fff; padding: 8px 16px; border-radius: 8px; text-decoration: none;
    transition: opacity 0.2s ease;
}
.lightbox-btn:hover { opacity: 0.85; }
.lightbox-close {
    position: fixed; top: 24px; right: 32px; background: none; border: none;
    color: #fff; font-size: 2.4rem; cursor: pointer; opacity: 0.7; transition: opacity 0.2s ease;
}
.lightbox-close:hover { opacity: 1; }
</style>
</head>
<body>
<header class="site-header" id="siteHeader">
    <div class="site-logo">
        ${showcase.logo_url ? `<img src="${showcase.logo_url}" alt="Logo" />` : `<div class="site-logo-mark">◆</div>`}
        <div class="site-brand">${escapeHtml(showcase.brand_name)}</div>
    </div>
    <div class="site-client">Showcase for <span>${escapeHtml(showcase.heading)}</span></div>
</header>
<div class="header-spacer"></div>
<div class="wrap">
    <div class="hero-wrap">
        <div class="hero-blob"></div>
        <div class="hero-eyebrow">Curated Showcase</div>
        <h1 class="hero-title">${escapeHtml(showcase.heading)}</h1>
        <p class="hero-sub">${escapeHtml(showcase.tagline)}</p>
    </div>

    ${cardsHtml || '<div style="text-align:center; padding: 4rem; color: #888;">No items in this showcase yet.</div>'}

    <div class="footer-section">
        © ${escapeHtml(showcase.brand_name)} — Private Client Presentation.
    </div>
</div>

<div class="lightbox" id="lightbox">
    <button class="lightbox-close" onclick="closeLightbox()" aria-label="Close">&times;</button>
    <div class="lightbox-inner">
        <img id="lightboxImg" src="" alt="" />
        <div class="lightbox-caption">
            <div>
                <div class="lightbox-name" id="lightboxName"></div>
                <div class="lightbox-cat" id="lightboxCat"></div>
            </div>
            <a class="lightbox-btn" id="lightboxLink" href="#" target="_blank" rel="noopener">Open Full Asset ↗</a>
        </div>
    </div>
</div>

<script>
    var header = document.getElementById('siteHeader');
    window.addEventListener('scroll', function() {
        header.classList.toggle('scrolled', window.scrollY > 30);
    });

    var lightbox = document.getElementById('lightbox');
    function openLightbox(el) {
        document.getElementById('lightboxImg').src = el.getAttribute('data-full');
        document.getElementById('lightboxImg').alt = el.getAttribute('data-name');
        document.getElementById('lightboxName').textContent = el.getAttribute('data-name');
        document.getElementById('lightboxCat').textContent = el.getAttribute('data-cat');
        document.getElementById('lightboxLink').href = el.getAttribute('data-link');
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
        lightbox.classList.remove('open');
        document.body.style.overflow = '';
    }
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeLightbox();
    });
</script>
</body>
</html>`;
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
