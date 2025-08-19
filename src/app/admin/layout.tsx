// src/app/admin/layout.tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "./actions";

export default function AdminLayout({ children }: { children: ReactNode }) {
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
        <nav style={{ display: "flex", gap: 12 }}>
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/products">Products</Link>
          <Link href="/admin/orders">Orders</Link>
        </nav>

        {/* 여기서 logoutAction은 서버 액션이므로 타입 지정 */}
        <form action={logoutAction as (formData: FormData) => Promise<void>}>
          <button
            type="submit"
            style={{ padding: "6px 10px", border: "1px solid #ddd" }}
          >
            로그아웃
          </button>
        </form>
      </header>

      <main style={{ padding: 16, maxWidth: 1080, margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}
