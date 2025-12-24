import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
type AuthenticationResponseJSON = any;

function toBase64URL(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function getRpAndOrigin(req: NextRequest) {
  const envRpId = process.env.PASSKEY_RP_ID;
  const envOrigin = process.env.PASSKEY_ORIGIN;

  if (envRpId && envOrigin) return { rpID: envRpId, origin: envOrigin };

  const host = req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const hostname = host.split(':')[0];
  return { rpID: hostname, origin: `${proto}://${host}` };
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const raw = cookieStore.get('wegolive_pk_login')?.value;

  if (!raw) return NextResponse.json({ error: 'Missing login challenge.' }, { status: 400 });

  let parsed: { c: string; exp: number } | null = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }

  if (!parsed?.c || !parsed?.exp || Date.now() > parsed.exp) {
    return NextResponse.json({ error: 'Login challenge expired. Try again.' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const credential = body?.credential as AuthenticationResponseJSON | undefined;
  if (!credential) return NextResponse.json({ error: 'Missing credential.' }, { status: 400 });

  const { rpID, origin } = getRpAndOrigin(req);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !serviceRole) {
    return NextResponse.json({ error: 'Server missing Supabase env vars.' }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Lookup passkey by credential ID
  const credIdB64Url = credential.id; // simplewebauthn/browser returns base64url
  const { data: pk, error: pkErr } = await admin
    .from('passkeys')
    .select('id, user_id, email, public_key, counter')
    .eq('credential_id', credIdB64Url)
    .maybeSingle();

  if (pkErr) return NextResponse.json({ error: pkErr.message }, { status: 500 });
  if (!pk) return NextResponse.json({ error: 'Passkey not recognized.' }, { status: 401 });

  // 2) Verify WebAuthn assertion
  const verification = await verifyAuthenticationResponse({
    response: credential,
    expectedChallenge: parsed.c,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credIdB64Url,
      publicKey: Buffer.from(pk.public_key.replace(/-/g, '+').replace(/_/g, '/'), 'base64'),
      counter: Number(pk.counter || 0),
    },
    requireUserVerification: true,
  });

  if (!verification.verified) {
    return NextResponse.json({ error: 'Face authentication failed.' }, { status: 401 });
  }

  // 3) Update counter + last used
  const newCounter = verification.authenticationInfo.newCounter;
  await admin
    .from('passkeys')
    .update({ counter: newCounter, last_used_at: new Date().toISOString() })
    .eq('id', pk.id);

  // 4) Mint Supabase session WITHOUT email/password:
  //    - generateLink creates a login token/link (admin)
  //    - verifyOtp signs in with token_hash (server-side cookie session)
  // Docs: generateLink + verifyOtp token_hash :contentReference[oaicite:1]{index=1}
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: pk.email,
  });

  if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });

  const tokenHash =
    (linkData as any)?.properties?.hashed_token ||
    (linkData as any)?.properties?.token_hash ||
    null;

  if (!tokenHash) {
    return NextResponse.json({ error: 'Could not mint session token.' }, { status: 500 });
  }

  const supabase = createRouteHandlerClient({ cookies });

  const { error: otpErr } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'email',
  });

  if (otpErr) return NextResponse.json({ error: otpErr.message }, { status: 500 });

  // Clear the challenge cookie
  const res = NextResponse.json({
    ok: true,
    userId: pk.user_id,
    redirectTo: `/dashboard/${pk.user_id}`,
  });
  res.cookies.set('wegolive_pk_login', '', { path: '/', maxAge: 0 });

  return res;
}
