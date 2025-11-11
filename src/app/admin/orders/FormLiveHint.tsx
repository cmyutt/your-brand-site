"use client";

import { emitAdminLogChanged } from "@/lib/adminLogLive";

/**
 * 서버 액션 폼 제출 직전에 로그 페이지로 '변화 힌트'를 쏩니다.
 * - 즉시 1회 + 1.2s + 3s 후 재발사(트랜잭션/지연 대비)
 */
export default function FormLiveHint() {
  return (
    <input
      type="submit"
      hidden
      onClick={() => {
        try {
          emitAdminLogChanged();
          setTimeout(emitAdminLogChanged, 1200);
          setTimeout(emitAdminLogChanged, 3000);
        } catch { /* no-op */ }
      }}
      tabIndex={-1}
      aria-hidden="true"
    />
  );
}
