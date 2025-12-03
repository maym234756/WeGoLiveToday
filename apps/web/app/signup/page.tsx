// apps/web/app/signup/page.tsx
import type { Metadata } from 'next';
import SignupForm from '@/components/SignupForm';

export const metadata: Metadata = {
  title: 'Create account · WeGoLive',
};

export default function SignupPage() {
  return (
    <main className="min-h-[calc(100vh-0px)] flex items-center justify-center px-4">
      <SignupForm />
    </main>
  );
}
