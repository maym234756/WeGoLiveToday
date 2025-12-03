'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TokenBadge() {
  const [tokens, setTokens] = useState<number | null>(null);

  useEffect(() => {
    const getTokenBalance = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setTokens(0);
        return;
      }

      // Fetch tokens from your custom table
      const { data, error } = await supabase
        .from('User Signup List')
        .select('tokens')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching token balance:', error);
        setTokens(0);
        return;
      }

      // Handle null, undefined, or missing token value
      const tokenValue =
        data?.tokens !== null && data?.tokens !== undefined ? data.tokens : 0;

      setTokens(tokenValue);
    };

    getTokenBalance();
  }, []);

  return (
    <div className="rounded-full bg-zinc-900 px-3 py-1 text-sm text-white border border-emerald-500">
      {tokens !== null ? `${tokens} Tokens` : '0 Tokens'}
    </div>
  );
}
