export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-zinc-950">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
