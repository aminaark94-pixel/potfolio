export type MediaType = 'image' | 'video' | 'gif' | 'pdf' | 'webp';

export interface PortfolioItem {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  drive_link: string | null;
  behance_link: string | null;
  thumb: string | null;
  thumb_small: string | null;
  thumb_large: string | null;
  mediaType: MediaType;
  keywords: string[];
  custom?: boolean;
  featured?: boolean;
}

export type ThemeId = 
  | 'rust' 
  | 'emerald' 
  | 'gold' 
  | 'indigo' 
  | 'crimson' 
  | 'cyber' 
  | 'violet' 
  | 'minimal';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  accent: string;
  accentSoft: string;
  accentGlow: string;
  bg: string;
  bgElev: string;
  bgElev2: string;
  text: string;
  textDim: string;
  border: string;
  gradientFrom: string;
  gradientTo: string;
}

export type HeroStyle = 'fluid-blob' | 'editorial' | 'minimal-glow' | 'cyber-grid' | 'luxury-split';

export interface ClientFeedback {
  liked?: boolean;
  rating?: number;
  comment?: string;
  timestamp?: string;
}

export interface Showcase {
  id: string;
  slug: string;
  brand_name: string;
  heading: string;
  tagline: string;
  logo_url: string;
  item_ids: string[];
  theme: ThemeId;
  heroStyle: HeroStyle;
  pinProtection?: string; // Optional password/PIN
  clientNote?: string;
  contactEmail?: string;
  contactWhatsapp?: string;
  ctaText?: string;
  ctaLink?: string;
  // Controls how items render when the client is viewing "All" categories:
  // 'grouped' shows separate sections per category with headers, 'flow'
  // shows every item together in one continuous gallery.
  layoutMode?: 'grouped' | 'flow';
  // Which hero design to show at the top of the client page. Undefined/
  // 'classic' = the original hero (unchanged, safe default for every
  // existing showcase). 'animated-mosaic' = new mouse-parallax image
  // mosaic hero with a peek of the gallery below.
  heroTemplate?: 'classic' | 'animated-mosaic';
  // Which items (by id) to feature in the animated-mosaic hero. If empty/
  // undefined, the hero auto-picks the first 5-8 items from item_ids.
  heroImageIds?: string[];
  feedback?: Record<string, ClientFeedback>;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySummary {
  name: string;
  count: number;
  iconName?: string;
}

export interface UserProfile {
  fullName: string;
  roleTitle: string;
  bio: string;
  email: string;
  phone?: string;
  location?: string;
  website?: string;
}

export interface CoverLetterStyle {
  id: string;
  name: string;
  description?: string;
  sampleText: string;
  isDefault?: boolean;
  createdAt: string;
}

export interface CoverLetterGenerationResult {
  coverLetter: string;
  showcaseLink: string;
  showcaseLinks?: string[];
  showcaseSlug: string;
  showcaseHeading: string;
  clientNameDetected?: string | null;
  specialistTitle?: string;
  catalogSize?: number;
  matchedItemIds: string[];
  matchedItems: PortfolioItem[];
  showcase: Showcase | null;
  provider: string;
  matchingProvider?: string;
  templateUsed?: string | null;
  usedExistingShowcases?: boolean;
  skippedCoverLetter?: boolean;
}

export interface PortfolioTemplate {
  id: string;
  name: string;
  tags: string[];
  item_ids: string[];
  createdAt: string;
  updatedAt: string;
}
