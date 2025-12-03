import './globals.css';
import type { Metadata, Viewport } from 'next';
import StripeProvider from '@/components/StripeProvider'; // new wrapper

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0a0a',
};

export const metadata: Metadata = {
  title: { default: 'WeGoLive', template: 'WeGoLive — %s' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-zinc-950">
      <body className="text-zinc-200">
        <main className="min-h-screen-dvh">
          <div className="page-pad mx-auto w-full max-w-screen-xl px-3 sm:px-4">
            {/* ✅ Stripe Elements context now in client */}
            <StripeProvider>{children}</StripeProvider>
          </div>
        </main>
      </body>
    </html>
  );
}
