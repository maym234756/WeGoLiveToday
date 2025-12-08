// apps/web/app/layout.tsx
import './globals.css';
import { Metadata, Viewport } from 'next';
import StripeProvider from '@/components/StripeProvider';
import { Analytics } from '@vercel/analytics/react';
import SupabaseListener from '@/components/SupabaseListener'; // ✅ Client-only

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0a0a',
};

export const metadata: Metadata = {
  title: {
    default: 'WeGoLive',
    template: 'WeGoLive – %s',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-zinc-950">
      <body className="text-zinc-200">
        <SupabaseListenerWrapper>
          <main className="min-h-screen">
            <div className="page-pad mx-auto w-full max-w-screen-xl px-3 sm:px-4">
              <StripeProvider>{children}</StripeProvider>
            </div>
          </main>
          <Analytics />
        </SupabaseListenerWrapper>
      </body>
    </html>
  );
}

// ✅ This wraps the client component outside of metadata context
function SupabaseListenerWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SupabaseListener />
      {children}
    </>
  );
}
