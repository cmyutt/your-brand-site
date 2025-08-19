import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "./actions"; // 서버 액션은 가져오기만 (re-export 금지)

export const runtime = "nodejs"; // 필요 없으면 지워도 됨

export default function AdminLayout({ children }: { children: React.ReactNode }) {

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

        {/* 서버 액션은 form action으로만 연결 */}
        {/* TS가 string만 허용해서 에러 → 강제 캐스팅 필요 */}
        <form action={logoutAction as any}>
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
