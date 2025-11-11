"use client";

// CODPATCH: OrdersLiveClient — hooks for status badge
import { useEffect, useState } from "react";
// CODPATCH: OrdersLiveClient — row patch hook
import { useRowPatch } from "./RowPatchContext";
// CODPATCH: OrdersLiveClient — track SSE readyState
type SseState = "connecting" | "open" | "error";
import { useRouter } from "next/navigation";

type Props = { topic?: string; topics?: string[]; refreshDebounceMs?: number };

export default function OrdersLiveClient({
  topic = "orders:update",
  topics,
  refreshDebounceMs = 300,
}: Props) {
  const router = useRouter();
  const { patchRow } = useRowPatch();
  // CODPATCH: OrdersLiveClient — online/offline status
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [sse, setSse] = useState<SseState>("connecting");
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    let timer: any = null;
    const qs = (topics && topics.length > 0)
      ? topics.map((t) => `topic=${encodeURIComponent(t)}`).join("&")
      : `topic=${encodeURIComponent(topic)}`;
    const es = new EventSource(`/api/sse?${qs}`);
    setSse("connecting");

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), refreshDebounceMs);
    };

    es.addEventListener("message", async (ev: MessageEvent) => {
      try {
        const j = JSON.parse(String((ev as any).data || "{}"));
        const topic = j?.topic;
        const payload = j?.payload ?? j; // accept either shape
        if (topic === "orders:update") {
          if (payload?.id && payload?.patch) {
            patchRow(String(payload.id), payload.patch);
            return;
          }
          if (payload?.id && !payload?.patch) {
            try {
              const res = await fetch(`/api/admin/orders/${payload.id}/row`, { cache: "no-store" });
              const json = await res.json();
              if (json?.ok && json?.row) patchRow(String(payload.id), json.row);
              return;
            } catch {}
          }
        }
      } catch {
        /* ignore parse errors */
      }
      schedule();
    });
    es.addEventListener("ping", () => {});
    es.onopen = () => setSse("open");
    es.onerror = () => setSse("error");

    return () => {
      if (timer) clearTimeout(timer);
      es.close();
    };
  }, [router, topic, refreshDebounceMs, topics && topics.join(",")]);

  return (
    <div className="fixed bottom-3 right-3 z-50 select-none pointer-events-none">
      <span
        data-codpatch="sse-status-badge"
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ring-1 ${
          !online ? "bg-amber-50 text-amber-800 ring-amber-200"
          : sse === "open" ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
          : sse === "connecting" ? "bg-blue-50 text-blue-800 ring-blue-200"
          : "bg-red-50 text-red-800 ring-red-200"
        }`}
        title={!online ? "오프라인 — 연결 복구 시 자동 동기화" : sse === "open" ? "SSE 연결됨" : sse === "connecting" ? "SSE 연결 중…" : "SSE 오류 — 재시도 중"}
        aria-live="polite"
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: !online ? "#f59e0b" : sse === "open" ? "#10b981" : sse === "connecting" ? "#3b82f6" : "#ef4444" }}
        />
        {!online ? "오프라인" : sse === "open" ? "실시간 연결 양호" : sse === "connecting" ? "연결 중…" : "연결 오류"}
      </span>
    </div>
  );
}
