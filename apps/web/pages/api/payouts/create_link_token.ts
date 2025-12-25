import type { NextApiRequest, NextApiResponse } from 'next';

async function getUser(req: NextApiRequest) {
  // TODO: replace with real auth/session lookup
  return { id: 'user_123' };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const body = {
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      client_name: 'WeGoLive',
      language: 'en',
      country_codes: ['US'],
      products: ['auth'],
      user: { client_user_id: user.id },
    };
    const plaidEnv = process.env.PLAID_ENV || 'https://sandbox.plaid.com';
    const r = await fetch(`${plaidEnv}/link/token/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await r.json();
    if (!r.ok) return res.status(502).json({ error: json?.error_message || 'Plaid error' });
    return res.status(200).json({ linkToken: json.link_token });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}