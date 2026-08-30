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
 * Local keyword overlap matching algorithm (fallback / top-up).
 * Returns ids sorted best-first — caller decides how many to keep.
 */
function localKeywordMatching(jobPostText, portfolioItems) {
  const text = (jobPostText || '').toLowerCase();
  const scored = portfolioItems.map(item => {
    let score = 0;
    const combinedTerms = [
      ...(item.keywords || []),
      item.category || '',
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

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
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
    const { jobPostText, styleSampleText, styleName, profile, portfolioItems = [] } = req.body || {};

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

    const matchPrompt = `You are an expert design director and talent matcher for a creative studio.
Read the job post below carefully and do three things:

1. Select the ${MIN_ITEMS} to ${MAX_ITEMS} MOST relevant portfolio items from the catalog, based on
   matching the job's required skills, deliverables, tools, and industry against each item's
   category/subcategory/keywords. You MUST return at least ${MIN_ITEMS} ids if the catalog has that
   many items — pick the closest matches even if the match isn't perfect, never return fewer than
   ${MIN_ITEMS} unless the catalog itself has fewer than ${MIN_ITEMS} items total.
2. Extract two separate facts from the job post text:
   - "client_name": the actual hiring company/client/brand name IF the job post explicitly names one
     (e.g. "NexaPay Technologies", "Acme Studio"). If no real company/client name is mentioned
     anywhere in the text, set this to null — do NOT invent or guess a name.
   - "job_title": the role/position title being hired for (e.g. "Senior Product Designer"). Always
     provide your best guess for this even if client_name is null.
3. Write a short, confident professional title describing the applicant AS AN EXPERT IN THIS SPECIFIC
   JOB'S DISCIPLINE — this is NOT the client's job title, it's how the applicant should present
   themselves for this kind of work. Examples: a branding/logo job → "Top-Rated Graphic & Brand
   Identity Design Specialist"; an Instagram/social content job → "Instagram Visual Content & Social
   Media Design Specialist"; a UI/UX job → "Senior UI/UX Product Designer". Put this in "specialist_title".

JOB POST:
"""
${jobPostText.substring(0, 4000)}
"""

AVAILABLE PORTFOLIO ITEMS CATALOG (${portfolioItems.length} items total):
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
        if (Array.isArray(parsed.matched_item_ids) && parsed.matched_item_ids.length > 0) {
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

    // Top up with local keyword matching if the AI returned fewer than MIN_ITEMS
    // (or failed entirely) — never leave the showcase with just 1-2 items.
    if (matchedItemIds.length < Math.min(MIN_ITEMS, portfolioItems.length)) {
      const localRanked = localKeywordMatching(jobPostText, portfolioItems);
      for (const id of localRanked) {
        if (matchedItemIds.length >= MIN_ITEMS) break;
        if (!matchedItemIds.includes(id)) matchedItemIds.push(id);
      }
    }
    matchedItemIds = matchedItemIds.slice(0, MAX_ITEMS);

    if (matchedItemIds.length === 0 && portfolioItems.length > 0) {
      matchedItemIds = portfolioItems.slice(0, MIN_ITEMS).map(i => i.id);
    }

    // ─────────────────────────────────────────────────────────────
    // STEP B: Auto-Create Showcase — client name on top if known,
    // otherwise a generic heading built from the job title.
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
    const cleanHeading = usingClientName ? clientName : jobTitle;
    const brandNameForShowcase = usingClientName ? clientName : 'Aala Studio';

    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${slugify(cleanHeading)}-${randomSuffix}`;
    const showcaseLink = `${baseUrl}/#showcase=${slug}`;

    const newShowcase = {
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

CURATED SHOWCASE LINK (YOU MUST EMBED THIS NATURALLY):
${showcaseLink}

FEATURED MATCHED CASE STUDIES INCLUDED IN THE SHOWCASE:
${matchedProjectNames}

STYLE REFERENCE — YOU MUST CLOSELY MIRROR THIS, NOT JUST ITS TONE:
"""
${styleSampleText || `Hi Team,\n\nI saw your opening and immediately recognized an opportunity to bring high-impact design leadership to your team...`}
"""

INSTRUCTIONS:
1. Treat the style reference above (${styleName || 'Custom Style'}) as a strict template: match its
   opening line style, paragraph count, paragraph length, sentence rhythm, sign-off format, and
   overall structure as closely as possible. Only change the actual content (names, projects,
   requirements) — do not deviate from its format or invent a different structure.
2. Specifically address the core pain points and requirements mentioned in the job post.
3. Naturally embed the curated showcase link (${showcaseLink}) in a compelling, single sentence inviting the hiring team or client to review this tailored compilation of work.
4. Keep the writing polished, authentic, punchy, and confident without corporate fluff or generic buzzwords.
5. Sign off with EXACTLY this, and nothing else — do not invent a studio/brand/company name anywhere
   in the letter or signature:
   ${candidateProfile.fullName ? candidateProfile.fullName : '[the specialist title below, alone — no name line]'}
   ${specialistTitle}
   ${contactLines ? contactLines : '(no contact line — none was provided)'}
6. Output ONLY the raw cover letter text ready to copy-paste. No preamble, no quotes around the whole text, no markdown backtick wrapper.`;

    const coverMessages = [
      { role: "system", content: "You are an elite creative director and professional copywriter. You strictly mirror the structure of any style reference you are given." },
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
      generatedLetter = `Hi ${cleanHeading} Team,\n\nI came across your opening and immediately wanted to reach out. With a deep background spanning product design, brand systems, and creative technology, I specialize in translating complex product visions into high-impact, beautifully crafted digital experiences.\n\nAfter reviewing your requirements for this role, I curated a dedicated portfolio showcase featuring our most relevant case studies and deliverables:\n${showcaseLink}\n\nI'd welcome the opportunity to discuss how my background aligns with your upcoming roadmap.\n\nBest regards,\n${[candidateProfile.fullName, specialistTitle, contactLines].filter(Boolean).join('\n')}`;
    }

    // Clean up any extraneous markdown wrapper if present
    generatedLetter = generatedLetter
      .replace(/^```[a-zA-Z]*\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    // Ensure the showcase link is present in the cover letter
    if (!generatedLetter.includes(showcaseLink)) {
      generatedLetter += `\n\nYou can explore a curated portfolio showcase of relevant past projects here:\n${showcaseLink}`;
    }

    const matchedFullItems = portfolioItems.filter(i => matchedItemIds.includes(i.id));

    // Human-readable provenance string for the UI, e.g. "Groq — API key #2 of 3"
    const providerLabel = generationProviderInfo
      ? `${generationProviderInfo.provider} — API key #${generationProviderInfo.keyIndex} of ${generationProviderInfo.keyCount}`
      : 'Local fallback template (both AI providers unavailable)';

    return res.status(200).json({
      coverLetter: generatedLetter,
      showcaseLink,
      showcaseSlug: slug,
      showcaseHeading: cleanHeading,
      clientNameDetected: usingClientName ? clientName : null,
      specialistTitle,
      catalogSize: portfolioItems.length,
      matchedItemIds,
      matchedItems: matchedFullItems,
      showcase: newShowcase,
      provider: providerLabel,
      matchingProvider: matchingProviderInfo
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
