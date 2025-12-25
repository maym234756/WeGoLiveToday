"use client";

import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  const hideOn = new Set(["/login", "/signup"]);

  if (hideOn.has(pathname)) return null;

  return (
    <footer className="border-t border-zinc-800/60">
      {/* Footer content */}
    </footer>
  );
}
