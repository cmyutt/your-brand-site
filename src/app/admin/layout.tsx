// src/app/admin/layout.tsx (clean UTF-8)
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { logoutAction } from "./actions";
import AdminNav from "./_Nav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const jar = await cookies();
  const isAdmin = jar.get("admin")?.value === "1";

  return (
    <div>
      <header
        style={{
          display: "flex",
          gap: 16,
          padding: "12px 16px",
          borderBottom: "1px solid #eee",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {isAdmin ? <AdminNav /> : <div />}

        {isAdmin ? (
          <form action={logoutAction}>
            <button type="submit" style={{ padding: "6px 10px", border: "1px solid #ddd" }}>
              로그아웃
            </button>
          </form>
        ) : null}
      </header>

      <main
        style={{
          padding: "24px 32px 48px",
          width: "100%",
          maxWidth: "min(100%, 1400px)",
          margin: "0 auto",
        }}
      >
        {children}
      </main>
    </div>
  );
}
