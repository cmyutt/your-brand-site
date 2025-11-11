// src/app/admin/logs/AutoRefresh.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * 단순 주기 새로고침(폴백 용)
 * - intervalMs마다 router.refresh()
 * - LogsLiveClient(브로드캐스트)와 함께 써도 무방
 */
export default function AutoRefresh({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), intervalMs);
    return () => window.clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
