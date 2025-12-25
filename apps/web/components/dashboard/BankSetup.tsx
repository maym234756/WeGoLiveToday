import React, { useState, useCallback, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';

type Bank = { id: string; name: string; masked: string; type: string };

export default function BankSetup({ pushToast }: { pushToast: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [form, setForm] = useState({ name: '', account: '', routing: '', type: 'personal', instantVerify: false });
  const [connectedBanks, setConnectedBanks] = useState<Bank[]>([]);

  // create link token on demand - require credentials and validate response
  const createLinkToken = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payouts/create_link_token', { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        pushToast(err?.error || 'Failed to create link token');
        return null;
      }
      const { linkToken } = await res.json();
      return linkToken ?? null;
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  const onSuccess = useCallback(async (public_token: string, metadata: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/payouts/exchange_public_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token, metadata }),
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        // add a lightweight connected bank entry using Plaid metadata when available
        const acct = metadata?.accounts?.[0];
        const inst = metadata?.institution;
        setConnectedBanks(prev => [
          ...prev,
          {
            id: inst?.institution_id ?? Date.now().toString(),
            name: inst?.name ?? acct?.name ?? 'Plaid Bank',
            masked: acct?.mask ? `•••${acct.mask}` : acct?.last4 ? `•••${acct.last4}` : '•••0000',
            type: acct?.subtype ?? acct?.type ?? 'checking',
          },
        ]);
        // clear link token as soon as exchange completes
        setLinkToken(null);
        pushToast('Bank connected');
        setOpen(false);
      } else {
        pushToast(json?.error || 'Failed to connect bank');
      }
    } catch (err) {
      pushToast('Network error');
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  // Plaid Link hook creation (we open programmatically)
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const { open: openPlaid, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess,
    onExit: (err: any, metadata: any) => {
      setOpen(false);
      // clear token on exit to reduce sensitive data lifetime
      setLinkToken(null);
      if (err) pushToast('Plaid exited with error');
      else pushToast('Plaid closed');
    },
  });

  // open Plaid when token available and hook is ready, then clear token immediately after opening
  useEffect(() => {
    let opened = false;
    if (linkToken && ready && typeof openPlaid === 'function') {
      openPlaid();
      opened = true;
      // clear token after opening to reduce in-memory lifetime
      setLinkToken(null);
    }
    return () => {
      if (opened) {
        // noop - token already cleared; keep effect for symmetry/cleanup if needed
      }
    };
  }, [linkToken, ready, openPlaid]);

  async function handleOpenPlaid() {
    const token = await createLinkToken();
    if (!token) return;
    // set token briefly so usePlaidLink hook can open; it will be cleared once opened
    setLinkToken(token);
    setOpen(true);
  }

  // keyboard escape for manual modal
  useEffect(() => {
    if (!manualOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setManualOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [manualOpen]);

  // Simple client-side masking/validation
  function maskAccount(acc: string) {
    const trimmed = acc.replace(/\D/g, '');
    if (!trimmed) return '';
    return '•••' + trimmed.slice(-4);
  }
  function validRouting(r: string) {
    return /^\d{9}$/.test(r.replace(/\D/g, ''));
  }
  function validAccount(a: string) {
    const t = a.replace(/\D/g, '');
    return t.length >= 4 && t.length <= 17;
  }

  async function submitManual() {
    if (!form.name.trim()) return pushToast('Enter account holder name');
    if (!validRouting(form.routing)) return pushToast('Enter valid 9-digit routing number');
    if (!validAccount(form.account)) return pushToast('Enter valid account number (4-17 digits)');
    setLoading(true);
    try {
      const res = await fetch('/api/payouts/add-bank-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ensure this hits server over HTTPS and server will tokenize securely
        body: JSON.stringify({ ...form }),
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        const masked = maskAccount(form.account);
        setConnectedBanks(prev => [
          ...prev,
          { id: Date.now().toString(), name: form.name, masked, type: form.type },
        ]);
        // clear sensitive fields immediately after tokenization
        setForm({ name: '', account: '', routing: '', type: 'personal', instantVerify: false });
        pushToast('Bank added (pending verification)');
        setManualOpen(false);
      } else {
        pushToast(json?.error || 'Failed to add bank');
      }
    } catch {
      pushToast('Network error');
    } finally {
      setLoading(false);
    }
  }

  // clear sensitive state on unload / unmount
  useEffect(() => {
    const onUnload = () => {
      // best-effort wipe of sensitive values in memory
      setForm({ name: '', account: '', routing: '', type: 'personal', instantVerify: false });
      setLinkToken(null);
    };
    window.addEventListener('beforeunload', onUnload);
    return () => {
      onUnload();
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  return (
    <>
      {/* Connected banks */}
      {connectedBanks.length > 0 && (
        <div className="mb-3 space-y-2">
          <h4 className="text-sm text-zinc-400">Connected banks</h4>
          <div className="flex flex-col gap-2">
            {connectedBanks.map(b => (
              <div key={b.id} className="flex items-center justify-between rounded-md bg-zinc-900 px-3 py-2 text-sm">
                <div>
                  <div className="font-medium text-zinc-200">{b.name}</div>
                  <div className="text-xs text-zinc-500">{b.masked} · {b.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleOpenPlaid}
          disabled={loading}
          aria-busy={loading}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-60"
        >
          {loading ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
          ) : null}
          Connect bank (Plaid)
        </button>
        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
        >
          Add bank (manual)
        </button>
      </div>

      {/* Manual modal */}
      {manualOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg bg-zinc-900 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add bank (manual)</h3>
              <button onClick={() => setManualOpen(false)} className="text-zinc-400">Close</button>
            </div>
            <div className="mt-3 space-y-3">
              <label className="text-xs text-zinc-400">Account holder name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                autoComplete="off"
                aria-label="Account holder name"
                name="account-holder-name"
              />
              <label className="text-xs text-zinc-400">Routing number</label>
              <input
                value={form.routing}
                onChange={(e) => setForm({ ...form, routing: e.target.value.replace(/\D/g, '') })}
                maxLength={9}
                inputMode="numeric"
                pattern="\d{9}"
                autoComplete="off"
                aria-label="Routing number"
                name="routing-number"
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
              />
              <label className="text-xs text-zinc-400">Account number</label>
              <input
                value={form.account}
                onChange={(e) => setForm({ ...form, account: e.target.value.replace(/\D/g, '') })}
                inputMode="numeric"
                pattern="\d{4,17}"
                autoComplete="off"
                aria-label="Account number"
                name="account-number"
                placeholder="•••1234"
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
              />
              <div className="flex items-center gap-2">
                <input id="instant" type="checkbox" checked={form.instantVerify} onChange={(e) => setForm({ ...form, instantVerify: e.target.checked })} />
                <label htmlFor="instant" className="text-xs text-zinc-400">Attempt instant verification when supported</label>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setManualOpen(false)} className="px-3 py-2 text-sm text-zinc-300">Cancel</button>
                <button onClick={submitManual} disabled={loading} className="px-3 py-2 rounded bg-emerald-600 text-white text-sm">{loading ? 'Saving…' : 'Save'}</button>
              </div>
              <div className="text-xs text-zinc-500">We will not store raw account numbers; they are exchanged server-side into a processor token.</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}