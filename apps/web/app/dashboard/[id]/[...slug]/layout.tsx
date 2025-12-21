// app/dashboard/layout.tsx
import Sidebar from '@/components/dashboard/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 page-pad px-3 sm:px-4">
        {children}
      </main>
    </div>
  );
}
