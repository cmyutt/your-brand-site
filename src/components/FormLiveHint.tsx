"use client";

import { useEffect, useRef } from "react";

/**
 * 폼 제출 직전에 hidden 값에 타임스탬프를 주입해서
 * - 캐시 무효화 힌트로 쓰거나
 * - 서버 액션 재실행을 안정적으로 트리거하는 용도.
 * 폼 어디에든 <FormLiveHint />를 꽂아두면 동작합니다.
 */
export default function FormLiveHint({
  name = "__fh_ts",
}: {
  name?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const form = el.closest("form");
    if (!form) return;

    const onSubmit = () => {
      // 제출 직전 현재 시각 주입
      if (inputRef.current) {
        inputRef.current.value = String(Date.now());
      }
    };
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, []);

  return <input ref={inputRef} type="hidden" name={name} defaultValue="" />;
}
