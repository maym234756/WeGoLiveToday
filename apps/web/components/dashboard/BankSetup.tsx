import React, { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';

export default function BankSetup({ pushToast }: { pushToast: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [form, setForm] = useState({ name: '', account: '', routing: '', type: 'personal', instantVerify: false });

  // create link token on demand
  const createLinkToken = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payouts/create_link_token', { method: 'POST' });
      const { linkToken } = await res.json();
      return linkToken;
    } finally {
      setLoading(false);
    }
  }, []);

  const onSuccess = useCallback(async (public_token: string, metadata: any) => {
    // send public_token to server to exchange + attach to customer
    setLoading(true);
    try {
      const res = await fetch('/api/payouts/exchange_public_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token, metadata }),
      });
      const json = await res.json();
      if (res.ok) {
        pushToast('Bank connected (mock)');
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
    onExit: () => setOpen(false),
  });

  async function handleOpenPlaid() {
    const token = await createLinkToken();
    if (!token) return pushToast('Could not create link token');
    setLinkToken(token);
    // small delay to ensure hook receives token
    setTimeout(() => openPlaid(), 100);
  }

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
        body: JSON.stringify({ ...form }),
      });
      const json = await res.json();
      if (res.ok) {
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

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { setOpen(true); handleOpenPlaid(); }}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-2 text-sm text-white"
        >
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
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-zinc-900 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add bank (manual)</h3>
              <button onClick={() => setManualOpen(false)} className="text-zinc-400">Close</button>
            </div>
            <div className="mt-3 space-y-3">
              <label className="text-xs text-zinc-400">Account holder name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200" />
              <label className="text-xs text-zinc-400">Routing number</label>
              <input value={form.routing} onChange={(e) => setForm({ ...form, routing: e.target.value.replace(/\D/g, '') })} maxLength={9} className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200" placeholder="123456789" />
              <label className="text-xs text-zinc-400">Account number</label>
              <input value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value.replace(/\D/g, '') })} className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200" placeholder="•••1234" />
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