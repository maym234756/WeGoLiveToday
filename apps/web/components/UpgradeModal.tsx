'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function UpgradeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // 🧠 Detect ?upgraded=true in the URL and show toast
  useEffect(() => {
    if (searchParams?.get('upgraded') === 'true') {
      toast.success("You're now a Pro user! 🎉");
      router.replace('/coming-soon'); // clean up URL
    }
  }, [searchParams, router]);

  // 🧠 Close modal on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 🧠 Check if user is already Pro
  useEffect(() => {
    const checkProStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_upgrades')
        .select('is_pro')
        .eq('user_id', user.id)
        .single();

      if (data?.is_pro) {
        setIsPro(true);
      }
    };

    checkProStatus();
  }, []);

  // 🚀 Stripe redirect + log to Supabase
  const handleUpgrade = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to upgrade.');
        return;
      }

      // Optional: log start of upgrade attempt
      await supabase.from('user_upgrades').upsert({
        user_id: user.id,
        email: user.email,
        is_pro: false,
        created_at: new Date().toISOString(),
      });

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ user_id: user.id }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        toast.error('Stripe error: No URL received.');
      }
    } catch (err) {
      console.error('Upgrade error:', err);
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={isPro}
        className={`text-sm border px-3 py-1 rounded-md ${
          isPro
            ? 'text-gray-400 border-gray-500 cursor-not-allowed'
            : 'text-emerald-400 hover:text-emerald-300 border-emerald-500'
        }`}
      >
        {isPro ? 'Pro User' : 'Upgrade +'}
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div
            ref={modalRef}
            className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-lg w-full text-white shadow-xl"
          >
            <h2 className="text-xl font-semibold mb-2">Upgrade to WeGoLiveToday+</h2>

            {/* Feature Comparison */}
            <div className="overflow-x-auto text-sm text-zinc-300 mb-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-emerald-400 border-b border-zinc-700">
                    <th className="py-1 pr-2">Feature</th>
                    <th className="py-1 px-2">Free</th>
                    <th className="py-1 px-2">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Stream Quality', '480p', '1080p HD'],
                    ['Chat Limit', '500 words', 'Unlimited'],
                    ['Custom Colors', '❌', '✅'],
                    ['Profile Banner', '❌', '✅'],
                    ['Priority Boost', '❌', '✅'],
                    ['Early Access', '❌', '✅'],
                  ].map(([feature, free, pro], i) => (
                    <tr key={i} className="border-b border-zinc-800">
                      <td className="py-1 pr-2">{feature}</td>
                      <td className="py-1 px-2">{free}</td>
                      <td className="py-1 px-2 text-emerald-400 font-bold">{pro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 border border-zinc-600 rounded hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleUpgrade}
                disabled={loading || isPro}
                className={`px-3 py-1 font-medium rounded ${
                  loading || isPro
                    ? 'bg-gray-500 text-white cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-black'
                }`}
              >
                {loading ? 'Redirecting...' : isPro ? 'Already Pro' : 'Upgrade Now ($5.49)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
