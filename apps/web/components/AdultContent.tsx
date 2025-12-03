'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdultContentLink() {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = () => {
    setShowModal(true);
  };

  const confirmAccess = () => {
    localStorage.setItem('adult-content-enabled', 'true');
    setShowModal(false);
    if (pathname !== '/adult') router.push('/adult');
  };

  return (
    <>
      {/* 🔗 Red clickable text */}
      <button
        onClick={handleClick}
        className="text-sm font-semibold text-red-500 hover:underline hover:text-red-400 transition"
      >
        Adult Content
      </button>

      {/* ⚠️ Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
          <div className="bg-zinc-900 p-6 rounded-lg max-w-md w-full border border-zinc-700 shadow-xl">
            <h2 className="text-xl font-semibold text-white">Adult Content Disclaimer</h2>
            <p className="text-sm text-zinc-400 mt-3">
              This section contains adult-oriented material that may not be suitable for all audiences.
              You must be 18 years or older to continue.
            </p>
            <p className="text-xs text-zinc-500 mt-2 italic">
              By clicking "I Agree", you confirm that you are of legal age and wish to proceed.
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-zinc-700 text-sm text-white rounded hover:bg-zinc-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmAccess}
                className="px-4 py-2 bg-red-600 text-sm text-white rounded hover:bg-red-500"
              >
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
