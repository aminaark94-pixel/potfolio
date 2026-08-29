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
 * Local keyword overlap matching algorithm (fallback)
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
  // Pick top 6 to 10 items (or all available if fewer)
  const topCount = Math.min(Math.max(6, Math.min(scored.length, 10)), scored.length);
  return scored.slice(0, topCount).map(s => s.item.id);
}

/**
 * Call Groq API — tries every configured key in order (comma-separated in
 * GROQ_API_KEY) until one succeeds, so a rate-limited/blocked key doesn't
 * take the whole feature down.
 */
async function callGroq(messages, jsonMode = false, timeoutMs = 6500) {
  if (GROQ_API_KEYS.length === 0) throw new Error('GROQ_API_KEY not configured');

  let lastErr = null;
  for (const key of GROQ_API_KEYS) {
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
      return data.choices?.[0]?.message?.content || "";
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
  for (const key of MISTRAL_API_KEYS) {
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
      return data.choices?.[0]?.message?.content || "";
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

    // Lightweight item representation
    const catalog = portfolioItems.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      subcategory: item.subcategory || '',
      keywords: item.keywords || []
    }));

    // ─────────────────────────────────────────────────────────────
    // STEP A: Relevant Portfolio Matching
    // ─────────────────────────────────────────────────────────────
    let matchedItemIds = [];
    let providerUsed = 'groq';

    const matchPrompt = `You are an expert design director and talent matcher for "Aala Studio".
Match the following job post requirements with the most relevant portfolio projects from the catalog below.

JOB POST:
"""
${jobPostText.substring(0, 4000)}
"""

AVAILABLE PORTFOLIO ITEMS CATALOG:
${JSON.stringify(catalog, null, 2)}

TASK:
Analyze the required skills, deliverables, tools, industry, and role expectations in the job post.
Select the 6 to 10 most relevant portfolio item IDs.
Return ONLY a valid JSON object in this exact format:
{
  "matched_item_ids": ["id-1", "id-2", "id-3", "id-4", "id-5", "id-6"],
  "company_or_role_guess": "Company or Role Name"
}`;

    const matchMessages = [
      { role: "system", content: "You are an intelligent portfolio matching engine. You always respond with valid JSON containing matched_item_ids array." },
      { role: "user", content: matchPrompt }
    ];

    let matchRaw = '';
    let extractedDetails = null;

    try {
      // 1. Try Groq
      matchRaw = await callGroq(matchMessages, true, 6000);
      providerUsed = 'Groq (llama-3.3-70b)';
    } catch (groqErr) {
      console.warn('Groq matching failed, attempting Mistral fallback:', groqErr.message);
      try {
        // 2. Try Mistral Fallback
        matchRaw = await callMistral(matchMessages, true, 6000);
        providerUsed = 'Mistral (mistral-small)';
      } catch (mistralErr) {
        console.warn('Mistral matching also failed, using local keyword matching fallback:', mistralErr.message);
        providerUsed = 'Local Algorithmic Matching';
      }
    }

    if (matchRaw) {
      try {
        const parsed = JSON.parse(matchRaw);
        if (Array.isArray(parsed.matched_item_ids) && parsed.matched_item_ids.length > 0) {
          const validCatalogIds = new Set(portfolioItems.map(i => i.id));
          matchedItemIds = parsed.matched_item_ids.filter(id => validCatalogIds.has(id));
        }
        if (parsed.company_or_role_guess && typeof parsed.company_or_role_guess === 'string') {
          extractedDetails = {
            heading: parsed.company_or_role_guess.trim(),
            brandName: parsed.company_or_role_guess.trim()
          };
        }
      } catch (e) {
        console.warn('Failed to parse AI JSON response, falling back to local matching', e);
      }
    }

    // If AI matching returned empty or failed, use local keyword overlap
    if (!matchedItemIds || matchedItemIds.length === 0) {
      matchedItemIds = localKeywordMatching(jobPostText, portfolioItems);
    }

    // Ensure at least 3-6 items exist
    if (matchedItemIds.length === 0 && portfolioItems.length > 0) {
      matchedItemIds = portfolioItems.slice(0, 6).map(i => i.id);
    }

    // ─────────────────────────────────────────────────────────────
    // STEP B: Auto-Create Showcase
    // ─────────────────────────────────────────────────────────────
    if (!extractedDetails) {
      extractedDetails = extractOpportunityDetails(jobPostText);
    }

    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const cleanHeading = extractedDetails.heading || "Target Opportunity";
    const slug = `${slugify(cleanHeading)}-${randomSuffix}`;
    const showcaseLink = `${baseUrl}/#showcase=${slug}`;

    const newShowcase = {
      id: `showcase-${Date.now()}-${randomSuffix}`,
      slug: slug,
      brand_name: extractedDetails.brandName || cleanHeading,
      heading: cleanHeading,
      tagline: `Curated design & creative deliverables tailored for ${cleanHeading}`,
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
    const candidateProfile = profile || {
      fullName: 'Aala Studio',
      roleTitle: 'Senior Product Designer & Creative Technologist',
      bio: 'Multi-disciplinary design partner specializing in high-impact brand identities, scalable UI/UX design systems, modern web development, and immersive motion graphics.',
      email: 'hello@aalastudio.design'
    };

    const matchedProjectNames = portfolioItems
      .filter(i => matchedItemIds.includes(i.id))
      .map(i => `• ${i.name} (${i.category}${i.subcategory ? ` - ${i.subcategory}` : ''})`)
      .join('\n');

    const coverLetterPrompt = `You are writing a top-tier, persuasive cover letter for an applicant applying to the job post below.

APPLICANT PROFILE:
- Name: ${candidateProfile.fullName || 'Aala Studio'}
- Role / Title: ${candidateProfile.roleTitle || 'Senior Product Designer'}
- Bio & Strengths: ${candidateProfile.bio || 'Product design, design systems, branding, full-stack prototyping.'}
- Contact Email: ${candidateProfile.email || 'hello@aalastudio.design'}

JOB POST:
"""
${jobPostText}
"""

CURATED SHOWCASE LINK (YOU MUST EMBED THIS NATURALLY):
${showcaseLink}

FEATURED MATCHED CASE STUDIES INCLUDED IN THE SHOWCASE:
${matchedProjectNames}

STYLE REFERENCE (TONE, PACING, AND STRUCTURE TO EMULATE):
"""
${styleSampleText || `Hi Team,\n\nI saw your opening and immediately recognized an opportunity to bring high-impact design leadership to your team...`}
"""

INSTRUCTIONS:
1. Emulate the tone, structure, and length of the style reference above (${styleName || 'Custom Style'}).
2. Specifically address the core pain points and requirements mentioned in the job post.
3. Naturally embed the curated showcase link (${showcaseLink}) in a compelling, single sentence inviting the hiring team or client to review this tailored compilation of work.
4. Keep the writing polished, authentic, punchy, and confident without corporate fluff or generic buzzwords.
5. End with the applicant's name (${candidateProfile.fullName}) and contact details.
6. Output ONLY the raw cover letter text ready to copy-paste. No preamble, no quotes around the whole text, no markdown backtick wrapper.`;

    const coverMessages = [
      { role: "system", content: "You are an elite creative director and professional copywriter crafting tailored, high-converting cover letters." },
      { role: "user", content: coverLetterPrompt }
    ];

    let generatedLetter = '';

    try {
      generatedLetter = await callGroq(coverMessages, false, 6500);
    } catch (groqCoverErr) {
      console.warn('Groq cover letter generation failed, trying Mistral:', groqCoverErr.message);
      try {
        generatedLetter = await callMistral(coverMessages, false, 6500);
      } catch (mistralCoverErr) {
        console.warn('Mistral cover letter generation failed, generating smart template fallback:', mistralCoverErr.message);
        // Smart fallback template
        generatedLetter = `Hi ${cleanHeading} Team,\n\nI came across your opening and immediately wanted to reach out. With a deep background spanning product design, brand systems, and creative technology, I specialize in translating complex product visions into high-impact, beautifully crafted digital experiences.\n\nAfter reviewing your requirements for this role, I curated a dedicated portfolio showcase featuring our most relevant case studies and deliverables:\n${showcaseLink}\n\nI’d welcome the opportunity to discuss how our background aligns with your upcoming roadmap.\n\nBest regards,\n${candidateProfile.fullName}\n${candidateProfile.email}`;
      }
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

    return res.status(200).json({
      coverLetter: generatedLetter,
      showcaseLink,
      showcaseSlug: slug,
      showcaseHeading: cleanHeading,
      matchedItemIds,
      matchedItems: matchedFullItems,
      showcase: newShowcase,
      provider: providerUsed
    });
  } catch (err) {
    console.error('Serverless cover letter generation error:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error during cover letter generation'
    });
  }
}
