/**
 * Vercel Serverless Function / Express API Route
 * ESM syntax (package.json has "type": "module")
 *
 * Bulk AI image-renaming: takes a small batch of {id, imageUrl} pairs,
 * shows each image to a vision-capable AI model, and returns a short
 * descriptive name for it — so items synced/pasted from Drive with names
 * like "rest.png" or "logo1.png" become searchable ("Minimalist Restaurant
 * Fork Logo"), which also helps the cover-letter matching find the right
 * work automatically.
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

const NAMING_PROMPT =
  "You are looking at a single image from a graphic design portfolio. It could be a logo, " +
  "poster, flyer, brand identity design, packaging, website/app mockup, social media post, " +
  "book/editorial layout, or similar creative work. Give it a short, specific, professional " +
  "name (4-8 words) describing what it is, suitable for a portfolio catalog entry — for example " +
  "'Minimalist Coffee Shop Logo', 'Real Estate Flyer - Modern Listing', 'Skincare Brand Packaging " +
  "Design'. Reply with ONLY the name itself — no quotes, no trailing punctuation, no extra commentary.";

function buildVisionMessages(imageUrl) {
  return [
    {
      role: 'user',
      content: [
        { type: 'text', text: NAMING_PROMPT },
        { type: 'image_url', image_url: { url: imageUrl } },
      ],
    },
  ];
}

function cleanName(raw) {
  return (raw || '')
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .replace(/[.!]+$/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 90);
}

/** Vision-capable Groq model — text-only models cannot see the image. */
async function callGroqVision(imageUrl, timeoutMs = 15000) {
  if (GROQ_API_KEYS.length === 0) throw new Error('GROQ_API_KEY not configured');

  let lastErr = null;
  for (let i = 0; i < GROQ_API_KEYS.length; i++) {
    const key = GROQ_API_KEYS[i];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.6-27b',
          messages: buildVisionMessages(imageUrl),
          temperature: 0.4,
          max_tokens: 60,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 401 || res.status === 429) {
          lastErr = new Error(`Groq key rejected (${res.status}): ${errText}`);
          continue;
        }
        throw new Error(`Groq vision error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const name = cleanName(data.choices?.[0]?.message?.content);
      if (!name) throw new Error('Groq returned an empty name');
      return { name, provider: 'Groq' };
    } catch (err) {
      lastErr = err;
      if (err.name === 'AbortError') continue;
      if (!/rejected/.test(err.message)) throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr || new Error('All Groq API keys failed');
}

/** Vision-capable Mistral model (Pixtral Large via the stable -latest alias). */
async function callMistralVision(imageUrl, timeoutMs = 15000) {
  if (MISTRAL_API_KEYS.length === 0) throw new Error('MISTRAL_API_KEY not configured');

  let lastErr = null;
  for (let i = 0; i < MISTRAL_API_KEYS.length; i++) {
    const key = MISTRAL_API_KEYS[i];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'pixtral-large-latest',
          messages: buildVisionMessages(imageUrl),
          temperature: 0.4,
          max_tokens: 60,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 401 || res.status === 429) {
          lastErr = new Error(`Mistral key rejected (${res.status}): ${errText}`);
          continue;
        }
        throw new Error(`Mistral vision error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const name = cleanName(data.choices?.[0]?.message?.content);
      if (!name) throw new Error('Mistral returned an empty name');
      return { name, provider: 'Mistral' };
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

async function nameOneImage(imageUrl) {
  try {
    return await callGroqVision(imageUrl);
  } catch (groqErr) {
    console.warn('Groq vision failed, falling back to Mistral:', groqErr.message);
    return await callMistralVision(imageUrl);
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  // Requires an admin session — this calls paid/rate-limited AI APIs.
  const cookies = parseCookies(req);
  const session = verify(cookies[COOKIE_NAME]);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated. Please log in to Studio Hub first.' });
  }

  try {
    const { items = [] } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Provide a non-empty "items" array of { id, imageUrl }.' });
    }
    // Keep each server invocation small — this is called in small batches
    // from the client so a single request never risks a serverless timeout.
    if (items.length > 12) {
      return res.status(400).json({ error: 'Send at most 12 items per request; the client should batch.' });
    }

    const results = await Promise.all(
      items.map(async (item) => {
        if (!item.imageUrl) {
          return { id: item.id, error: 'No image URL for this item.' };
        }
        try {
          const { name, provider } = await nameOneImage(item.imageUrl);
          return { id: item.id, name, provider };
        } catch (err) {
          return { id: item.id, error: err.message || 'Naming failed.' };
        }
      })
    );

    return res.status(200).json({ results });
  } catch (err) {
    console.error('rename-images error:', err);
    return res.status(500).json({ error: err.message || 'Unexpected server error.' });
  }
}
