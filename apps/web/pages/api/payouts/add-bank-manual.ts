import type { NextApiRequest, NextApiResponse } from 'next';

async function getUser(req: NextApiRequest) {
  // TODO: implement real auth
  return { id: 'user_123' };
}

// Example: call your payment-processor's tokenize endpoint server-side
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { name, routing, account, type, instantVerify } = req.body || {};
  if (!name || !routing || !account) return res.status(400).json({ error: 'Missing fields' });
  if (!/^\d{9}$/.test(String(routing))) return res.status(400).json({ error: 'Invalid routing' });

  try {
    // Replace with real processor integration. Example (pseudo):
    const resp = await fetch(process.env.PROCESSOR_TOKENIZE_URL || '', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.PROCESSOR_API_KEY}` },
      body: JSON.stringify({ name, routing, account, type }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) return res.status(502).json({ error: json?.error || 'Processor error' });

    // Save processor token/server record and return success
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}