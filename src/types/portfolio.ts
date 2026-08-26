export type MediaType = 'image' | 'video' | 'gif' | 'pdf' | 'webp';

export interface PortfolioItem {
  id: string;
  name: string;
  category: string;
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
  feedback?: Record<string, ClientFeedback>;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySummary {
  name: string;
  count: number;
  iconName?: string;
}
