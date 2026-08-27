// Shared helper for signing/verifying admin session tokens.
// Runs only on the Vercel server (Node serverless runtime) — never shipped to the browser.
import crypto from 'crypto';

function getSecret() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error(
      'ADMIN_SECRET is not set. Add it in Vercel Project Settings -> Environment Variables.'
    );
  }
  return secret;
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

export function sign(payload) {
  const secret = getSecret();
  const data = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verify(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;

  let secret;
  try {
    secret = getSecret();
  } catch {
    return null;
  }

  const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

export const COOKIE_NAME = 'studio_admin_session';
export const SESSION_HOURS = 12;
