// apps/web/app/coming-soon/page.tsx

export default function ComingSoon() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white text-center px-4">
      <div>
        <h1 className="text-4xl md:text-6xl font-bold mb-4">🚧 WeGoLive is Coming Soon</h1>
        <p className="text-zinc-400 text-lg mb-6">
          We’re building something awesome. Check back soon!
        </p>

        <a
          href="/login"
          className="inline-block mt-4 rounded bg-emerald-500 px-6 py-2 text-white hover:bg-emerald-600 transition"
        >
          Admin Login
        </a>
      </div>
    </main>
  );
}
