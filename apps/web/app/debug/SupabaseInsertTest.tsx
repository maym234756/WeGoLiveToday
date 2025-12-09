'use client';

import { useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient'; // update path if needed

export default function SupabaseInsertTest() {
  useEffect(() => {
    const testInsert = async () => {
      const { error } = await supabase.from('User Signup List').insert([
        {
          id: 99999,
          email: 'debug@example.com',
          first_name: 'Debug',
          last_name: 'Tester',
          gender: 'Other',
          dob: '2000-01-01',
          is_pro: false,
          signed_up_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        console.error('🔥 Supabase insert error:', error);
      } else {
        console.log('✅ Insert successful');
      }
    };

    testInsert();
  }, []);

  return (
    <div className="p-4 text-sm text-zinc-300">
      <p>📦 Testing Supabase insert...</p>
      <p>Open DevTools (F12) → Console for results.</p>
    </div>
  );
}
