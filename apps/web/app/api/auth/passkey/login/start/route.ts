// apps/web/app/api/auth/passkey/login/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cookie that stores the login challenge for the passkey ceremony.
 * Signed so the client cannot tamper with it.
 */
const COOKIE_NAME = 'wegolive.passkey.login';
const COOKIE_PATH = '/api/auth/passkey';
const CHALLENGE_TTL_SECONDS = 5 * 60;

/**
 * ENV REQUIRED:
 * - PASSKEY_RP_ID        (example: wegolive.com or localhost)
 * - PASSKEY_COOKIE_SECRET (random long secret)
 *
 * Optional:
 * - PASSKEY_TIMEOUT_MS   (default 60000)
 */
function getEnv(name: string) {
  const v = process.env[name];
  return v && v.trim().length ? v.trim() : undefined;
}

function mustGetEnv(name: string) {
  const v = getEnv(name);
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function b64url(input: string) {
  return Buffer.from(input).toString('base64url');
}

function sign(payloadJson: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(payloadJson).digest('base64url');
}

function packSignedCookie(data: Record<string, unknown>, secret: string) {
  const json = JSON.stringify(data);
  const sig = sign(json, secret);
  return `${b64url(json)}.${sig}`;
}

type StartBody = {
  /**
   * Optional identifier if you want to narrow allowCredentials later.
   * You can pass:
   * - userId (UUID)
   * - email (string)
   *
   * This endpoint still works without it (discoverable credentials).
   */
  userId?: string;
  email?: string;
};

/**
 * Optional: If you later store passkeys in Supabase (recommended),
 * you can return allowCredentials here to narrow the prompt.
 *
 * For now we return undefined -> usernameless / discoverable credentials.
 */
async function getAllowCredentials(_body: StartBody) {
  // TODO (later): fetch credential IDs from your DB by userId/email
  // return [{ id: 'base64urlCredentialId', type: 'public-key', transports: ['internal'] }]
  return undefined as
    | Array<{ id: string; type: 'public-key'; transports?: AuthenticatorTransport[] }>
    | undefined;
}

export async function POST(req: NextRequest) {
  try {
    const rpID = mustGetEnv('PASSKEY_RP_ID');
    const cookieSecret = mustGetEnv('PASSKEY_COOKIE_SECRET');
    const timeout = Number(getEnv('PASSKEY_TIMEOUT_MS') ?? '60000');

    let body: StartBody = {};
    try {
      body = (await req.json()) as StartBody;
    } catch {
      // allow empty body
    }

    const allowCredentials = await getAllowCredentials(body);

    const options = await generateAuthenticationOptions({
      rpID,
      timeout,
      userVerification: 'preferred',
      // If undefined -> discoverable credential flow (best UX on mobile)
      ...(allowCredentials ? { allowCredentials } : {}),
    });

    // Store challenge server-side (signed cookie)
    const cookiePayload = {
      challenge: options.challenge,
      createdAt: Date.now(),
      // If you decide to bind to a user, store it here too:
      userId: body.userId ?? null,
      email: body.email ?? null,
    };

    const res = NextResponse.json({ options }, { status: 200 });

    res.cookies.set(COOKIE_NAME, packSignedCookie(cookiePayload, cookieSecret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: COOKIE_PATH,
      maxAge: CHALLENGE_TTL_SECONDS,
    });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Failed to start passkey login.' },
      { status: 500 },
    );
  }
}
