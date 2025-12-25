import { cookies } from "next/headers";

export default function Layout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  // If needed later:
  // const admin = cookieStore.get("wegl_admin")?.value ?? cookieStore.get("admin_token")?.value ?? null;

  return children;
}

// Install commands (to be run in the terminal, not included in the code):
// npm install next react react-dom
// npm install -D typescript @types/node