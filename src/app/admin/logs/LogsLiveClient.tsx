"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * 로그 페이지 실시간 반응기
 * - BroadcastChannel + storage 이벤트로 '로그 바뀜' 힌트 수신
 * - 힌트가 오면 6초 동안 1초 간격으로 refresh (지연/트랜잭션 대비)
 * - 중복 호출 스로틀링 포함
 */
export default function LogsLiveClient() {
  const router = useRouter();
  const lastHintTs = useRef(0);
  const burstTimer = useRef<number | null>(null);
  const burstUntil = useRef(0);

  useEffect(() => {
    const startBurst = () => {
      const now = Date.now();
      // 너무 잦은 힌트는 무시(0.8s 스로틀)
      if (now - lastHintTs.current < 800) return;
      lastHintTs.current = now;

      // 앞으로 6초 동안 1초 간격으로 refresh
      burstUntil.current = now + 6000;

      if (burstTimer.current == null) {
        burstTimer.current = window.setInterval(() => {
          const t = Date.now();
          if (t > burstUntil.current) {
            if (burstTimer.current != null) {
              clearInterval(burstTimer.current);
              burstTimer.current = null;
            }
            return;
          }
          router.refresh();
        }, 1000);
      }
      // 힌트 직후 한 번 즉시 갱신
      router.refresh();
    };

    // 1) BroadcastChannel
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel("admin-logs");
      ch.addEventListener("message", startBurst);
    } catch {
      /* 브라우저 미지원 시 무시 */
    }

    // 2) storage 이벤트(다른 탭 백업 루트)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "admin-logs:bump") startBurst();
    };
    window.addEventListener("storage", onStorage);

    // 3) SSE 구독 (logs:update)
    let es: EventSource | null = null;
    try {
      const qs = `topic=${encodeURIComponent("logs:update")}&topic=${encodeURIComponent("orders:update")}`;
      es = new EventSource(`/api/sse?${qs}`);
      es.addEventListener("message", startBurst);
      // ping 이벤트는 무시
    } catch {
      // SSE 미지원 환경은 건너뜀
    }

    return () => {
      ch?.removeEventListener("message", startBurst);
      ch?.close();
      window.removeEventListener("storage", onStorage);
      if (es) es.close();
      if (burstTimer.current != null) clearInterval(burstTimer.current);
    };
  }, [router]);

  return null;
}
