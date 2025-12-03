// apps/web/app/adult/page.tsx
import type { Metadata } from 'next';
import AdultClientView from './AdultClientView';

export const metadata: Metadata = {
  title: 'Adult Content · WeGoLive',
  description: 'Live streams with adult content only',
};

export default function AdultPage() {
  return <AdultClientView />;
}
