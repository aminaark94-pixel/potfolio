import { PortfolioItem } from '../types/portfolio';

// Utility to convert Google Drive URL to high-speed CDN thumbnail
export function getDriveThumb(driveUrl: string | null, size: number = 800): string | null {
  if (!driveUrl) return null;
  // Using =w{size} (fix WIDTH, height scales naturally) instead of =s{size}
  // (fix the LONGEST side). For a very tall image like a stitched brand
  // guide, =s800 would shrink its width down to ~80-100px to make the
  // (much longer) height equal 800 — that's what caused the pixelation.
  // =w{size} keeps every image's width at full resolution regardless of
  // how long it runs, while square/logo images look identical either way.
  const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}=w${size}`;
  }
  if (driveUrl.includes('id=')) {
    const idMatch = driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${idMatch[1]}=w${size}`;
    }
  }
  return driveUrl;
}

export function detectMediaType(filename: string | null, driveUrl: string | null): 'image' | 'video' | 'gif' | 'pdf' | 'webp' {
  const str = ((filename || '') + ' ' + (driveUrl || '')).toLowerCase();
  if (str.includes('.mp4') || str.includes('.webm') || str.includes('.mov') || str.includes('video/')) return 'video';
  if (str.includes('.gif') || str.includes('image/gif')) return 'gif';
  if (str.includes('.pdf') || str.includes('application/pdf')) return 'pdf';
  if (str.includes('.webp') || str.includes('image/webp')) return 'webp';
  return 'image';
}

// Google Drive share links (.../view?usp=...) are HTML viewer pages, not raw
// video files — a browser <video src="..."> tag cannot play them directly.
// Drive's own embeddable "preview" URL streams correctly via <iframe> for
// any file size, so we use that for video playback instead.
export function getDriveVideoEmbed(driveUrl: string | null): string | null {
  if (!driveUrl) return null;
  const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return driveUrl;
}

// Initial Raw Categories and Items from Studio Dataset
export const INITIAL_ITEMS_RAW: Array<{
  name: string;
  category: string;
  drive_link: string;
  behance_link?: string | null;
  keywords?: string[];
}> = [
  // Packaging
  { name: "Lazuli Luxury Brand Identity & Packaging", category: "Packaging", drive_link: "https://drive.google.com/file/d/1Nsr0uCcsTyxQP3Tt7fWMPSYFHevavtAm/view?usp=drivesdk", keywords: ["luxury", "fashion", "brand", "identity", "packaging"] },
  { name: "Incanto Floral Product Packaging & Branding", category: "Packaging", drive_link: "https://drive.google.com/file/d/1PpKXZ2xxX59XRpIiphBmSPdppcY1HegX/view?usp=drivesdk", keywords: ["elegant", "floral", "cosmetics", "product"] },
  { name: "Farina E-commerce Mailer Box", category: "Packaging", drive_link: "https://drive.google.com/file/d/18-Q7hGKmy6OPNhZafCxnPPNxr-iSlmZA/view?usp=drivesdk", keywords: ["e-commerce", "mailer", "box", "fashion"] },
  { name: "Pinot Noir Wine Box Packaging", category: "Packaging", drive_link: "https://drive.google.com/file/d/1N9cYmQTPe0r0mXw5ynaLDiAuPlHfop1K/view?usp=drivesdk", keywords: ["wine", "box", "luxury", "beverage"] },
  { name: "Picnic & Kitchen Towel Paper Sleeve", category: "Packaging", drive_link: "https://drive.google.com/file/d/166y9a3TVwO0Kg2sgHbSYG3sRNLHdNkBK/view?usp=drivesdk", keywords: ["paper sleeve", "towel", "eco"] },
  { name: "Pet Mat Washable Packaging Sleeve", category: "Packaging", drive_link: "https://drive.google.com/file/d/15QbJNLTB0MweYf7mCUmrH0xf7f8wRQDW/view?usp=drivesdk", keywords: ["pet mat", "sleeve", "branding"] },
  { name: "Burts Bees Eco-friendly Lip Balm Paper Tube", category: "Packaging", drive_link: "https://drive.google.com/file/d/1DYme4eUCf-APOD_hQ7Ul4zHYpxhETQEI/view?usp=drivesdk", keywords: ["eco-friendly", "balm", "paper tube"] },
  { name: "Bareskin All-Natural Lip Balm Tube & Label", category: "Packaging", drive_link: "https://drive.google.com/file/d/1OI2S8gX389Qf9c-xkib2pmrwjmJxu9Qs/view?usp=drivesdk", keywords: ["natural", "balm", "tube", "label"] },
  { name: "Bolm Blister Card Packaging", category: "Packaging", drive_link: "https://drive.google.com/file/d/1tPZ16cU9EPc2EoR5PKbfh2j8c0AqOgdp/view?usp=drivesdk", keywords: ["blister card", "balm", "retail"] },
  { name: "Chapstick Organic Tube Design", category: "Packaging", drive_link: "https://drive.google.com/file/d/1MCaObXTq6q68rLTB9WM_G-MN_QsRUlKe/view?usp=drivesdk", keywords: ["chapstick", "organic", "cosmetics"] },
  { name: "Gravity Pickleball Sports Paddle Graphic", category: "Packaging", drive_link: "https://drive.google.com/file/d/1I2EwILL6pq5vp4rJPlOfC0P4NsXmtBMu/view?usp=drivesdk", keywords: ["pickleball", "paddle", "sports"] },
  { name: "Technology Pickleball Paddle Features", category: "Packaging", drive_link: "https://drive.google.com/file/d/1ntiZT6KYHgoP8kExv-CDRW6mcZ4vFh3T/view?usp=drivesdk", keywords: ["sports", "paddle", "infographic"] },
  { name: "Invikta Sports Advertisement Poster", category: "Packaging", drive_link: "https://drive.google.com/file/d/1HR-uOV7X9Wf0bBHiRNzYZ4PLhGXGGfra/view?usp=drivesdk", keywords: ["sports", "advertisement", "poster"] },
  { name: "Boomstik Pickleball Paddle Promotion", category: "Packaging", drive_link: "https://drive.google.com/file/d/1FS21iBaKQi8n152EaEI8TaK9GD8-sk3X/view?usp=drivesdk", keywords: ["pickleball", "promotional", "poster"] },
  { name: "Paddle E-commerce Infographic", category: "Packaging", drive_link: "https://drive.google.com/file/d/1lNRQs5Hl5XSH5SqbY0oLVofeB2yi53Ig/view?usp=drivesdk", keywords: ["infographic", "e-commerce", "sports"] },
  { name: "Kids Magnetic Star Chart Box", category: "Packaging", drive_link: "https://drive.google.com/file/d/1K5EV-BpqeEYSz4M9isZ_cPJrqVf1l0F3/view?usp=drivesdk", keywords: ["kids", "toy", "reward chart", "box"] },
  { name: "Organic Herbal Tea Box Packaging", category: "Packaging", drive_link: "https://drive.google.com/file/d/1iD8meS8c4RaY0E3Nomft7E1S0MwafuoT/view?usp=drivesdk", keywords: ["tea", "herbal", "organic", "box"] },
  { name: "Luxury Fine Jewelry Box Packaging", category: "Packaging", drive_link: "https://drive.google.com/file/d/1e7vqts1wMPF8oIEDnXxxLmi4VgWHGZ3S/view?usp=drivesdk", keywords: ["luxury", "jewelry", "box"] },
  { name: "Luxury Skincare Cosmetic Container", category: "Packaging", drive_link: "https://drive.google.com/file/d/12rc_rUjDaEQm69N5afRr4avDuva95oaO/view?usp=drivesdk", keywords: ["luxury", "skincare", "cosmetics"] },
  { name: "Scotch Whisky Bottle & Paper Wrap", category: "Packaging", drive_link: "https://drive.google.com/file/d/1bMudVurnLqS6p2QnoIG4IiO_zjAVubpN/view?usp=drivesdk", keywords: ["whisky", "bottle", "paper wrap"] },
  { name: "Coconut Water Bottle Packaging", category: "Packaging", drive_link: "https://drive.google.com/file/d/1m8b0xHGVMwZkOPPZvxk2hEZWKAw7U5dX/view?usp=drivesdk", keywords: ["coconut water", "beverage", "bottle"] },
  { name: "Organic Sparkling Lemon Glass Bottle", category: "Packaging", drive_link: "https://drive.google.com/file/d/116sJKz13kZWUKavzcoammukTQjHV6nAN/view?usp=drivesdk", keywords: ["sparkling", "lemon", "bottle", "label"] },
  { name: "Outdoor Stainless Steel Water Bottle", category: "Packaging", drive_link: "https://drive.google.com/file/d/16cj-VA-JeQuMkPMj6Xph3NfyiHofXAn7/view?usp=drivesdk", keywords: ["outdoor", "bottle", "adventure"] },
  { name: "Plant-Based Drink Carton Packaging", category: "Packaging", drive_link: "https://drive.google.com/file/d/18qnpuSt2LKBNN6Zq9LI9nstUU5G7xkeO/view?usp=drivesdk", keywords: ["plant-based", "carton", "drink"] },
  { name: "Hydrogen-Infused Water Bottle", category: "Packaging", drive_link: "https://drive.google.com/file/d/1abNXS5WGKY46k2UByOrGyr_qOxHcaNgq/view?usp=drivesdk", keywords: ["water", "bottle", "wellness"] },
  { name: "Alkaline Water Bottle Label", category: "Packaging", drive_link: "https://drive.google.com/file/d/1dAJjEEPA-Vg37rD3HemCOjlY6M7Q5qse/view?usp=drivesdk", keywords: ["alkaline", "water", "label"] },
  { name: "Natural Pure Spring Water Bottle", category: "Packaging", drive_link: "https://drive.google.com/file/d/1vOKjI2cq1WuEvt8SevDsYusM73ZsNQl2/view?usp=drivesdk", keywords: ["natural water", "spring", "branding"] },

  // Brand Identity
  { name: "Coo Kies Cookie Brand Identity & Packaging", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/15AjCSeOR7pXuJT0gpLrc6AUnqoeTsuOO/view?usp=drivesdk", keywords: ["cookie", "brand identity", "packaging"] },
  { name: "Coffee Shop Essential Design & Guide", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/1-NN-SkLmet3oO1KD31H8VcN54VXCEMK0/view?usp=drivesdk", keywords: ["coffee", "guidelines", "brand"] },
  { name: "Crumo Kids Cookie Brand Identity", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/19hXb4cnlUZzscUBPbtw2iGSaph_dMY7Z/view?usp=drivesdk", keywords: ["kids", "cookie", "branding"] },
  { name: "Ground Logix Logistics & Trucking Branding", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/1My73H6midXxUp5fXdl9HnHFwn0ooWnz3/view?usp=drivesdk", keywords: ["logistics", "trucking", "corporate"] },
  { name: "Ground Logix Fleet Identity Design", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/1YHzaLbMeFtmUj6QZVmPWNZCKGC9_ZbMM/view?usp=drivesdk", keywords: ["trucking", "fleet", "logo"] },
  { name: "Logistics Trucking Brand Suite", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/1Q8y0jV5OB3eJPaT1_HxCICdmY4hGohzx/view?usp=drivesdk", keywords: ["trucking", "identity", "brand"] },
  { name: "Luxury Cosmetics Gift Set Packaging", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/1Q8KV4NjSZFto9K-xJcOC2kiMFxnhcVUv/view?usp=drivesdk", keywords: ["luxury", "cosmetics", "gift set"] },
  { name: "French Patisserie Brand Guidelines", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/138Piae370LsK6Q8RPtFPZN8JaZ-VhqzJ/view?usp=drivesdk", keywords: ["patisserie", "french", "brand identity"] },
  { name: "Skincare Cosmetics Branding System", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/1NlimlqP_HMrd6PZM78-sONhMKW-MLqQ3/view?usp=drivesdk", keywords: ["skincare", "cosmetics", "branding"] },
  { name: "Feminine Fashion Brand Visual Identity", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/1SAueFc8_UbmRKudm8pqP55Io1oWG3Pch/view?usp=drivesdk", keywords: ["fashion", "feminine", "visual identity"] },
  { name: "Luxury Skincare Jar & Bottle Branding", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/1u6SEkxMWfjaC6J3ubKHJpmRC45SaKEdN/view?usp=drivesdk", keywords: ["skincare", "luxury", "packaging"] },
  { name: "Korean Skincare Brand Identity", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/145J8qmFRjA1JWNee8HNwT15f1Uo7rk4k/view?usp=drivesdk", keywords: ["korean", "skincare", "cosmetics"] },
  { name: "Cosmetics & Beauty Brand System", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/15asJLcAfzXB-slt6iPGXlsOopz1zjL2a/view?usp=drivesdk", keywords: ["beauty", "skincare", "packaging"] },
  { name: "Modern Fitness Brand Identity", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/1AXC-Ak8UBLxdMVS0U33pUHOx8DzQSsn8/view?usp=drivesdk", keywords: ["fitness", "gym", "identity"] },
  { name: "Fitness Logo & Brand Identity Suite", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/1Ysg3g__4fpLqrNXSrdkNYxU1rhWT2Z1m/view?usp=drivesdk", keywords: ["fitness", "sports", "logo"] },
  { name: "Engineering Company Corporate Identity", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/15LMuWYLOt4VZwQnpPs1aEyWTPqS4sHOc/view?usp=drivesdk", keywords: ["engineering", "corporate", "branding"] },
  { name: "Accounting & Auditing Firm Brand Identity", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/1FwqH-4A-8Q-3pEhK-OuD6vzkgTmFRXlC/view?usp=drivesdk", keywords: ["accounting", "auditing", "corporate"] },
  { name: "Tech Company Visual Brand Identity", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/194LQfBIuZ2WKjwESQpZxhei9S1wVUQF0/view?usp=drivesdk", keywords: ["tech", "startup", "identity"] },
  { name: "FinTech Payment Platform Identity", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/1X3Q3T1Knf6g5FJqdmutiIvuawTzXc7i-/view?usp=drivesdk", keywords: ["fintech", "payment", "branding"] },
  { name: "Propel Business & Innovation Identity", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/1b61ImfW_NyUm9BJcnus1PwEK49UPxqIc/view?usp=drivesdk", keywords: ["innovation", "business", "logo"] },
  { name: "Sustainable Home Decor Brand Identity", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/19EBeUB3EYzDkpcWBr5R0qWeU0QpP27y_/view?usp=drivesdk", keywords: ["sustainable", "home decor", "eco"] },
  { name: "Agriculture Company Corporate Identity", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/1HXuenNZCvZsyIsxiQpdyWkbHTYwhYpE-/view?usp=drivesdk", keywords: ["agriculture", "corporate", "farming"] },
  { name: "Skincare & Haircare Brand Identity System", category: "Brand Identity", drive_link: "https://drive.google.com/file/d/1grJ9PA1WcfJfolIRctMDXl3bdTnuIrcZ/view?usp=drivesdk", keywords: ["haircare", "skincare", "cosmetics"] },

  // Landing Pages & UI/UX
  { name: "Candy Road Trip E-Commerce UI/UX", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1PcMCDjAHAX-bej9ixLmBV6yJtzdP2VHf/view?usp=drivesdk", keywords: ["ui/ux", "e-commerce", "candy", "subscription"] },
  { name: "Armor Monkey Energy Drink Landing Page", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1VCXJUafJ12SjKaZzotxjk-UFQyPvS_lB/view?usp=drivesdk", keywords: ["energy drink", "landing page", "ui/ux"] },
  { name: "Southern Cyber Cybersecurity Web Design", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1oAoGSWmPDwCtkvaToxZXwxVsEKJfnRmz/view?usp=drivesdk", keywords: ["cybersecurity", "web design", "b2b"] },
  { name: "Razor Shaving Products E-Commerce Store", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1_opf61qMT2T0KiJsmv4UyHjoBFEAnYLK/view?usp=drivesdk", keywords: ["e-commerce", "grooming", "web"] },
  { name: "Kids Place Childcare Responsive Website", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1tWdZEjbbno0jIOo878HA-b7P2FXigJVe/view?usp=drivesdk", keywords: ["childcare", "responsive", "web design"] },
  { name: "Childcare Mobile & Web Portal UI", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1PRBnNGHmRMCyPd4BDi__Jhf4F9WtcXYr/view?usp=drivesdk", keywords: ["mobile app", "childcare", "ui/ux"] },
  { name: "Kids Place Desktop Website Redesign", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1Rbs6GPTh8SqIdKaBHL0E0W0wX312K5YS/view?usp=drivesdk", keywords: ["website", "desktop", "childcare"] },
  { name: "FinTech Mobile App Landing Page", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1YaeiXgbXBgDrjW_ZubjFSzQ7IGFjPLrb/view?usp=drivesdk", keywords: ["fintech", "mobile app", "landing page"] },
  { name: "IT & Cloud Services Web Platform", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1jahaYSRSej4lh2XAG5_fpiOhRLpQUCcw/view?usp=drivesdk", keywords: ["it", "cloud", "web design"] },
  { name: "Modern Book Store E-Commerce Website", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1l2cu3GwUtHh8YxaeAcsdxoYXXUr9SdEm/view?usp=drivesdk", keywords: ["bookstore", "e-commerce", "ui/ux"] },
  { name: "Freelance Marketplace Web Design", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1aMhwpo5a0XSn3qhF0m2WLViPN2-NRNl-/view?usp=drivesdk", keywords: ["marketplace", "freelance", "saas"] },
  { name: "Education & Online Courses Web Design", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1elHDlqtAKZuMW3xF2yUXpDqUoBX23H9M/view?usp=drivesdk", keywords: ["education", "courses", "ui/ux"] },
  { name: "Fashion & Apparel E-Commerce Portal", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1OWu0W_zt_dBZKmzZUJnPwB2HUxEYeM4k/view?usp=drivesdk", keywords: ["fashion", "apparel", "e-commerce"] },
  { name: "Fast Food Restaurant Web Experience", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1U2SQVQuKMdNAWPvbyf7Bp2s2cADk_rfL/view?usp=drivesdk", keywords: ["restaurant", "food", "ordering"] },
  { name: "Real Estate Luxury Homes Portal", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1AdNq0ehiwxHtBkmh5BtjPLYLEj-FeufG/view?usp=drivesdk", keywords: ["real estate", "property", "luxury"] },
  { name: "Commercial Printing Services Website", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1IKwxPvdLI3-UyFxrQaYrzsCGpsVZ9tvw/view?usp=drivesdk", keywords: ["printing", "corporate", "web"] },
  { name: "Construction & Contracting Company Website", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1PqPamAVvYahyGJsi9Q4yYRnx1P5RVC2A/view?usp=drivesdk", keywords: ["construction", "contractor", "web design"] },
  { name: "Organic Food & Fresh Produce E-Commerce", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1aV9DyPD79ne6GRwCEBMfx4ZBcsxfH_Aj/view?usp=drivesdk", keywords: ["organic", "grocery", "produce"] },
  { name: "Creative Agency Portfolio Web Design", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/11CTqzv2MSOI1Xb6PnBmZkk57mq1bwu4y/view?usp=drivesdk", keywords: ["agency", "creative", "portfolio"] },
  { name: "Medical Diagnostics Laboratory Website", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1ZbSmFko5wnvoYVR4GH1j1AvBvLLeOr37/view?usp=drivesdk", keywords: ["medical", "diagnostics", "health"] },
  { name: "Creative Studio Editorial Web Design", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/19gtErD_PTAVgYOSSXyoFqEA_-TZ3lE65/view?usp=drivesdk", keywords: ["creative", "studio", "editorial"] },
  { name: "Auto Repair & Mechanics Web Design", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/10wVZgCOpaqOBUwYqt_0DgbWkyuX13O6_/view?usp=drivesdk", keywords: ["auto", "repair", "services"] },
  { name: "Car Lottery & Contest Interactive Platform", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1cNsW6CuuoCXdEocmJga7r2dbF_ymwOQU/view?usp=drivesdk", keywords: ["lottery", "contest", "gamification"] },
  { name: "Data Science & AI Agency Website", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1xBIwcOpJY0IzLAsxxZQ0PpBV7Oq8rEWt/view?usp=drivesdk", keywords: ["data science", "ai", "agency"] },
  { name: "Kindergarten School Interactive Web Experience", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1jigDwBOE-30u9CSSmgzJWFLJ49bnIrjJ/view?usp=drivesdk", keywords: ["kindergarten", "school", "education"] },
  { name: "Job Search Portal & Candidate Matching", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1CMNBEwFR6Mwlj7xg6qJRMVe3Ks01sLLF/view?usp=drivesdk", keywords: ["job board", "recruitment", "portal"] },
  { name: "Business Analytics Admin Dashboard UI", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1cOvdYwG4eIN7jOQfauKZDh1JXV1a55IE/view?usp=drivesdk", keywords: ["dashboard", "analytics", "admin"] },
  { name: "Fiama Flower Shop E-Commerce Website", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1ATCwcABTd44qJjngZNpzl8jGTR8hlB7R/view?usp=drivesdk", keywords: ["flowers", "shop", "e-commerce"] },
  { name: "Enterprise AI Platform UI/UX Design", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1MmbDYiRYfPkWsY7_yoQM90IOWH3rEMEw/view?usp=drivesdk", keywords: ["enterprise", "ai platform", "saas"] },
  { name: "Digital Marketing Agency Web Platform", category: "Landing Pages & UI/UX", drive_link: "https://drive.google.com/file/d/1KNee6ESeMb1gN078Mgk_8IgG_muzRaiD/view?usp=drivesdk", keywords: ["marketing", "digital agency", "web"] },

  // Luxury & Hospitality Branding
  { name: "Bourbon Cybersecurity Community Branding", category: "Luxury & Hospitality", drive_link: "https://drive.google.com/file/d/163d_POgiZcACwlCwolekEW3BgtfoTJLK/view?usp=drivesdk", keywords: ["cybersecurity", "community", "luxury"] },
  { name: "Moula Fast Food Chicken Restaurant", category: "Luxury & Hospitality", drive_link: "https://drive.google.com/file/d/1gay6ZeBmLqv5_88dfNUVVuGuya_aZ21g/view?usp=drivesdk", keywords: ["restaurant", "food", "branding"] },
  { name: "Teeloffel Artisan Tea Brand & Logo", category: "Luxury & Hospitality", drive_link: "https://drive.google.com/file/d/1ePqyxtkjc5nRgN5hCjXMTYXSg6t6DLb8/view?usp=drivesdk", keywords: ["tea", "artisan", "branding"] },
  { name: "S.A.L.T Sea & Land Restaurant Brand", category: "Luxury & Hospitality", drive_link: "https://drive.google.com/file/d/1btzymcapkRr6zWnBATHuntRx-4csK9tl/view?usp=drivesdk", keywords: ["restaurant", "seafood", "dining"] },
  { name: "Luxury Concierge Service Brand & Logo", category: "Luxury & Hospitality", drive_link: "https://drive.google.com/file/d/1ngpWkJjQQnMZ-4Wmpo1kJeKqNOz35FrZ/view?usp=drivesdk", keywords: ["concierge", "luxury", "hospitality"] },
  { name: "Petal Floral Catering Business Logo", category: "Luxury & Hospitality", drive_link: "https://drive.google.com/file/d/1JlfYa2B-uA__E0ZQ0OvKeVLBsfWpC5uA/view?usp=drivesdk", keywords: ["catering", "floral", "events"] },
  { name: "Luxury Embroidered Bath Towel Design", category: "Luxury & Hospitality", drive_link: "https://drive.google.com/file/d/12xXY6sGlnun23csYMZnklbhGSA54zXWh/view?usp=drivesdk", keywords: ["bath towel", "luxury", "hotel"] },
  { name: "Aurevia Luxury Resort & Spa Identity", category: "Luxury & Hospitality", drive_link: "https://drive.google.com/file/d/1Q8vPFItejvo6XNOWFtUkALk6VAwwkkSc/view?usp=drivesdk", keywords: ["resort", "spa", "hotel"] },
  { name: "Luxury Hotel Canvas Tote Merchandise", category: "Luxury & Hospitality", drive_link: "https://drive.google.com/file/d/1oa8LgqS8mHwLYWe6q5uLq1EJhQjX2C4C/view?usp=drivesdk", keywords: ["tote bag", "hotel", "merchandise"] },
  { name: "Luxury Restaurant Staff Uniform Design", category: "Luxury & Hospitality", drive_link: "https://drive.google.com/file/d/1hlzspjYYtLZBwAIg7fj7BEYZ7TRrtwBb/view?usp=drivesdk", keywords: ["uniform", "restaurant", "apparel"] },
  { name: "Luxury Hotel Storefront Poster & Identity", category: "Luxury & Hospitality", drive_link: "https://drive.google.com/file/d/1ekQ3vSvd1R940Nd7XbW5xETCGE6lAmNB/view?usp=drivesdk", keywords: ["poster", "hotel", "branding"] },
  { name: "Luxury Hotel Staff Workwear Suite", category: "Luxury & Hospitality", drive_link: "https://drive.google.com/file/d/1gEepGv1AaWepYri1dX6f3WJvyuy0ryCB/view?usp=drivesdk", keywords: ["uniform", "hotel", "hospitality"] },
  { name: "Luxury Boutique Hotel Brand Identity", category: "Luxury & Hospitality", drive_link: "https://drive.google.com/file/d/1vcVZ2RAdfWXZsoWDUKYu0yh3LE-WtK7h/view?usp=drivesdk", keywords: ["hotel", "brand identity", "luxury"] },
  { name: "Fine Dining Restaurant Menu Food Photography", category: "Luxury & Hospitality", drive_link: "https://drive.google.com/file/d/1T3bEFPTdoEfG98VMrrzq0pmF6xpiBjaz/view?usp=drivesdk", keywords: ["menu", "fine dining", "photography"] },
  { name: "Vintage Red Glitter Motel Key Tag", category: "Luxury & Hospitality", drive_link: "https://drive.google.com/file/d/1E7dF92zi3ejIq7XHFaRMIc1lc0x9C7DI/view?usp=drivesdk", keywords: ["motel", "key tag", "vintage"] },
  { name: "Ceramic Bathroom Soap Dispenser Packaging", category: "Luxury & Hospitality", drive_link: "https://drive.google.com/file/d/1hox-jc0LKAR4kOmRm785wcd4n1Y2weud/view?usp=drivesdk", keywords: ["soap dispenser", "ceramic", "bathroom"] },

  // Logos & Monograms
  { name: "Petalberry Organic Home Decor Logo", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1sq116CLxEYbUn6jjC8uBlunau7hkZuok/view?usp=drivesdk", keywords: ["home decor", "organic", "logo"] },
  { name: "Vui Minimalist Home Decor Brand Identity", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1F-CF6dkYIaNNzXPHZIvTJk7Z5zb7VvNq/view?usp=drivesdk", keywords: ["minimalist", "decor", "branding"] },
  { name: "Decorosopy Organic Modern Logo", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1yABdw5AwxF88WsN6g_vb70smC5s9vYIb/view?usp=drivesdk", keywords: ["organic", "logo", "modern"] },
  { name: "Artezeni Luxury Woodwork & Carpentry", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1-YPKasET3hY0Nh2u3BUFmoi1vVawEhbq/view?usp=drivesdk", keywords: ["woodwork", "carpentry", "logo"] },
  { name: "Willow Home Gifts & Decor Logo", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1Yvn9Mr_fg24m19Byn4HJA8TcUMO-ZyCS/view?usp=drivesdk", keywords: ["gifts", "decor", "boutique"] },
  { name: "Decorable Boutique Home Furnishings", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1AAlfYOITYFj_G1zudqWCN1-H99-BVC-Z/view?usp=drivesdk", keywords: ["boutique", "furnishings", "logo"] },
  { name: "Go Decor Home & Furniture Store", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1BDwa5q9tkdixDQCPHJEEg5hqAa-EtdLP/view?usp=drivesdk", keywords: ["furniture", "decor", "store"] },
  { name: "Decor Sense Modern Brand Mark", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1NG382mozM1EP8Huu-OqybmhbmvOBrC8z/view?usp=drivesdk", keywords: ["brand mark", "decor", "identity"] },
  { name: "The Water Closet Luxury Bathroom Brand", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1HFW-65kmJr1vRDvkVpD5S-StvcgwW1X1/view?usp=drivesdk", keywords: ["bathroom", "luxury", "logo"] },
  { name: "Wolux Home & Kitchen Furnishings", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/17hwC7P_vFl4xtoZERmmou6qdyXApUDDO/view?usp=drivesdk", keywords: ["kitchen", "furnishings", "logo"] },
  { name: "Bare Natural Skincare & Organic Cosmetics", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1VmLpYF1J0CIsLTO3gWgOU5Lv0X1yKBKj/view?usp=drivesdk", keywords: ["skincare", "cosmetics", "organic"] },
  { name: "Smooch Cosmetics & Lip Care Logo", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1GyoFCk7wtY7JaYCKxF1APXJ-h8lXye0k/view?usp=drivesdk", keywords: ["cosmetics", "lip care", "logo"] },
  { name: "Mindflows Peak Performance Coaching", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1yRq_uUguTWl5MlrrreOwRTGUBGokWtCD/view?usp=drivesdk", keywords: ["coaching", "mindset", "wellness"] },
  { name: "Himm Wellness & Spa Brand Identity", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/14oADY6tn8D8F96uv6E5fXCqMDefQaDko/view?usp=drivesdk", keywords: ["wellness", "spa", "branding"] },
  { name: "Two Wings Therapy & Counseling", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1g_B0Z81IEvBdp7XrLUFj1xp-__G8ldoD/view?usp=drivesdk", keywords: ["therapy", "counseling", "logo"] },
  { name: "Revive Real Estate & Renovation Logo", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/10seIWYSHvGKV-Bv21-klRLwoujN31i14/view?usp=drivesdk", keywords: ["renovation", "real estate", "logo"] },
  { name: "Neolina Homes Property Brand Identity", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/139HTJGjvqJqMqsyDAeojigkB3GTnAveZ/view?usp=drivesdk", keywords: ["property", "homes", "identity"] },
  { name: "Black Sheep Bagels Mascot & Logo", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1WZPyFxa6RbppSNJOdNz1wnECQAvBAZpS/view?usp=drivesdk", keywords: ["bakery", "mascot", "bagels"] },
  { name: "Freshco Vintage Bagel Eatery Logo", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1W8UsbE0vMoK8tzBU5IdTJyrn6j81DjK9/view?usp=drivesdk", keywords: ["vintage", "bagels", "eatery"] },
  { name: "Meer Bagel Shop & Bar Identity", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1o7zq9if4CbzRn3FOGL5vcLhjF2_dSxY7/view?usp=drivesdk", keywords: ["bagels", "bar", "identity"] },
  { name: "Ruut Minimalist Apparel Brand", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1nERh_9bCpH92Tujc-iavPfr3iEGGG_zR/view?usp=drivesdk", keywords: ["apparel", "minimalist", "logo"] },
  { name: "Betta Brand Luxury Lifestyle Logo", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1xYwinhyPHk5oNsNVgR1EsM_qsq6FuIFl/view?usp=drivesdk", keywords: ["luxury", "lifestyle", "fashion"] },
  { name: "Gerard Luxury Footwear Brand", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1MpqJITFt7TMDbEFunVe8M8Mx7k7W9OGV/view?usp=drivesdk", keywords: ["footwear", "shoes", "luxury"] },
  { name: "Sunergy Renewable Energy Logo", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/15YbBaLcH14LI-fd4bWkC2EjjMTChWfMm/view?usp=drivesdk", keywords: ["solar", "renewable", "energy"] },
  { name: "Toronto Solar Roof Brand Identity", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1RnlHiv2xTkgfoQKd1VkqewvSL_yyfuWe/view?usp=drivesdk", keywords: ["solar", "roofing", "stationery"] },
  { name: "Twin Pop Artisanal Popsicle Logo", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/12ajNgy0EROCbe30b4VTi7BiUs5FHypdW/view?usp=drivesdk", keywords: ["popsicle", "ice cream", "branding"] },
  { name: "Wolf Pack Esports Gaming Typography", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1tj5q_B1GUJggP0s95BXxn9EtBO-J9ocC/view?usp=drivesdk", keywords: ["esports", "gaming", "typography"] },
  { name: "Moonbalm Tallow Lip Care Packaging", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1SbHdq1HsozZrBWcF9IUwt8X53ROeM7XZ/view?usp=drivesdk", keywords: ["tallow", "balm", "packaging"] },
  { name: "Athletic Club Bilbao Sports Team Emblem", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1kRwk4aLOLXyUkFZ6Ed7xPzI394ZKhQAS/view?usp=drivesdk", keywords: ["sports", "emblem", "crest"] },
  { name: "Heritage Crest Logo Design", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/15WStw4x9EeIqIS8wEsqOoOvusLYiCveT/view?usp=drivesdk", keywords: ["crest", "heritage", "luxury"] },
  { name: "Luxury Watch Brand Logo & Monogram", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/10J5I9ErMSvc5h_PFM0rSC9gSIpLi4yHp/view?usp=drivesdk", keywords: ["watch", "luxury", "monogram"] },
  { name: "Bee Farm Pure Honey Production", category: "Logos & Monograms", drive_link: "https://drive.google.com/file/d/1F3Ndnl-_-gCc0vnOouexYwClhepdvDkE/view?usp=drivesdk", keywords: ["honey", "bee", "organic"] },

  // App Icons & Mobile UI
  { name: "iOS App Icon Grid & Design Template", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/1tR1is9BlDtgwKWjbJDNArsIUay-QReAD/view?usp=drivesdk", keywords: ["app icon", "ios", "grid"] },
  { name: "AI-Based Meal Planner Mobile App Icon", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/1b4nbV4xJBkEfbpLF5vJTEgVj_kJNO9bY/view?usp=drivesdk", keywords: ["meal planner", "ai", "app icon"] },
  { name: "Cooking & Culinary App Icon", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/1YXgJ_cAYCbRdmWpfjY_i4fVbEX0x80P-/view?usp=drivesdk", keywords: ["cooking", "culinary", "app icon"] },
  { name: "Slow-Motion Video Editor App Icon", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/17PUmdw3Lqcsdw6a6d211v0CX902HcWEu/view?usp=drivesdk", keywords: ["video editor", "slow motion", "icon"] },
  { name: "AR Photography Mobile Game Icon", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/1bWNlEkMb9ovz2ALo_lSC3mhuKfhVrnn3/view?usp=drivesdk", keywords: ["ar game", "photography", "icon"] },
  { name: "Audio Volume Booster App Icon", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/1-pd2hdXL6CADvUS_IYqFktxSEBTM2pch/view?usp=drivesdk", keywords: ["audio", "volume booster", "app icon"] },
  { name: "Pro Video Editing Mobile App Icon", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/1jrRxPVp9MDfA06snG_3pDQGGfP5Ytfdr/view?usp=drivesdk", keywords: ["video editing", "app icon", "mobile"] },
  { name: "3D TV Streaming iOS App Icon", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/150eMYQD-QO2BC678wxQ0Qgt4SvDerhTP/view?usp=drivesdk", keywords: ["streaming", "3d icon", "tv app"] },
  { name: "Floor Plan Photo Mapping Mobile App Icon", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/1d17Qqg_HgAVUrwgSXb77ZztaL_ol2xhq/view?usp=drivesdk", keywords: ["floor plan", "mapping", "app icon"] },
  { name: "Multi-Layer Photo Editor App Icon", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/1JMCYDWy7OHvQiQD0PlbBJUi6EP-scRYv/view?usp=drivesdk", keywords: ["photo editor", "layers", "icon"] },
  { name: "Nightlife & City Discovery App Icon", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/11DKnVzLpXaM2R6VbTUEJWH-7b7H45923/view?usp=drivesdk", keywords: ["nightlife", "discovery", "app icon"] },
  { name: "AI Health & Fitness Assistant Icon", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/14T11qs2vQT5ZLtGVuzVJXgu0VZwa2Yj-/view?usp=drivesdk", keywords: ["ai health", "assistant", "icon"] },
  { name: "Brand Engagement Platform Mobile Icon", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/1mTBKDUSqwjkePL9vGrNWQwkFBde_eN3R/view?usp=drivesdk", keywords: ["brand", "engagement", "app icon"] },
  { name: "Racket Sports Club App Icon", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/1kpVIhqEm5W374q2H0L6eChuaVeXwmBEA/view?usp=drivesdk", keywords: ["racket sports", "club", "app icon"] },
  { name: "VPN Secure Connection App Icon", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/1wMzxnHRFETy9nV39EVCrJekhjwmg5PIw/view?usp=drivesdk", keywords: ["vpn", "security", "app icon"] },
  { name: "Photography Sun Tracker App Icon", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/1ApMqRldAE3XYbbeMA2d7Eopg8A2sq9Vp/view?usp=drivesdk", keywords: ["sun tracker", "photography", "icon"] },
  { name: "AI Generative Video App Icon", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/1Hb0zxl9C6-KfwaW0yc_y5H1GgjJmx8Bj/view?usp=drivesdk", keywords: ["ai video", "generation", "app icon"] },
  { name: "Studio Management Mobile App UI", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/1JSGavfHYWtHjYyfwWSf6AHGHks6RIYoc/view?usp=drivesdk", keywords: ["studio management", "mobile ui", "app"] },
  { name: "AI Chatbot Assistant App Screenshots", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/1YRAKBapTbUjF5ObUtiHlkZJqH4tNCgbJ/view?usp=drivesdk", keywords: ["playstore", "ai chatbot", "app store"] },
  { name: "AI Voice Assistant Interface Screenshots", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/1OD39n-39dpNOGuSRNXMLfgtbsOUftLmx/view?usp=drivesdk", keywords: ["voice assistant", "screenshots", "mobile"] },
  { name: "Isometric 3D Puzzle Game UI Screens", category: "App Icons & UI", drive_link: "https://drive.google.com/file/d/15LbX23iQTb4BGjPBViFsbj7xVJOEa8Qk/view?usp=drivesdk", keywords: ["puzzle game", "isometric", "game ui"] },

  // AI Generated Art & Concepts
  { name: "3D Miniature Character Chick Concept", category: "AI Art & Concepts", drive_link: "https://drive.google.com/file/d/1-zApwsVrUUy33OK4P7B9PH045b_-TRLE/view?usp=drivesdk", keywords: ["3d character", "miniature", "ai art"] },
  { name: "Sci-Fi 3D Creature Digital Illustration", category: "AI Art & Concepts", drive_link: "https://drive.google.com/file/d/1v9h40teHo_b3xZ6V3B_QbsSWclp00fm9/view?usp=drivesdk", keywords: ["sci-fi", "creature", "illustration"] },
  { name: "Dark Fantasy Monster Digital Art", category: "AI Art & Concepts", drive_link: "https://drive.google.com/file/d/1sbKsPTGfVy_6Jol5fLZPXRp9nOcJe0Tp/view?usp=drivesdk", keywords: ["dark fantasy", "monster", "digital art"] },
  { name: "Sci-Fi Explorer Character Concept", category: "AI Art & Concepts", drive_link: "https://drive.google.com/file/d/11_EBXtnKHLavtNa8NBik5OcUU-sypETN/view?usp=drivesdk", keywords: ["character", "sci-fi", "concept art"] },
  { name: "Traditional Japanese Tatami Room Interior", category: "AI Art & Concepts", drive_link: "https://drive.google.com/file/d/1dbGQWWISiJsElkBtqXo-R8aQziO7smKl/view?usp=drivesdk", keywords: ["japanese", "interior", "tatami room"] },
  { name: "Japanese Zen Garden Landscape Design", category: "AI Art & Concepts", drive_link: "https://drive.google.com/file/d/1ilsOmzCa4Kcry0gTaix2tS0564duMAmk/view?usp=drivesdk", keywords: ["zen garden", "landscape", "japanese"] },
  { name: "Space Exploration Spaceship Captain", category: "AI Art & Concepts", drive_link: "https://drive.google.com/file/d/1QcRsrNS3VForOBaTKa0rMSQ_AFE3fG7O/view?usp=drivesdk", keywords: ["spaceship", "captain", "concept art"] },
  { name: "Sci-Fi Astronaut Deep Space Concept", category: "AI Art & Concepts", drive_link: "https://drive.google.com/file/d/1VCYxiHlu0po0ANOVJIcFM1wAFSLMUtU3/view?usp=drivesdk", keywords: ["astronaut", "space", "concept art"] },
  { name: "Fantasy Ninja Character Game Design", category: "AI Art & Concepts", drive_link: "https://drive.google.com/file/d/1vBC4sQ5OgI0mEm67ROA9ItZsOQ1xo2Bt/view?usp=drivesdk", keywords: ["ninja", "game art", "fantasy"] },
  { name: "Punk Rock Kirby Figurine Character", category: "AI Art & Concepts", drive_link: "https://drive.google.com/file/d/1ngDWZwiRAEnODFB1Ed2yEPWrQfQ8fZdL/view?usp=drivesdk", keywords: ["punk rock", "figurine", "character"] },
  { name: "San Francisco Hot Springs Ukiyo-e Art", category: "AI Art & Concepts", drive_link: "https://drive.google.com/file/d/18KLSi41ronZVJNtKV5LTzhqC1YhLm1SB/view?usp=drivesdk", keywords: ["ukiyo-e", "japanese art", "illustration"] },
  { name: "Miniature Giant Tuna Sushi Construction", category: "AI Art & Concepts", drive_link: "https://drive.google.com/file/d/1WJFUSu6FEjYGEINXB1PjsQzIxNJxa76H/view?usp=drivesdk", keywords: ["miniature", "sushi", "photography"] },

  // Real Estate & Construction
  { name: "Bena Real Estate Corporate Profile Brochure", category: "Real Estate & Architecture", drive_link: "https://drive.google.com/file/d/1tTGaEihIhbJdyzzcNj7L5lsL8Vmcu6hV/view?usp=drivesdk", keywords: ["corporate profile", "brochure", "real estate"] },
  { name: "Architecture & Construction Portfolio Book", category: "Real Estate & Architecture", drive_link: "https://drive.google.com/file/d/1F_yJjYV7kyTGmPhR8xHZMGQtR6gYmgnk/view?usp=drivesdk", keywords: ["architecture", "construction", "portfolio"] },
  { name: "Real Estate Investment Profile Brochure", category: "Real Estate & Architecture", drive_link: "https://drive.google.com/file/d/1GJG591KApi39LyPVDqsysDpEjXol20Eh/view?usp=drivesdk", keywords: ["investment", "real estate", "brochure"] },
  { name: "Commercial Property Investment Fund Brochure", category: "Real Estate & Architecture", drive_link: "https://drive.google.com/file/d/1ElUYTCQm0cd_KTfHC4t4G_OmSSW55KrJ/view?usp=drivesdk", keywords: ["fund", "commercial property", "finance"] },
  { name: "Modern Real Estate Direct Mail Postcard", category: "Real Estate & Architecture", drive_link: "https://drive.google.com/file/d/1RHChZ1FRf7wxt3Kb4T_t3yiD6PkBQgus/view?usp=drivesdk", keywords: ["postcard", "direct mail", "marketing"] },
  { name: "Luxury Homes Open House Postcard", category: "Real Estate & Architecture", drive_link: "https://drive.google.com/file/d/1P-Hpz5POsuOgMzOfL1uEZnCD9M9Oh4dP/view?usp=drivesdk", keywords: ["open house", "luxury homes", "postcard"] },
  { name: "Real Estate Just Sold Marketing Postcard", category: "Real Estate & Architecture", drive_link: "https://drive.google.com/file/d/17ssQSOcAP9FSuf96DJ66VZbuuxf5f9A-/view?usp=drivesdk", keywords: ["just sold", "realtor", "postcard"] },
  { name: "Luxury Estate Open House Presentation Flyer", category: "Real Estate & Architecture", drive_link: "https://drive.google.com/file/d/1H85AEvo8c9p_atPaA2MnxiF7dH7yWmWe/view?usp=drivesdk", keywords: ["flyer", "luxury estate", "open house"] },
  { name: "Roofing Services Door Hanger Design", category: "Real Estate & Architecture", drive_link: "https://drive.google.com/file/d/1PPvJc9lvELMzX07iWOiWJrSMxzqPDdtA/view?usp=drivesdk", keywords: ["door hanger", "roofing", "contractor"] },
  { name: "Home Renovation Services Door Hanger", category: "Real Estate & Architecture", drive_link: "https://drive.google.com/file/d/1GaqAINehNxLFT4JrFHEUq1XY9DAp4cZH/view?usp=drivesdk", keywords: ["door hanger", "renovation", "services"] },
  { name: "Modern Real Estate Promotional Flyer", category: "Real Estate & Architecture", drive_link: "https://drive.google.com/file/d/13jk2JZJbYIbUdDYBvUmBspZqIkH0gBTh/view?usp=drivesdk", keywords: ["real estate", "flyer", "marketing"] },
  { name: "Luxury Homes Social Media Ad Template", category: "Real Estate & Architecture", drive_link: "https://drive.google.com/file/d/128mc-gkoh2cKnuciNOv1N5Uge2pSPZYN/view?usp=drivesdk", keywords: ["social media", "real estate", "template"] },

  // Healthcare & Dental
  { name: "Precision Biotechnology Company Logo", category: "Healthcare & Wellness", drive_link: "https://drive.google.com/file/d/16-NniH9aubVMrhQoFD0A3IAPD6DEldX-/view?usp=drivesdk", keywords: ["biotech", "genetics", "logo"] },
  { name: "BioForth Biotech Venture Capital Logo", category: "Healthcare & Wellness", drive_link: "https://drive.google.com/file/d/1W1aNdJLZaMaruoOrNyEMt9WjM_x1zqha/view?usp=drivesdk", keywords: ["venture capital", "biotech", "logo"] },
  { name: "Lumento Therapeutics Brand Identity", category: "Healthcare & Wellness", drive_link: "https://drive.google.com/file/d/1VovebNU7O02wmySnPZnFIKUfu-JtSqEz/view?usp=drivesdk", keywords: ["therapeutics", "medical", "identity"] },
  { name: "EmployeeCare Workforce Health Clinic", category: "Healthcare & Wellness", drive_link: "https://drive.google.com/file/d/1DcscV5gNZ2ylveTbLzzI7n9Ez40vNBof/view?usp=drivesdk", keywords: ["clinic", "health", "corporate"] },
  { name: "NephroIQ Medical Nephrology Brand", category: "Healthcare & Wellness", drive_link: "https://drive.google.com/file/d/1EYhRjT4OAOH1W-86tqosyWl5c5Obu1hG/view?usp=drivesdk", keywords: ["nephrology", "medical", "logo"] },
  { name: "Olivares Dermatology Clinic Identity", category: "Healthcare & Wellness", drive_link: "https://drive.google.com/file/d/1naHkeLyNyT_n3WzKbD-YQD_A-O9ZOc0s/view?usp=drivesdk", keywords: ["dermatology", "skincare", "clinic"] },
  { name: "Universal Health Insurance Visual Identity", category: "Healthcare & Wellness", drive_link: "https://drive.google.com/file/d/14XIs8DF1O5bCb5kFFOLPoDWS-lHbUG9b/view?usp=drivesdk", keywords: ["insurance", "healthcare", "3d branding"] },
  { name: "Oracle Biomedical Peptides Identity", category: "Healthcare & Wellness", drive_link: "https://drive.google.com/file/d/1mtRPusnMe81AqmLkitpeztPM9qpNS2rS/view?usp=drivesdk", keywords: ["peptides", "biomedical", "logo"] },
  { name: "Abbot Dental Specialist Group Logo", category: "Healthcare & Wellness", drive_link: "https://drive.google.com/file/d/1Zl4xxlHyKa4qpxEFQHle4kvCLsgPvR4r/view?usp=drivesdk", keywords: ["dental", "clinic", "specialist"] },
  { name: "Smile Again Family Dental Clinic Logo", category: "Healthcare & Wellness", drive_link: "https://drive.google.com/file/d/1TYbDcYi64XgNCRQjUyLjtUejp6g8ATMq/view?usp=drivesdk", keywords: ["dental", "smile", "family"] },
  { name: "Dentibelli Cosmetic Dentistry Logo", category: "Healthcare & Wellness", drive_link: "https://drive.google.com/file/d/1f4GZBhixuqNvIPjtdZmvqcql9QjobDOD/view?usp=drivesdk", keywords: ["cosmetic dentistry", "dentist", "logo"] },
  { name: "Polished Teeth Whitening & Dental Spa", category: "Healthcare & Wellness", drive_link: "https://drive.google.com/file/d/1fLu_7JRbgq7YhwVng5X2oKh0cTqrGoEN/view?usp=drivesdk", keywords: ["whitening", "dental spa", "logo"] },
  { name: "My LA Braces Orthodontic Practice Identity", category: "Healthcare & Wellness", drive_link: "https://drive.google.com/file/d/1crDTlekiRqLpfnWMXIZR_L7awRITDSek/view?usp=drivesdk", keywords: ["orthodontics", "braces", "dental"] },
  { name: "Purple Plum Pediatric Dentistry Branding", category: "Healthcare & Wellness", drive_link: "https://drive.google.com/file/d/1K9tC2qkiLL60ORcM5sWAbfN01D1SO2DS/view?usp=drivesdk", keywords: ["pediatric", "dentistry", "branding"] },
  { name: "Gavin Audiology & Hearing Aids Clinic", category: "Healthcare & Wellness", drive_link: "https://drive.google.com/file/d/147id_jkRCXBuoabL6HbVSV8axWBjyfLq/view?usp=drivesdk", keywords: ["audiology", "hearing aids", "clinic"] },
  { name: "Capital Hearing Healthcare Corporate Logo", category: "Healthcare & Wellness", drive_link: "https://drive.google.com/file/d/1Ns8Zrq2fREIgD6sShW7AjBpBo4S4I198/view?usp=drivesdk", keywords: ["hearing", "corporate", "medical"] },

  // Editorial, Books & Publishing
  { name: "Book Interior Typesetting & KDP Layout", category: "Editorial & Publishing", drive_link: "https://drive.google.com/file/d/1hVMMlyka7WcFfrodyje02fFnU-Bvy1wG/view?usp=drivesdk", keywords: ["kdp", "typesetting", "book layout"] },
  { name: "Print-Ready Non-Fiction Book Interior", category: "Editorial & Publishing", drive_link: "https://drive.google.com/file/d/1W_bbBaXF4R7jYEH3o6Tbyug4n358R0jf/view?usp=drivesdk", keywords: ["book interior", "formatting", "print-ready"] },
  { name: "Travel Magazine Editorial Layout Design", category: "Editorial & Publishing", drive_link: "https://drive.google.com/file/d/1RX2aYPGFMSPeBDOAf4AeaFSoqFnAykJg/view?usp=drivesdk", keywords: ["travel magazine", "editorial", "layout"] },
  { name: "Eco-Friendly Lifestyle Magazine Spread", category: "Editorial & Publishing", drive_link: "https://drive.google.com/file/d/1UbSLK-qirAebgM0Lhy2aO8QFJb041ccN/view?usp=drivesdk", keywords: ["magazine", "spread", "editorial"] },
  { name: "Gardening & Botanical Magazine Layout", category: "Editorial & Publishing", drive_link: "https://drive.google.com/file/d/126p8FoYE7cfFY3sKxHBsoMR4bJxj1ySG/view?usp=drivesdk", keywords: ["botanical", "magazine", "layout"] },
  { name: "Minimalist Multi-Page E-Book Template", category: "Editorial & Publishing", drive_link: "https://drive.google.com/file/d/1SQruQQWsux1cquaYUu6qaE2TLHu79rfJ/view?usp=drivesdk", keywords: ["e-book", "template", "minimalist"] },
  { name: "YOLO Fiction Novel Book Cover Design", category: "Editorial & Publishing", drive_link: "https://drive.google.com/file/d/1kD9KQgXP5H3a4HklTNjgWAbQSpOeqvZ8/view?usp=drivesdk", keywords: ["book cover", "fiction", "novel"] },
  { name: "Psychology & Behavioral Analysis Cover", category: "Editorial & Publishing", drive_link: "https://drive.google.com/file/d/1Cm2wzTSSjzHHe6JqikstvfmT_2ePInOV/view?usp=drivesdk", keywords: ["psychology", "cover", "non-fiction"] },
  { name: "Finance & Economics Book Cover Design", category: "Editorial & Publishing", drive_link: "https://drive.google.com/file/d/1MShx0xfpUYmULkVVKiZ6yplznKvLveR1/view?usp=drivesdk", keywords: ["finance", "economics", "book cover"] },
  { name: "The Brink Career Burnout & Self-Help Cover", category: "Editorial & Publishing", drive_link: "https://drive.google.com/file/d/17AXv368R07Zv_NulPfqBXVEnBBt6W49_/view?usp=drivesdk", keywords: ["burnout", "self-help", "cover design"] },
  { name: "Adult Activity & Sudoku Puzzle Book Cover", category: "Editorial & Publishing", drive_link: "https://drive.google.com/file/d/1UOA36yHIZ02En9HAs1O_-ZJkdC5Zy2MT/view?usp=drivesdk", keywords: ["puzzle book", "sudoku", "activity"] },
  { name: "Sudoku Puzzle Interior Layout & Grid", category: "Editorial & Publishing", drive_link: "https://drive.google.com/file/d/1InF3pHw0BvsowIFmvzB3Fce9j4xg95HM/view?usp=drivesdk", keywords: ["sudoku", "grid", "interior"] },

  // Podcasts & Media
  { name: "Crime Salad True Crime Podcast Cover", category: "Podcasts & Media", drive_link: "https://drive.google.com/file/d/1U48vTJuXGr7frEk44nuk0wH0-whnYisw/view?usp=drivesdk", keywords: ["true crime", "podcast cover", "media"] },
  { name: "Women Entrepreneurship Podcast Art", category: "Podcasts & Media", drive_link: "https://drive.google.com/file/d/1dc4oGfbPWaGX14zREUTqoCuzjIdb-GlA/view?usp=drivesdk", keywords: ["entrepreneurship", "women", "podcast"] },
  { name: "Real Estate Investing Podcast Cover", category: "Podcasts & Media", drive_link: "https://drive.google.com/file/d/1s9TB_7HPUz35_5Cm0x8bsCm71CNsapXw/view?usp=drivesdk", keywords: ["investing", "real estate", "podcast cover"] },
  { name: "Wedding Business Masterclass Podcast Art", category: "Podcasts & Media", drive_link: "https://drive.google.com/file/d/1O45HLnxXS_kqFcPjxRMXssnbhWU6HHNz/view?usp=drivesdk", keywords: ["wedding business", "podcast", "masterclass"] },
  { name: "The Main Cave Men's Lifestyle Podcast", category: "Podcasts & Media", drive_link: "https://drive.google.com/file/d/17_RFxT6KgLm341gTCXblUJed0i8MsSPe/view?usp=drivesdk", keywords: ["men lifestyle", "podcast logo", "mascot"] },
  { name: "Retro 70s Psychedelic Podcast Cover", category: "Podcasts & Media", drive_link: "https://drive.google.com/file/d/1g5ikCmm-900SzGrgHVdpehVGqyfwQ1L3/view?usp=drivesdk", keywords: ["retro 70s", "psychedelic", "cover art"] },
  { name: "When You Feel Lost Inspirational Thumbnail", category: "Podcasts & Media", drive_link: "https://drive.google.com/file/d/1siWebrnd0bxR4jUObm_-5ErmezJuUMA7/view?usp=drivesdk", keywords: ["youtube thumbnail", "inspirational", "podcast"] },
  { name: "Public Health & Opioids Animated Thumbnail", category: "Podcasts & Media", drive_link: "https://drive.google.com/file/d/1EcTqk6D0VGrINoMoOLdajfpYaJdDXiUq/view?usp=drivesdk", keywords: ["youtube", "thumbnail", "educational"] },
  { name: "Storytelling Animation YouTube Thumbnail", category: "Podcasts & Media", drive_link: "https://drive.google.com/file/d/18cGVPniE4AQX2I9rDdz4PLkro79XpE8L/view?usp=drivesdk", keywords: ["animation", "storytelling", "youtube"] },

  // Business Cards & Stationery
  { name: "Fish-Shaped Die-Cut Business Card", category: "Business Cards & Stationery", drive_link: "https://drive.google.com/file/d/1SDRyhFKl8ebKnFofIG8r4p7YDW8rY_TV/view?usp=drivesdk", keywords: ["die-cut", "business card", "fishing"] },
  { name: "Designer Brand Minimalist Business Card", category: "Business Cards & Stationery", drive_link: "https://drive.google.com/file/d/1GmrBPGLMhfdVA48qlNH4NwMLTqWLHSZv/view?usp=drivesdk", keywords: ["minimalist", "business card", "typography"] },
  { name: "Graphic Designer Foil Stamped Card", category: "Business Cards & Stationery", drive_link: "https://drive.google.com/file/d/1_upay-6MwHu8UYB7Wh69yVpi8V06QPGU/view?usp=drivesdk", keywords: ["foil stamped", "black card", "luxury"] },
  { name: "Seafood Restaurant Custom Business Card", category: "Business Cards & Stationery", drive_link: "https://drive.google.com/file/d/1PhPANIdOSstATPiaaRESfJgez_e8QKFW/view?usp=drivesdk", keywords: ["restaurant", "seafood", "business card"] },
  { name: "Luxury Gold Foil Mandala Business Card", category: "Business Cards & Stationery", drive_link: "https://drive.google.com/file/d/10mBFdJIFfxc_fX3h1BZTYoczYrhNLUmp/view?usp=drivesdk", keywords: ["gold foil", "mandala", "luxury card"] },
  { name: "Topographic Abstract Pattern Business Card", category: "Business Cards & Stationery", drive_link: "https://drive.google.com/file/d/18BK_IFu1i7ZHiPPjwn7zJTAr-z7Bl-Ga/view?usp=drivesdk", keywords: ["topographic", "pattern", "branding"] },
  { name: "Entertainment Agency Corporate Stationery", category: "Business Cards & Stationery", drive_link: "https://drive.google.com/file/d/1cgMFCLTGjpjHlTSGuLCopNA-vW1YrswL/view?usp=drivesdk", keywords: ["stationery", "letterhead", "envelope"] },

  // Trade Show & Large Format
  { name: "B2B Tech Platform Trade Show Backdrop", category: "Trade Show & Booths", drive_link: "https://drive.google.com/file/d/1cyh0HRhqtQF65eeW-mEdq9X90YywrDzc/view?usp=drivesdk", keywords: ["trade show", "backdrop", "fabric tension"] },
  { name: "Technology Exhibition Booth Display", category: "Trade Show & Booths", drive_link: "https://drive.google.com/file/d/1CDKiInsPqmGh-1yM4ELsKrgl3E48rbhf/view?usp=drivesdk", keywords: ["booth", "exhibition", "large format"] },
  { name: "Digital Economy Consulting Booth Backdrop", category: "Trade Show & Booths", drive_link: "https://drive.google.com/file/d/1-cTJp7K6-5RM7DdExzryP6i0gy77K6eY/view?usp=drivesdk", keywords: ["consulting", "booth", "tension fabric"] },
  { name: "Modeling Platform Trade Show Display", category: "Trade Show & Booths", drive_link: "https://drive.google.com/file/d/1kh3lDxGxgZHAJ47qbSyTclWgR6VSfZkE/view?usp=drivesdk", keywords: ["modeling", "expo", "backdrop"] },
  { name: "Environmental Science Expo Booth", category: "Trade Show & Booths", drive_link: "https://drive.google.com/file/d/1ZiXH-LlDUjVxcYJ-kTZVCu9EJpF1M8Je/view?usp=drivesdk", keywords: ["expo", "environmental", "booth"] },
  { name: "General Contractor Trade Show Counter & Wall", category: "Trade Show & Booths", drive_link: "https://drive.google.com/file/d/1xg1ruLhI8JCLpXrhaHCt4tvwbtHDClOf/view?usp=drivesdk", keywords: ["contractor", "counter", "trade show"] },
  { name: "Branded ATM & Kiosk Vinyl Wrap", category: "Trade Show & Booths", drive_link: "https://drive.google.com/file/d/1wtwaz6puk4ejMY47SIefn0Ysv0Te-M5p/view?usp=drivesdk", keywords: ["kiosk wrap", "atm", "vinyl"] },

  // Esports & Gaming
  { name: "Bitman Cryptocurrency Pixel Art Logo", category: "Esports & Gaming", drive_link: "https://drive.google.com/file/d/16Hfst4fNs86dF-PgFX8sko0M7WqyL56F/view?usp=drivesdk", keywords: ["pixel art", "crypto", "gaming"] },
  { name: "Rocket Model Pixel Art Brand Mark", category: "Esports & Gaming", drive_link: "https://drive.google.com/file/d/101tO17yObzyjg2t_ecmzskDB3o3HnpuC/view?usp=drivesdk", keywords: ["rocket", "pixel art", "gaming logo"] },
  { name: "Giant Enemy Crab Pixel Gaming Logo", category: "Esports & Gaming", drive_link: "https://drive.google.com/file/d/1G5dLXMKSRUaEvsjOsio0K7MknF2R4Trb/view?usp=drivesdk", keywords: ["gaming", "pixel crab", "esports"] },
  { name: "Trex Esports Pro Gaming Team Logo", category: "Esports & Gaming", drive_link: "https://drive.google.com/file/d/1In6OZbq4F2OmosSDwsBYWb-C66Ybb0ty/view?usp=drivesdk", keywords: ["esports", "dino", "gaming logo"] },
  { name: "Toyota Gazoo Racing Esports Emblem", category: "Esports & Gaming", drive_link: "https://drive.google.com/file/d/1hvM_M5FQ3YMfHTZd66VGijD3dOyDAnla/view?usp=drivesdk", keywords: ["motorsport", "racing", "gaming"] },
  { name: "Athena Gaming Clan Wordmark Logo", category: "Esports & Gaming", drive_link: "https://drive.google.com/file/d/1fbq9hNseGwovjDjMDc3bdwdsJv04e_Yg/view?usp=drivesdk", keywords: ["clan", "wordmark", "esports"] },
  { name: "Viper Combat Tactical Armament Logo", category: "Esports & Gaming", drive_link: "https://drive.google.com/file/d/11qv57qmhES2X7FxgjgjPgTxVhfkuagBb/view?usp=drivesdk", keywords: ["tactical", "viper", "military logo"] }
];

export function initializeCatalog(): PortfolioItem[] {
  return INITIAL_ITEMS_RAW.map((item, index) => {
    const id = String(index + 1);
    const driveLink = item.drive_link;
    const mediaType = detectMediaType(item.name, driveLink);
    return {
      id,
      name: item.name,
      category: item.category,
      drive_link: driveLink,
      behance_link: item.behance_link || null,
      thumb: getDriveThumb(driveLink, 600),
      thumb_small: getDriveThumb(driveLink, 360),
      thumb_large: getDriveThumb(driveLink, 1400),
      mediaType,
      keywords: item.keywords || [item.category.toLowerCase()],
      custom: false,
    };
  });
}
