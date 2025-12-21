'use client';

import { useRouter } from 'next/navigation';

export default function GoBackButton() {
  const router = useRouter();

  return (
    <div className="flex justify-center mt-6">
      <button
        onClick={() => router.back()}
        className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-md transition"
      >
        ← Go Back
      </button>
    </div>
  );
}
