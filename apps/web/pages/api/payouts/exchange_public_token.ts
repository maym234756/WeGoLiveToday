import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

async function getUser(req: NextApiRequest) {
  // TODO: real auth
  return { id: 'user_123' };
}

// Replace with your real storage call
async function savePlaidTokenForUser(userId: string, token: string) {
  // persist encrypted, server-side only
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { public_token } = req.body || {};
  if (!public_token) return res.status(400).json({ error: 'Missing public_token' });

  try {
    const plaidEnv = process.env.PLAID_ENV || 'https://sandbox.plaid.com';
    const r = await fetch(`${plaidEnv}/item/public_token/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.PLAID_CLIENT_ID,
        secret: process.env.PLAID_SECRET,
        public_token,
      }),
    });
    const json = await r.json();
    if (!r.ok) return res.status(502).json({ error: json?.error_message || 'Plaid exchange failed' });

    const accessToken = json.access_token;
    // Persist access token server-side (must be encrypted): placeholder
    await savePlaidTokenForUser(user.id, accessToken);

    // Set a short-lived, secure, HttpOnly cookie to mark the session (do NOT store raw access token in cookie)
    const sessionId = crypto.randomBytes(16).toString('hex');
    const cookie = `payout_session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${60 * 60}`;
    res.setHeader('Set-Cookie', cookie);

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}