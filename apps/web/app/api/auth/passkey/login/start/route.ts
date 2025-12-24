import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateAuthenticationOptions } from '@simplewebauthn/server';

function fromBase64URL(input: string): Uint8Array {
  const pad = '='.repeat((4 - (input.length % 4)) % 4);
  const b64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = Buffer.from(b64, 'base64');
  return new Uint8Array(raw);
}

function toBase64URL(buffer: Uint8Array): string {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function getRpAndOrigin(req: NextRequest) {
  const envRpId = process.env.PASSKEY_RP_ID;
  const envOrigin = process.env.PASSKEY_ORIGIN;

  if (envRpId && envOrigin) return { rpID: envRpId, origin: envOrigin };

  const host = req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const hostname = host.split(':')[0]; // strip port
  return { rpID: hostname, origin: `${proto}://${host}` };
}

export async function POST(req: NextRequest) {
  const { rpID } = getRpAndOrigin(req);

  const body = await req.json().catch(() => ({}));
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !serviceRole) {
    return NextResponse.json({ error: 'Server missing Supabase env vars.' }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // If email provided, we constrain allowed credentials for faster UX.
  // If NOT provided, we allow "discoverable credentials" (username-less passkey).
  let allowCredentials: any[] = [];

  if (email) {
    const { data, error } = await admin
      .from('passkeys')
      .select('credential_id, transports')
      .eq('email', email);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Build allowCredentials for SimpleWebAuthn *JSON* options
    allowCredentials =
      (data ?? []).map((row: any) => ({
        id:
          typeof row.credential_id === 'string'
            ? row.credential_id // already base64url
            : Buffer.from(row.credential_id).toString('base64url'), // bytea/buffer -> base64url
        type: 'public-key' as const,
        transports: Array.isArray(row.transports) ? (row.transports as any) : undefined,
      })) || [];
  }

    const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'required',
    allowCredentials: allowCredentials.length ? allowCredentials : undefined,
    timeout: 60_000,
    });


  // Store challenge in HttpOnly cookie (5 min)
  const res = NextResponse.json({ options });
  res.cookies.set('wegolive_pk_login', JSON.stringify({ c: options.challenge, exp: Date.now() + 5 * 60_000 }), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });

  return res;
}
