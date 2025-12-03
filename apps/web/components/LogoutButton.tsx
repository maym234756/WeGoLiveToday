'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error.message);
      return;
    }

    // Redirect to login after logout
    router.push('/login');
    router.refresh(); // Just in case
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-red-500 hover:text-red-400 border border-red-500 px-3 py-1 rounded-md"
    >
      Logout
    </button>
  );
}
