'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function UpgradeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpgrade = async () => {
  setLoading(true);

  try {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
    });

    const { url } = await res.json();

    if (url) {
      window.location.href = url;
    } else {
      console.error('No redirect URL received');
    }
  } catch (err) {
    console.error('Stripe redirect error:', err);
  } finally {
    setLoading(false);
  }
};

  return (
    <>
      {/* Upgrade button */}
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm text-emerald-400 hover:text-emerald-300 border border-emerald-500 px-3 py-1 rounded-md"
      >
        Upgrade +
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full text-white shadow-xl">
            <h2 className="text-xl font-semibold mb-2">Upgrade to WeGoLiveToday+</h2>
            <ul className="text-sm text-zinc-400 mb-4 list-disc pl-5 space-y-1">
              <li>🎥 Stream in 1080p HD (starts at 480p)</li>
              <li>💬 Unlimited chat messages (free tier: 500 words, cooldown after)</li>
              <li>🌈 Custom name colors</li>
              <li>📣 Add a profile banner</li>
              <li>🚀 Priority placement & exposure</li>
            </ul>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 border border-zinc-600 rounded hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-black font-medium rounded"
              >
                {loading ? 'Redirecting...' : 'Upgrade Now ($5.49)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
