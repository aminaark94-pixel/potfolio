import { verify, parseCookies, COOKIE_NAME } from './_auth.js';

export default async function handler(req, res) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  const payload = verify(token);
  res.status(200).json({ authenticated: !!payload });
}
