'use client';

import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function TrackView() {
  useEffect(() => {
    const sendPageView = async () => {
      try {
        const supabase = createClientComponentClient();

        // Get user's approximate location
        const geoRes = await fetch('https://ipinfo.io/json?token=9f156bbb52c373');
        const geoData = await geoRes.json();
        const country = geoData.country || 'Unknown';

        await supabase.from('Viewers').insert([
          {
            page: window.location.pathname,
            user_agent: navigator.userAgent,
            type: 'page_view',
            location: country, // Add this column in your Supabase if not already
          },
        ]);
      } catch (err) {
        console.warn('View tracking failed', err);
      }
    };

    sendPageView();
  }, []);

  return null;
}
