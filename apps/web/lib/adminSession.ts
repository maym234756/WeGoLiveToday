// apps/web/lib/adminSession.ts

const MAX_AGE = 60 * 60 * 8; // 8 hours
const enc = new TextEncoder();
const dec = new TextDecoder();

function getSecret(): string {
  const s =
    process.env.ADMIN_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.NEXT_PRIVATE_ADMIN_SECRET ||
    '';
  if (!s) throw new Error('ADMIN_SECRET (or NEXTAUTH_SECRET) not set');
  return s;
}

function b64url(buf: ArrayBuffer | Uint8Array) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 =
    typeof btoa !== 'undefined'
      ? btoa(bin)
      : Buffer.from(bin, 'binary').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromB64url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const full = b64 + pad;
  if (typeof atob !== 'undefined') {
    const bin = atob(full);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return Uint8Array.from(Buffer.from(full, 'base64'));
}

async function hmacSHA256(data: string, secret: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    // Edge / Web Crypto
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
    return b64url(sig);
  } else {
    // Node
    const { createHmac } = await import('crypto'); // <-- no "node:" prefix
    return createHmac('sha256', secret).update(data).digest('base64url');
  }
}

export async function createToken(sub = 'owner', ttl = MAX_AGE): Promise<string> {
  const payload = { sub, exp: Math.floor(Date.now() / 1000) + ttl };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = b64url(enc.encode(payloadStr));
  const sig = await hmacSHA256(payloadB64, getSecret());
  return `${payloadB64}.${sig}`;
}

export async function verifyToken(token: string): Promise<{ sub: string; exp: number }> {
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) throw new Error('Bad token');

  const expected = await hmacSHA256(payloadB64, getSecret());
  if (expected !== sig) throw new Error('Bad signature');

  const jsonBytes = fromB64url(payloadB64);
  const payload = JSON.parse(dec.decode(jsonBytes)) as { sub: string; exp: number };

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000))
    throw new Error('Token expired');

  return payload;
}

/** Build the Set-Cookie header for the admin session token */
export function setCookieHeader(token: string, ttl = MAX_AGE) {
  // Path=/admin ensures cookie only sent to admin pages
  // NOTE: Use Secure only on HTTPS; on localhost it’s still okay in modern browsers.
  return [
    `admin_token=${token}`,
    'Path=/admin',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${ttl}`,
    'Secure',
  ].join('; ');
}
