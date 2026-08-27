// Sends the current admin password to the studio owner's own email + WhatsApp.
// Safe by design: it always sends to the FIXED addresses below (env-configured),
// never to an address supplied by whoever clicks the button.

const RECOVERY_EMAIL = 'designer.dstudio@gmail.com';
const RECOVERY_WHATSAPP_PHONE = '923122331949'; // no + or leading 00

async function sendEmail(password) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not set' };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Studio Hub <onboarding@resend.dev>',
      to: [RECOVERY_EMAIL],
      subject: 'Your Studio Hub Admin Password',
      text: `Your admin password is: ${password}\n\nIf you did not request this, someone tried to access your Studio Hub admin login.`,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return { ok: false, error: `Resend failed: ${res.status} ${detail}` };
  }
  return { ok: true };
}

async function sendWhatsApp(password) {
  const apiKey = process.env.CALLMEBOT_APIKEY;
  if (!apiKey) return { ok: false, error: 'CALLMEBOT_APIKEY not set' };

  const text = encodeURIComponent(`Your Studio Hub admin password is: ${password}`);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${RECOVERY_WHATSAPP_PHONE}&text=${text}&apikey=${apiKey}`;

  const res = await fetch(url);
  const body = await res.text().catch(() => '');
  if (!res.ok || /error/i.test(body)) {
    return { ok: false, error: `CallMeBot failed: ${body}` };
  }
  return { ok: true };
}

async function sendSMS(password) {
  const res = await fetch('https://textbelt.com/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: `+${RECOVERY_WHATSAPP_PHONE}`,
      message: `Your Studio Hub admin password is: ${password}`,
      key: process.env.TEXTBELT_KEY || 'textbelt', // 'textbelt' = free shared key, 1 SMS/day
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.success) {
    return { ok: false, error: data.error || 'Textbelt SMS failed (free quota may be used up for today)' };
  }
  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    res.status(500).json({ ok: false, error: 'ADMIN_PASSWORD is not configured on the server.' });
    return;
  }

  const [emailResult, whatsappResult, smsResult] = await Promise.all([
    sendEmail(password),
    sendWhatsApp(password),
    sendSMS(password),
  ]);

  const anySent = emailResult.ok || whatsappResult.ok || smsResult.ok;

  res.status(anySent ? 200 : 500).json({
    ok: anySent,
    email: emailResult,
    whatsapp: whatsappResult,
    sms: smsResult,
  });
}
