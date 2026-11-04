/**
 * Vercel Serverless Function / Express API Route
 * ESM syntax (package.json has "type": "module")
 *
 * Bulk AI image-renaming: takes a small batch of {id, imageUrl} pairs,
 * shows each image to a vision-capable AI model, and returns a short
 * descriptive name for it - so items synced/pasted from Drive with names
 * like "rest.png" or "logo1.png" become searchable ("Minimalist Restaurant
 * Fork Logo"), which also helps the cover-letter matching find the right
 * work automatically.
 */

import { verify, parseCookies, COOKIE_NAME } from './_auth.js';

const GEMINI_API_KEYS = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

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
  "name (4-8 words) describing what it is, suitable for a portfolio catalog entry - for example " +
  "'Minimalist Coffee Shop Logo', 'Real Estate Flyer - Modern Listing', 'Skincare Brand Packaging " +
  "Design'. Reply with ONLY the name itself - no quotes, no trailing punctuation, no extra commentary.";

function cleanName(raw) {
  let text = raw || '';
  // Aggressive cleanup of AI reasoning artifacts
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  text = text.replace(/<think>[\s\S]*$/gi, '');
  text = text.replace(/^[\s\S]*?<\/think>\s*/gi, '');
  text = text.replace(/\*\*Analysis[\s\S]*?(?=\n|$)/gi, '');
  text = text.replace(/Note:[\s\S]*?(?=\n|$)/gi, '');

  return text
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .replace(/[.!]+$/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 90);
}

function normalizeImageUrl(url) {
  if (!url) return '';
  // If Google Drive link, extract ID and convert to direct CDN thumbnail
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}=w800`;
  }
  return url;
}

async function fetchImageAsBase64(rawUrl, timeoutMs = 12000) {
  const directUrl = normalizeImageUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(directUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      throw new Error(`Image download failed (${res.status}) from ${directUrl}`);
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const mimeType = contentType.split(';')[0].trim().toLowerCase();
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      base64,
      mimeType: mimeType.startsWith('image/') ? mimeType : 'image/jpeg',
      directUrl,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Google Gemini Vision (Primary for Google project / @google/genai) */
async function callGeminiVision(base64, mimeType, timeoutMs = 15000) {
  if (GEMINI_API_KEYS.length === 0) throw new Error('GEMINI_API_KEY not configured');

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastErr = null;

  for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
    const key = GEMINI_API_KEYS[i];

    for (const model of models) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: NAMING_PROMPT },
                    {
                      inlineData: {
                        mimeType: mimeType || 'image/jpeg',
                        data: base64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 60,
              },
            }),
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          if (res.status === 401 || res.status === 403 || res.status === 429) {
            lastErr = new Error(`Gemini key rejected (${res.status}): ${errText}`);
            break; // Try next API key
          }
          lastErr = new Error(`Gemini model ${model} error (${res.status}): ${errText}`);
          continue;
        }

        const data = await res.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const name = cleanName(candidate);
        if (!name) throw new Error('Gemini returned an empty name');
        return { name, provider: `Gemini (${model})` };
      } catch (err) {
        lastErr = err;
        if (err.name === 'AbortError') break;
      } finally {
        clearTimeout(timer);
      }
    }
  }

  throw lastErr || new Error('All Gemini API attempts failed');
}

/** Groq Vision (llama-3.2-11b-vision-preview / llama-3.2-90b-vision-preview) */
async function callGroqVision(base64, mimeType, timeoutMs = 15000) {
  if (GROQ_API_KEYS.length === 0) throw new Error('GROQ_API_KEY not configured');

  const dataUri = `data:${mimeType || 'image/jpeg'};base64,${base64}`;
  const models = ['llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision-preview'];
  let lastErr = null;

  for (let i = 0; i < GROQ_API_KEYS.length; i++) {
    const key = GROQ_API_KEYS[i];

    for (const model of models) {
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
            model: model,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: NAMING_PROMPT },
                  { type: 'image_url', image_url: { url: dataUri } },
                ],
              },
            ],
            temperature: 0.4,
            max_tokens: 60,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text();
          if (res.status === 401 || res.status === 429) {
            lastErr = new Error(`Groq key rejected (${res.status}): ${errText}`);
            break;
          }
          lastErr = new Error(`Groq model ${model} error (${res.status}): ${errText}`);
          continue;
        }

        const data = await res.json();
        const name = cleanName(data.choices?.[0]?.message?.content);
        if (!name) throw new Error('Groq returned an empty name');
        return { name, provider: `Groq (${model})` };
      } catch (err) {
        lastErr = err;
        if (err.name === 'AbortError') break;
      } finally {
        clearTimeout(timer);
      }
    }
  }

  throw lastErr || new Error('All Groq API keys failed');
}

/** Mistral Vision (pixtral-12b-2409) */
async function callMistralVision(base64, mimeType, timeoutMs = 15000) {
  if (MISTRAL_API_KEYS.length === 0) throw new Error('MISTRAL_API_KEY not configured');

  const dataUri = `data:${mimeType || 'image/jpeg'};base64,${base64}`;
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
          model: 'pixtral-12b-2409',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: NAMING_PROMPT },
                { type: 'image_url', image_url: { url: dataUri } },
              ],
            },
          ],
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

async function nameOneImage(rawUrl) {
  const { base64, mimeType } = await fetchImageAsBase64(rawUrl);
  const providerErrors = [];

  // 1. Try Gemini first (primary provider)
  if (GEMINI_API_KEYS.length > 0) {
    try {
      return await callGeminiVision(base64, mimeType);
    } catch (err) {
      providerErrors.push(`Gemini: ${err.message}`);
    }
  }

  // 2. Try Groq next
  if (GROQ_API_KEYS.length > 0) {
    try {
      return await callGroqVision(base64, mimeType);
    } catch (err) {
      providerErrors.push(`Groq: ${err.message}`);
    }
  }

  // 3. Try Mistral next
  if (MISTRAL_API_KEYS.length > 0) {
    try {
      return await callMistralVision(base64, mimeType);
    } catch (err) {
      providerErrors.push(`Mistral: ${err.message}`);
    }
  }

  if (providerErrors.length === 0) {
    throw new Error(
      'No AI API key found. Please set GEMINI_API_KEY, GROQ_API_KEY, or MISTRAL_API_KEY in your environment variables.'
    );
  }

  throw new Error(`Vision models failed: ${providerErrors.join(' | ')}`);
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

  // Requires an admin session
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
    if (items.length > 12) {
      return res.status(400).json({ error: 'Send at most 12 items per request; the client should batch.' });
    }

    const results = [];
    for (const item of items) {
      if (!item.imageUrl) {
        results.push({ id: item.id, error: 'No image URL for this item.' });
        continue;
      }
      try {
        const { name, provider } = await nameOneImage(item.imageUrl);
        results.push({ id: item.id, name, provider });
      } catch (err) {
        results.push({ id: item.id, error: err.message || 'Naming failed.' });
      }
    }

    return res.status(200).json({ results });
  } catch (err) {
    console.error('rename-images error:', err);
    return res.status(500).json({ error: err.message || 'Unexpected server error.' });
  }
}