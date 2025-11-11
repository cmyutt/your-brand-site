"use client";

import { useFormStatus } from "react-dom";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** 폼 안에 넣어두면, 제출 → 완료되는 순간 router.refresh() 실행 */
export default function RefreshOnSubmit() {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (wasPending.current && !pending) {
      // 서버 액션 끝난 직후
      router.refresh();
    }
    wasPending.current = pending;
  }, [pending, router]);

  return null;
}
