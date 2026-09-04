/**
 * Vercel Serverless Function / Express API Route
 * ESM syntax (package.json has "type": "module")
 */

import { verify, parseCookies, COOKIE_NAME } from './_auth.js';

const GROQ_API_KEYS = (process.env.GROQ_API_KEY || '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);
const MISTRAL_API_KEYS = (process.env.MISTRAL_API_KEY || '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

/**
 * Standard slugify helper
 */
function slugify(text) {
  if (!text) return 'showcase-' + Math.random().toString(36).substring(2, 6);
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '') || 'showcase-' + Math.random().toString(36).substring(2, 6);
}

/**
 * Checks the job post text against every saved Portfolio Template's tags
 * (whole-word, case-insensitive match). Returns the best-scoring template
 * if it has at least 1 matching tag, otherwise null. Templates are
 * hand-curated by the admin, so a confident match is trusted over AI/local
 * keyword matching — this is what prevents false positives like a "therapy"
 * job pulling in an unrelated "love therapy" logo.
 */
function findBestTemplateMatch(jobPostText, templates) {
  if (!Array.isArray(templates) || templates.length === 0) return null;
  const text = (jobPostText || '').toLowerCase();

  let best = null;
  let bestScore = 0;

  templates.forEach((template) => {
    if (!template.tags || template.tags.length === 0) return;
    let score = 0;
    template.tags.forEach((tag) => {
      const cleanTag = String(tag).toLowerCase().trim();
      if (!cleanTag) return;
      const escaped = cleanTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const wordBoundaryRegex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (wordBoundaryRegex.test(text)) score += 1;
    });
    if (score > bestScore) {
      bestScore = score;
      best = template;
    }
  });

  return bestScore >= 1 ? best : null;
}

/**
 * Enhanced local keyword matching with category awareness.
 * Returns ids sorted best-first with matching categories prioritized.
 * 
 * Algorithm:
 * 1. Extract category keywords from job post
 * 2. Score items WITH matching categories FIRST (100+ point boost)
 * 3. Within matching categories, score by keyword relevance
 * 4. Only use non-matching categories as fallback
 */
function localKeywordMatching(jobPostText, portfolioItems) {
  const text = (jobPostText || '').toLowerCase();
  
  // Get all unique categories in the portfolio
  const allCategories = [...new Set(portfolioItems.map(i => i.category).filter(Boolean))];
  
  // Extract which categories appear in the job post text
  const matchingCategories = new Set();
  allCategories.forEach(cat => {
    const catLower = cat.toLowerCase();
    const catWords = catLower.split(/\s+/);
    
    // Check if category name or its key words appear in job post
    if (text.includes(catLower)) {
      matchingCategories.add(cat);
    } else {
      // Check individual words (e.g., "editorial" from "Editorial & Publishing")
      const hasWordMatch = catWords.some(word => {
        return word.length > 2 && text.includes(word);
      });
      if (hasWordMatch) {
        matchingCategories.add(cat);
      }
    }
  });

  // Score each item
  const scored = portfolioItems.map(item => {
    let score = 0;
    const itemCategory = item.category || '';
    
    // CATEGORY MATCHING BONUS: +100 if category matches job post
    const categoryMatches = matchingCategories.has(itemCategory);
    if (categoryMatches) {
      score += 100;
    }
    
    // KEYWORD SCORING: score based on item's keywords, category, subcategory, name
    const combinedTerms = [
      ...(item.keywords || []),
      itemCategory || '',
      item.subcategory || '',
      item.name || ''
    ].map(t => t.toLowerCase());

    combinedTerms.forEach(term => {
      if (!term || term.length < 2) return;
      
      if (text.includes(term)) {
        score += 3;
      } else {
        const words = term.split(/\s+/);
        words.forEach(w => {
          if (w.length > 3 && text.includes(w)) {
            score += 1;
          }
        });
      }
    });

    return { item, score, categoryMatches };
  });

  // Sort: matching categories first (by score), then non-matching categories (by score)
  scored.sort((a, b) => {
    // Primary sort: category match status (matching categories come first)
    if (a.categoryMatches !== b.categoryMatches) {
      return a.categoryMatches ? -1 : 1;
    }
    // Secondary sort: score (highest first)
    return b.score - a.score;
  });

  return scored.map(s => s.item.id);
}

/**
 * Call Groq API — tries every configured key in order (comma-separated in
 * GROQ_API_KEY) until one succeeds, so a rate-limited/blocked key doesn't
 * take the whole feature down.
 */
async function callGroq(messages, jsonMode = false, timeoutMs = 6500) {
  if (GROQ_API_KEYS.length === 0) throw new Error('GROQ_API_KEY not configured');

  let lastErr = null;
  for (let i = 0; i < GROQ_API_KEYS.length; i++) {
    const key = GROQ_API_KEYS[i];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const payload = {
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.3,
        max_tokens: 1500
      };
      if (jsonMode) {
        payload.response_format = { type: "json_object" };
      }

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!res.ok) {
        const errText = await res.text();
        // 401 (bad key) or 429 (rate-limited) — try the next key instead of giving up
        if (res.status === 401 || res.status === 429) {
          lastErr = new Error(`Groq key rejected (${res.status}): ${errText}`);
          continue;
        }
        throw new Error(`Groq API error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      return {
        content: data.choices?.[0]?.message?.content || "",
        provider: 'Groq',
        keyIndex: i + 1,
        keyCount: GROQ_API_KEYS.length,
      };
    } catch (err) {
      lastErr = err;
      if (err.name === 'AbortError') continue; // timed out — try next key
      if (!/rejected/.test(err.message)) throw err; // real error, not a key issue — stop retrying
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr || new Error('All Groq API keys failed');
}

/**
 * Call Mistral API — same multi-key fallback as Groq above.
 */
async function callMistral(messages, jsonMode = false, timeoutMs = 6500) {
  if (MISTRAL_API_KEYS.length === 0) throw new Error('MISTRAL_API_KEY not configured');

  let lastErr = null;
  for (let i = 0; i < MISTRAL_API_KEYS.length; i++) {
    const key = MISTRAL_API_KEYS[i];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const payload = {
        model: "mistral-small-latest",
        messages,
        temperature: 0.3,
        max_tokens: 1500
      };
      if (jsonMode) {
        payload.response_format = { type: "json_object" };
      }

      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 401 || res.status === 429) {
          lastErr = new Error(`Mistral key rejected (${res.status}): ${errText}`);
          continue;
        }
        throw new Error(`Mistral API error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      return {
        content: data.choices?.[0]?.message?.content || "",
        provider: 'Mistral',
        keyIndex: i + 1,
        keyCount: MISTRAL_API_KEYS.length,
      };
    } catch (err) {
      lastErr = err;
      if (err.name === 'AbortError') continue;
      if (!/rejected/.test(err.message)) throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr || new Error('All Mistral API keys failed');
}

/**
 * Tries Groq first, then Mistral. Returns { content, provider, keyIndex, keyCount }.
 */
async function callAI(messages, jsonMode = false, timeoutMs = 6500) {
  try {
    return await callGroq(messages, jsonMode, timeoutMs);
  } catch (groqErr) {
    console.warn('Groq call failed, falling back to Mistral:', groqErr.message);
    return await callMistral(messages, jsonMode, timeoutMs);
  }
}

/**
 * Deterministically inserts the fixed portfolio-link intro line + the raw
 * showcase URL right before the sign-off, regardless of what the AI wrote.
 * This guarantees the link always appears exactly once, plain (no markdown
 * brackets), with the same intro line every time — never left to the AI.
 */
function insertShowcaseLinkBlock(letterText, showcaseLinks, specialistTitle, fullName) {
  const links = Array.isArray(showcaseLinks) ? showcaseLinks : [showcaseLinks];
  const FIXED_INTRO_LINE = '𝗣𝗹𝗲𝗮𝘀𝗲 𝘁𝗮𝗸𝗲 𝗮 𝗺𝗼𝗺𝗲𝗻𝘁 𝘁𝗼 𝗲𝘅𝗽𝗹𝗼𝗿𝗲 𝗺𝘆 𝗽𝗮𝘀𝘁 𝗰𝗼𝗺𝗽𝗹𝗲𝘁𝗲𝗱 𝗽𝗿𝗼𝗷𝗲𝗰𝘁𝘀 𝗯𝗲𝗹𝗼𝘄:';
  const linkBlock = `${FIXED_INTRO_LINE}\n${links.join('\n')}`;

  // Defensively strip out any link/markdown the AI might have added anyway,
  // and any duplicate mangled markdown like [text](url](url))
  let cleaned = letterText;
  links.forEach((showcaseLink) => {
    const escapedUrl = showcaseLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned
      .replace(new RegExp(`\\[([^\\]]*)\\]\\(\\s*${escapedUrl}[^)]*\\)+`, 'g'), '')
      .replace(new RegExp(escapedUrl, 'g'), '');
  });
  cleaned = cleaned
    .replace(/\[\s*\]\(\s*\)/g, '')
    // Safety net: strip any AI-written "take a moment to explore my past
    // work" style sentence (plain text, not our fixed bold version) plus
    // any bracket-only project-name lines that follow it — in case the
    // model mirrors a style reference's link-list section despite being
    // told not to.
    .replace(/^.*(take a moment to explore|explore my (past|completed) (projects|work)|please find my portfolio)[^\n]*\n(\s*\[[^\]\n]+\]\s*\n)+/gim, '')
    .replace(/^(\s*\[[^\]\n]+\]\s*\n){2,}/gim, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

  // Find where the sign-off starts (specialistTitle is always present, fullName may not be)
  const anchorText = (fullName && cleaned.includes(fullName)) ? fullName : specialistTitle;
  let insertIndex = cleaned.length;
  if (anchorText) {
    const idx = cleaned.indexOf(anchorText);
    if (idx !== -1) {
      const before = cleaned.slice(0, idx);
      const blankIdx = before.lastIndexOf('\n\n');
      insertIndex = blankIdx !== -1 ? blankIdx : idx;
    }
  }

  const head = cleaned.slice(0, insertIndex).replace(/\s+$/, '');
  const tail = cleaned.slice(insertIndex).replace(/^\s+/, '');

  return tail ? `${head}\n\n${linkBlock}\n\n${tail}` : `${head}\n\n${linkBlock}`;
}

/**
 * Extract company name or role title guess from job post text
 */
function extractOpportunityDetails(jobPostText) {
  let heading = "New Opportunity";
  let brandName = "Selected Opportunity";

  if (!jobPostText) return { heading, brandName };

  // Common patterns: "at [Company]", "[Company] is hiring", "Role: [Title]", etc.
  const lines = jobPostText.trim().split('\n').filter(l => l.trim().length > 0);
  const firstLine = lines[0] || '';

  // Look for company keywords
  const atMatch = jobPostText.match(/(?:at|for|with)\s+([A-Z][A-Za-z0-9\s&]{2,30}?)(?:\s+(?:is|to|in|looking|seeking|\.|\n|,))/);
  const hiringMatch = jobPostText.match(/([A-Z][A-Za-z0-9\s&]{2,25})\s+is\s+(?:looking|hiring|seeking)/);
  const titleMatch = firstLine.match(/(?:Senior|Lead|Product|Staff|Principal|UI\/UX|Brand|Creative|Visual|Full\s*Stack)?\s*(?:Designer|Developer|Director|Technologist|Manager|Lead)/i);

  if (atMatch && atMatch[1]) {
    brandName = atMatch[1].trim();
    heading = brandName;
  } else if (hiringMatch && hiringMatch[1]) {
    brandName = hiringMatch[1].trim();
    heading = brandName;
  } else if (firstLine.length < 50 && firstLine.length > 3) {
    heading = firstLine.replace(/[^\w\s-]/g, '').trim();
    brandName = heading;
  } else if (titleMatch) {
    heading = titleMatch[0].trim();
    brandName = heading;
  }

  return { heading, brandName };
}

export default async function handler(req, res) {
  // CORS & OPTIONS support
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  // Require a valid admin session — this endpoint calls paid AI APIs and
  // creates showcases, so it must not be callable by anonymous visitors.
  const cookies = parseCookies(req);
  const session = verify(cookies[COOKIE_NAME]);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated. Please log in to Studio Hub first.' });
  }

  try {
    const { jobPostText, styleSampleText, styleName, profile, portfolioItems = [], portfolioTemplates = [], existingShowcases = [], skipCoverLetter = false } = req.body || {};

    if (!jobPostText || typeof jobPostText !== 'string' || jobPostText.trim().length < 10) {
      return res.status(400).json({ error: 'Please provide a valid job post text.' });
    }

    const host = req.headers.host || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${protocol}://${host}`;

    const MIN_ITEMS = 6;
    const MAX_ITEMS = 10;

    // Lightweight item representation
    const catalog = portfolioItems.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      subcategory: item.subcategory || '',
      keywords: item.keywords || []
    }));

    // ─────────────────────────────────────────────────────────────
    // STEP A: Relevant Portfolio Matching + Client/Role Extraction
    // ─────────────────────────────────────────────────────────────
    let matchedItemIds = [];
    let clientName = null; // real client/company name, only if the job post actually names one
    let jobTitle = null;   // the role/position being applied to
    let specialistTitle = null; // e.g. "Top-Rated Graphic & Brand Identity Design Specialist"

    // If the admin selected existing showcases to reuse, skip AI/template
    // portfolio matching and auto-creation entirely — just use those links.
    const usingExistingShowcases = Array.isArray(existingShowcases) && existingShowcases.length > 0;

    if (usingExistingShowcases) {
      const validIds = new Set(portfolioItems.map(i => i.id));
      const unionIds = new Set();
      existingShowcases.forEach(sc => (sc.item_ids || []).forEach(id => { if (validIds.has(id)) unionIds.add(id); }));
      matchedItemIds = Array.from(unionIds);
    }

    // Check hand-curated Portfolio Templates FIRST — a deterministic, admin-
    // curated match (e.g. "Therapy Clinic") is trusted over AI/keyword
    // matching, since it avoids false positives like a psychotherapy job
    // pulling in an unrelated "love therapy" logo just because both contain
    // the word "therapy".
    const matchedTemplate = usingExistingShowcases ? null : findBestTemplateMatch(jobPostText, portfolioTemplates);
    if (matchedTemplate) {
      const validCatalogIds = new Set(portfolioItems.map(i => i.id));
      matchedItemIds = matchedTemplate.item_ids.filter(id => validCatalogIds.has(id));
    }

    const matchPrompt = usingExistingShowcases
      ? `You are an expert design director. Read the job post below and extract two facts:
- "client_name": the actual hiring company/client/brand name IF the job post explicitly names one. If none is mentioned, set to null — do NOT invent one.
- "job_title": the role/position title being hired for. Always provide your best guess.
- "specialist_title": a short, confident professional title describing the applicant as an expert in THIS job's discipline (e.g. a branding job → "Top-Rated Graphic & Brand Identity Design Specialist").

JOB POST:
"""
${jobPostText.substring(0, 4000)}
"""

Return ONLY a valid JSON object:
{
  "client_name": "Company Name" or null,
  "job_title": "Role Title",
  "specialist_title": "..."
}`
      : `You are an expert design director and talent matcher for a creative studio.
Read the job post below carefully and do three things:

1. Select the ${MIN_ITEMS} to ${MAX_ITEMS} MOST relevant portfolio items from the catalog. CRITICAL MATCHING PRIORITY:
   
   PRIORITY 1 (Highest): Match the CATEGORY field first. Look for portfolio items whose category 
   names match or closely align with the job's primary design discipline/deliverable. For example:
   - If job mentions "Editorial design" or "magazine layout" → prioritize "Editorial & Publishing" category items
   - If job mentions "packaging" or "box design" → prioritize "Packaging" category items
   - If job mentions "branding" or "logo" → prioritize "Branding & Identity" or similar category items
   
   PRIORITY 2: Within matching categories, score by keywords and required skills/tools/industry mentioned in the job post.
   
   PRIORITY 3: Only if insufficient items in matching categories, supplement with high-scoring items from other categories.
   
   You MUST return at least ${MIN_ITEMS} ids if the catalog has that many items — pick the closest matches 
   even if the match isn't perfect, never return fewer than ${MIN_ITEMS} unless the catalog itself has 
   fewer than ${MIN_ITEMS} items total. Always prioritize matching categories over cross-category matches.

2. Extract two separate facts from the job post text:
   - "client_name": the actual hiring company/client/brand name IF the job post explicitly names one
     (e.g. "NexaPay Technologies", "Acme Studio"). If no real company/client name is mentioned
     anywhere in the text, set this to null — do NOT invent or guess a name.
   - "job_title": the role/position title being hired for (e.g. "Senior Product Designer"). Always
     provide your best guess for this even if client_name is null.

3. Write a short, confident professional title describing the applicant AS AN EXPERT IN THIS SPECIFIC
   JOB'S DISCIPLINE — this is NOT the client's job title, it's how the applicant should present
   themselves for this kind of work. Examples: an Editorial design job → "Editorial & Publication Design Specialist"; 
   a packaging job → "Packaging & Product Design Specialist"; a branding/logo job → "Top-Rated Graphic & Brand
   Identity Design Specialist"; an Instagram/social content job → "Instagram Visual Content & Social
   Media Design Specialist"; a UI/UX job → "Senior UI/UX Product Designer". Put this in "specialist_title".

JOB POST:
"""
${jobPostText.substring(0, 4000)}
"""

AVAILABLE PORTFOLIO ITEMS CATALOG (${portfolioItems.length} items total, organized by category):
${JSON.stringify(catalog, null, 2)}

Return ONLY a valid JSON object in this exact format:
{
  "matched_item_ids": ["id-1", "id-2", "id-3", "id-4", "id-5", "id-6"],
  "client_name": "Company Name" or null,
  "job_title": "Role Title",
  "specialist_title": "Top-Rated Graphic & Brand Identity Design Specialist"
}`;

    const matchMessages = [
      { role: "system", content: "You are an intelligent portfolio matching engine. You always respond with valid JSON only, never fewer matches than requested." },
      { role: "user", content: matchPrompt }
    ];

    let matchRaw = '';
    let matchingProviderInfo = null;

    try {
      const matchResult = await callAI(matchMessages, true, 7000);
      matchRaw = matchResult.content;
      matchingProviderInfo = matchResult;
    } catch (matchErr) {
      console.warn('AI matching failed entirely, using local keyword matching fallback:', matchErr.message);
    }

    if (matchRaw) {
      try {
        const parsed = JSON.parse(matchRaw);
        // Only let the AI set matched_item_ids if a curated template/existing
        // showcase selection wasn't already applied above — those always win.
        if (!matchedTemplate && !usingExistingShowcases && Array.isArray(parsed.matched_item_ids) && parsed.matched_item_ids.length > 0) {
          const validCatalogIds = new Set(portfolioItems.map(i => i.id));
          matchedItemIds = parsed.matched_item_ids.filter(id => validCatalogIds.has(id));
        }
        if (typeof parsed.client_name === 'string' && parsed.client_name.trim()) {
          clientName = parsed.client_name.trim();
        }
        if (typeof parsed.job_title === 'string' && parsed.job_title.trim()) {
          jobTitle = parsed.job_title.trim();
        }
        if (typeof parsed.specialist_title === 'string' && parsed.specialist_title.trim()) {
          specialistTitle = parsed.specialist_title.trim();
        }
      } catch (e) {
        console.warn('Failed to parse AI JSON response, falling back to local matching', e);
      }
    }

    // Top up with local keyword matching if the AI/template returned fewer
    // than MIN_ITEMS (or failed entirely) — never leave the showcase with
    // just 1-2 items. (Skipped when a template/existing-showcase selection
    // already gave a full, curated set — topping up would dilute it.)
    if (!matchedTemplate && !usingExistingShowcases && matchedItemIds.length < Math.min(MIN_ITEMS, portfolioItems.length)) {
      const localRanked = localKeywordMatching(jobPostText, portfolioItems);
      for (const id of localRanked) {
        if (matchedItemIds.length >= MIN_ITEMS) break;
        if (!matchedItemIds.includes(id)) matchedItemIds.push(id);
      }
    }
    if (!usingExistingShowcases) {
      matchedItemIds = matchedItemIds.slice(0, MAX_ITEMS);
    }

    if (matchedItemIds.length === 0 && portfolioItems.length > 0) {
      matchedItemIds = portfolioItems.slice(0, MIN_ITEMS).map(i => i.id);
    }

    // ─────────────────────────────────────────────────────────────
    // STEP B: Auto-Create Showcase (skipped if reusing existing showcases)
    // — client name on top if known, otherwise a generic heading built
    // from the job title.
    // ─────────────────────────────────────────────────────────────
    if (!jobTitle) {
      const regexFallback = extractOpportunityDetails(jobPostText);
      jobTitle = regexFallback.heading;
      if (!clientName) clientName = null; // keep explicit — never guess a client name
    }
    if (!specialistTitle) {
      specialistTitle = jobTitle ? `${jobTitle} Specialist` : 'Creative Design Specialist';
    }

    const usingClientName = !!clientName;

    let cleanHeading, showcaseLink, showcaseLinks, newShowcase;

    if (usingExistingShowcases) {
      cleanHeading = usingClientName
        ? clientName
        : (existingShowcases.length === 1 ? existingShowcases[0].heading : jobTitle);
      showcaseLinks = existingShowcases.map(sc => `${baseUrl}/#showcase=${sc.slug}`);
      showcaseLink = showcaseLinks[0];
      newShowcase = null; // nothing new created — reusing what the admin picked
    } else {
      const brandNameForShowcase = usingClientName ? clientName : 'Aala Studio';
      cleanHeading = usingClientName ? clientName : jobTitle;

      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const slug = `${slugify(cleanHeading)}-${randomSuffix}`;
      showcaseLink = `${baseUrl}/#showcase=${slug}`;
      showcaseLinks = [showcaseLink];

      newShowcase = {
        id: `showcase-${Date.now()}-${randomSuffix}`,
        slug: slug,
        brand_name: brandNameForShowcase,
        heading: cleanHeading,
        tagline: usingClientName
          ? `Curated design & creative deliverables tailored for ${clientName}`
          : `Curated case studies tailored for this ${jobTitle} opportunity`,
        logo_url: "",
        item_ids: matchedItemIds,
        theme: "indigo",
        heroStyle: "minimal-glow",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    // ─────────────────────────────────────────────────────────────
    // If "just get the link" mode was requested, stop here — no need to
    // spend an AI call writing a cover letter.
    // ─────────────────────────────────────────────────────────────
    if (skipCoverLetter) {
      const matchedFullItemsOnly = portfolioItems.filter(i => matchedItemIds.includes(i.id));
      return res.status(200).json({
        coverLetter: '',
        skippedCoverLetter: true,
        usedExistingShowcases: usingExistingShowcases,
        showcaseLink,
        showcaseLinks,
        showcaseSlug: newShowcase ? newShowcase.slug : (existingShowcases[0] && existingShowcases[0].slug) || '',
        showcaseHeading: cleanHeading,
        clientNameDetected: usingClientName ? clientName : null,
        specialistTitle,
        catalogSize: portfolioItems.length,
        matchedItemIds,
        matchedItems: matchedFullItemsOnly,
        showcase: newShowcase,
        provider: 'N/A (cover letter skipped)',
        templateUsed: matchedTemplate ? matchedTemplate.name : null,
        matchingProvider: usingExistingShowcases
          ? 'Existing showcase selection'
          : matchedTemplate
          ? `Curated template: "${matchedTemplate.name}"`
          : matchingProviderInfo
          ? `${matchingProviderInfo.provider} — API key #${matchingProviderInfo.keyIndex} of ${matchingProviderInfo.keyCount}`
          : 'Local keyword matching'
      });
    }

    // ─────────────────────────────────────────────────────────────
    // STEP C: Generate Cover Letter
    // ─────────────────────────────────────────────────────────────
    // Never invent a brand/name — signature is built ONLY from what the
    // admin actually filled in the Profile tab, plus the AI-generated
    // per-job specialist title. Anything not provided is simply omitted.
    const candidateProfile = {
      fullName: (profile && profile.fullName && profile.fullName.trim()) || '',
      bio: (profile && profile.bio && profile.bio.trim()) || '',
      email: (profile && profile.email && profile.email.trim()) || '',
      phone: (profile && profile.phone && profile.phone.trim()) || '',
    };

    const matchedProjectNames = portfolioItems
      .filter(i => matchedItemIds.includes(i.id))
      .map(i => `• ${i.name} (${i.category}${i.subcategory ? ` - ${i.subcategory}` : ''})`)
      .join('\n');

    const contactLines = [candidateProfile.email, candidateProfile.phone].filter(Boolean).join(' | ');

    const coverLetterPrompt = `You are writing a top-tier, persuasive cover letter for an applicant applying to the job post below.

APPLICANT PROFILE:
- Name: ${candidateProfile.fullName || '[NAME NOT PROVIDED — sign off with just the specialist title below, no placeholder name]'}
- Professional identity for THIS job: ${specialistTitle}
- Bio & Strengths: ${candidateProfile.bio || 'Not provided — write generally about relevant design expertise based on the job post and matched case studies below, without inventing specific claims.'}
${contactLines ? `- Contact: ${contactLines}` : ''}

JOB POST:
"""
${jobPostText}
"""

FEATURED MATCHED CASE STUDIES INCLUDED IN THE SHOWCASE (for context only — do not link or mention the URL, see instructions below):
${matchedProjectNames}

STYLE REFERENCE — mirror its VOICE and TONE only (word choice, energy, formality
level). Do NOT copy its literal wording, headings, labels, or paragraph count —
the fixed structure below overrides whatever shape this reference happens to have:
"""
${styleSampleText || `Hi Team,\n\nI saw your opening and immediately recognized an opportunity to bring high-impact design leadership to your team...`}
"""

INSTRUCTIONS:
1. Write ONE single opening paragraph that flows as continuous text with NO line
   break in between: start with a short casual greeting ("Hi," or "Hey there!!" —
   match whatever energy the style reference uses) immediately followed, in the
   very same paragraph, by ONE natural two-part question about their project —
   offering the client two directions/options to choose between, the way a real
   freelancer would casually ask. For example, in both structure and length:
   "Hey there!! Do you already have a specific direction in mind for [the specific
   deliverable], or would you like me to [alternative approach]?" — write this as
   ONE sentence with two clauses joined by "or", specific to the actual project
   (not generic), roughly 20-35 words. Never split the greeting and the question
   onto separate lines or separate paragraphs.
2. Immediately after that opening paragraph, write EXACTLY ONE additional
   paragraph, starting with "Approach:", that briefly explains what you'll do
   and how — this is the ONLY body paragraph. Do not write a second, third, or
   fourth paragraph no matter how long the style reference's own body is —
   compress everything into that single paragraph. Do not add a category label,
   heading, or all-caps tag line anywhere (e.g. never output something like
   "ARABIC THUMBNAIL" on its own line) — only the greeting+question paragraph,
   then the Approach paragraph, then (per instruction 4) go straight to the
   closing sentence and sign-off.
3. Specifically address the core pain points and requirements mentioned in the job post.
4. Do NOT mention, embed, link to, or list the showcase/portfolio anywhere in your text — this
   includes writing any URL or markdown link syntax like [text](url), AND it includes writing any
   "take a moment to explore my past work" style sentence followed by a list of project names (in
   brackets, as bullet points, or any other form). Even if the style reference above contains such a
   project-list section, SKIP that part entirely and do not mirror it — a single portfolio link line
   will be inserted automatically after your text by the system, so treat that as already handled.
   Simply write your closing sentence(s) as if leading straight into the sign-off next (e.g. an offer
   to help or a call to action), with no "please find my portfolio below" sentence and no project
   names or brackets anywhere in the body.
5. Keep the writing polished, authentic, punchy, and confident without corporate fluff or generic buzzwords.
6. Sign off with EXACTLY this, and nothing else — do not invent a studio/brand/company name anywhere
   in the letter or signature:
   ${candidateProfile.fullName ? candidateProfile.fullName : '[the specialist title below, alone — no name line]'}
   ${specialistTitle}
   ${contactLines ? contactLines : '(no contact line — none was provided)'}
7. Output ONLY the raw cover letter text ready to copy-paste. No preamble, no quotes around the whole text, no markdown backtick wrapper.`;

    const coverMessages = [
      { role: "system", content: "You are an elite creative director and professional copywriter. You follow the exact structural instructions given to you, and mirror a style reference's voice and tone only — never its literal wording or paragraph count." },
      { role: "user", content: coverLetterPrompt }
    ];

    let generatedLetter = '';
    let generationProviderInfo = null;

    try {
      const coverResult = await callAI(coverMessages, false, 7000);
      generatedLetter = coverResult.content;
      generationProviderInfo = coverResult;
    } catch (coverErr) {
      console.warn('Both Groq and Mistral cover letter generation failed, using template fallback:', coverErr.message);
      // Smart fallback template
      generatedLetter = `Hi,\n\nQuick question — are you still looking for someone to bring a fresh, polished visual direction to this project, or do you already have a strong direction in mind?\n\nI came across your opening and immediately wanted to reach out. With a deep background spanning product design, brand systems, and creative technology, I specialize in translating complex product visions into high-impact, beautifully crafted digital experiences.\n\nI'd welcome the opportunity to discuss how my background aligns with your upcoming roadmap.\n\nBest regards,\n${[candidateProfile.fullName, specialistTitle, contactLines].filter(Boolean).join('\n')}`;
    }

    // Clean up any extraneous markdown wrapper if present
    generatedLetter = generatedLetter
      .replace(/^```[a-zA-Z]*\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    // Deterministically insert the fixed intro line + raw link right before
    // the sign-off — never left to the AI, so formatting is identical every time.
    generatedLetter = insertShowcaseLinkBlock(generatedLetter, showcaseLinks, specialistTitle, candidateProfile.fullName);

    const matchedFullItems = portfolioItems.filter(i => matchedItemIds.includes(i.id));

    // Human-readable provenance string for the UI, e.g. "Groq — API key #2 of 3"
    const providerLabel = generationProviderInfo
      ? `${generationProviderInfo.provider} — API key #${generationProviderInfo.keyIndex} of ${generationProviderInfo.keyCount}`
      : 'Local fallback template (both AI providers unavailable)';

    return res.status(200).json({
      coverLetter: generatedLetter,
      showcaseLink,
      showcaseLinks,
      showcaseSlug: newShowcase ? newShowcase.slug : (existingShowcases[0] && existingShowcases[0].slug) || '',
      showcaseHeading: cleanHeading,
      clientNameDetected: usingClientName ? clientName : null,
      specialistTitle,
      catalogSize: portfolioItems.length,
      matchedItemIds,
      matchedItems: matchedFullItems,
      showcase: newShowcase,
      provider: providerLabel,
      templateUsed: matchedTemplate ? matchedTemplate.name : null,
      usedExistingShowcases: usingExistingShowcases,
      matchingProvider: usingExistingShowcases
        ? 'Existing showcase selection'
        : matchedTemplate
        ? `Curated template: "${matchedTemplate.name}"`
        : matchingProviderInfo
        ? `${matchingProviderInfo.provider} — API key #${matchingProviderInfo.keyIndex} of ${matchingProviderInfo.keyCount}`
        : 'Local keyword matching'
    });
  } catch (err) {
    console.error('Serverless cover letter generation error:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error during cover letter generation'
    });
  }
}
