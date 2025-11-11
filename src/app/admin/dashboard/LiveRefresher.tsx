"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = { topic?: string; refreshDebounceMs?: number };

export default function LiveRefresher({
  topic = "orders:update",
  refreshDebounceMs = 300,
}: Props) {
  const router = useRouter();

  useEffect(() => {
    let timer: any = null;
    const es = new EventSource(`/api/sse?topic=${encodeURIComponent(topic)}`);

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), refreshDebounceMs);
    };

    es.addEventListener("message", schedule);
    es.addEventListener("ping", () => {});

    return () => {
      if (timer) clearTimeout(timer);
      es.close();
    };
  }, [router, topic, refreshDebounceMs]);

  return null;
}
