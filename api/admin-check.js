const { verify, parseCookies, COOKIE_NAME } = require('./_auth');

module.exports = async function handler(req, res) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  const payload = verify(token);
  res.status(200).json({ authenticated: !!payload });
};
