import { sign, COOKIE_NAME, SESSION_HOURS } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  let body = req.body;
  if (!body || typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch {
      body = {};
    }
  }

  const password = body && body.password;
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    res.status(500).json({
      ok: false,
      error: 'Server not configured: set ADMIN_PASSWORD in Vercel Project Settings.',
    });
    return;
  }

  if (typeof password !== 'string' || password.length === 0 || password !== expected) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    res.status(401).json({ ok: false, error: 'Incorrect password' });
    return;
  }

  const exp = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const token = sign({ exp });

  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_HOURS * 3600}`
  );
  res.status(200).json({ ok: true });
}
