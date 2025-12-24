// apps/web/lib/passkeys/store.ts
import crypto from 'crypto';

export type PasskeyRecord = {
  id: string;
  userId: string;

  // Base64url strings (what WebAuthn uses in JSON)
  credentialId: string;
  publicKey: string;

  counter: number;
  transports?: string[];

  createdAt: string;
  lastUsedAt?: string;
  nickname?: string;
};

/**
 * DEV ONLY in-memory store.
 * Replace these functions with Supabase table lookups once you’re ready.
 */
const mem = new Map<string, PasskeyRecord>(); // key = credentialId

export function __devSeedPasskey(record: Omit<PasskeyRecord, 'id' | 'createdAt'>) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const row: PasskeyRecord = { ...record, id, createdAt };
  mem.set(row.credentialId, row);
  return row;
}

export async function getPasskeyByCredentialId(credentialId: string) {
  return mem.get(credentialId) ?? null;
}

export async function listPasskeysByUserId(userId: string) {
  return [...mem.values()].filter((r) => r.userId === userId);
}

export async function updatePasskeyCounterAndTouch(credentialId: string, newCounter: number) {
  const row = mem.get(credentialId);
  if (!row) return null;
  row.counter = newCounter;
  row.lastUsedAt = new Date().toISOString();
  mem.set(credentialId, row);
  return row;
}
