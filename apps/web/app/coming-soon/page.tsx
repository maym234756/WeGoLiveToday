// apps/web/app/coming-soon/page.tsx

export default function ComingSoon() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-black text-white text-center px-4">
      <div className="max-w-xl">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">
          🚧 WeGoLiveToday is Coming Soon
        </h1>

        <p className="text-zinc-400 text-lg mb-6">
          We’re building the future of live streaming — launching in <span className="text-emerald-400 font-semibold">2026</span>!
        </p>

        <p className="text-zinc-500 text-sm mb-10">
          Follow us for updates and sneak peeks into what’s coming.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <a
            href="/login"
            className="rounded bg-emerald-500 px-6 py-2 text-white font-medium hover:bg-emerald-600 transition"
          >
          </a>

          <a
            href="mailto:teamwegolivetoday@yahoo.com"
            className="rounded border border-zinc-700 px-6 py-2 text-zinc-300 hover:border-emerald-500 hover:text-white transition"
          >
            Contact Us
          </a>
        </div>

        <p className="text-xs text-zinc-600 mt-10">© {new Date().getFullYear()} WeGoLiveToday. All rights reserved.</p>
      </div>
    </main>
  );
}
