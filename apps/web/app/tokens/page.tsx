'use client';

import { useState } from 'react';
import PaymentModal from '@/components/PaymentModal'; 
import Link from 'next/link';

type Bundle = {
  id: string;
  name: string;
  tokens: number;
  bonus?: number;
  price: number;         // USD
  best?: boolean;
  priceId?: string;      // Stripe price id (optional)
};

const bundles: Bundle[] = [
  { id: 'starter',  name: 'Starter',  tokens: 100,  price: 4.99 },
  { id: 'bronze',   name: 'Bronze',   tokens: 500,  price: 19.99, bonus: 50 },
  { id: 'silver',   name: 'Silver',   tokens: 1000, price: 34.99, bonus: 150, best: true },
  { id: 'gold',     name: 'Gold',     tokens: 2500, price: 79.99, bonus: 500 },
  { id: 'platinum', name: 'Platinum', tokens: 5000, price: 149.99, bonus: 1250 },
];


export default function TokenBundlesPage() {
  // ✅ Modal State
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);

  return (
    <div className="mx-auto w-full max-w-screen-xl">
      {/* Header */}
      <div className="page-pad mb-6 mt-2 sm:mt-4">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          ← Back to dashboard
        </Link>

        <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
          Purchase Tokens
        </h1>
        <p className="mt-1 max-w-prose text-sm text-zinc-400">
          Choose a bundle to support creators, unlock perks, and tip during live streams.
        </p>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 gap-3 px-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {bundles.map((b) => (
          <BundleCard 
            key={b.id} 
            b={b}
            onPurchase={() => setSelectedBundle(b)} 
          />
        ))}
      </div>

      {/* Payment Modal */}
      {selectedBundle && (
        <PaymentModal
          open={!!selectedBundle}
          onClose={() => setSelectedBundle(null)}
          bundle={selectedBundle}
        />
      )}

      {/* Footnote */}
      <p className="page-pad mt-6 text-xs text-zinc-500">
        Tokens are non-refundable and subject to our Terms. Taxes may apply.
      </p>
    </div>
  );
}

// -----------------------------------------------------
// Bundle Card Component
// -----------------------------------------------------

function BundleCard({ b, onPurchase }: { b: Bundle; onPurchase: () => void }) {
  return (
    <div className="relative rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      {b.best && (
        <span className="absolute right-2 top-2 rounded bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white">
          BEST VALUE
        </span>
      )}

      <h3 className="text-lg font-semibold text-white">{b.name}</h3>

      <p className="text-sm text-zinc-400 mt-1">
        {b.tokens.toLocaleString()} tokens
        {typeof b.bonus === 'number' && b.bonus > 0 && (
          <span className="text-emerald-400"> +{b.bonus} bonus</span>
        )}
      </p>

      <p className="mt-2 text-xl font-bold text-white">
        ${b.price.toFixed(2)} USD
      </p>

      <button
        onClick={onPurchase}
        className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded"
      >
        Purchase
      </button>
    </div>
  );
}
