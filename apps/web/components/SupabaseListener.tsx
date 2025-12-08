'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SupabaseListener() {
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = session.user;

        // Check if user already exists in the User Signup List
        const { data: existingUser } = await supabase
          .from('User Signup List')
          .select('uuid')
          .eq('uuid', user.id)
          .single();

        if (!existingUser) {
          await supabase.from('User Signup List').insert([
            {
              uuid: user.id,
              email: user.email,
              name: user.user_metadata?.name || '',
              created_at: new Date().toISOString(),
              is_pro: false,
            },
          ]);
          console.log('✅ User inserted into User Signup List');
        }
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return null;
}
