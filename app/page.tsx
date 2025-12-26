// app/page.tsx
export const dynamic = "force-static";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 720 }}>
        <h1 style={{ fontSize: 48, margin: "0 0 12px" }}>WeGoLiveToday</h1>
        <p style={{ fontSize: 18, margin: "0 0 24px", opacity: 0.8 }}>
          Coming soon. Check back shortly.
        </p>
      </div>
    </main>
  );
}
