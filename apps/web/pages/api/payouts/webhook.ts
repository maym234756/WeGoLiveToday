import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

// Disable built-in body parser to verify raw body signature
export const config = { api: { bodyParser: false } };

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const secret = process.env.PLAID_WEBHOOK_SECRET;
  if (!secret) return res.status(500).end();

  try {
    const raw = await getRawBody(req);
    const signatureHeader = req.headers['x-signature'] as string | undefined;
    if (!signatureHeader) return res.status(400).json({ error: 'Missing signature' });

    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');

    // timing-safe compare
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signatureHeader, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(raw.toString('utf8'));
    // TODO: handle webhook types idempotently
    // e.g., if (payload.webhook_type === 'AUTH' && payload.webhook_code === 'AUTH_DECLINED') { ... }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(400).json({ error: 'Invalid body' });
  }
}