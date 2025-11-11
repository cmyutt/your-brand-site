"use client";

import { useCallback } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  label: string;
  pendingLabel?: string;
  confirmMessage?: string;
  formAction: (formData: FormData) => Promise<void> | (() => Promise<void>);
  danger?: boolean;
  style?: React.CSSProperties;
};

export default function ConfirmServerActionButton({
  label,
  pendingLabel = "처리 중…",
  confirmMessage,
  formAction,
  danger,
  style,
}: Props) {
  const { pending } = useFormStatus(); // ★ 서버 액션 진행 여부

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      // 확인창에서 취소하면 제출 막기
      if (confirmMessage && !window.confirm(confirmMessage)) {
        e.preventDefault();
      }
      // 확인 후에는 아무것도 건드리지 않음(특히 disabled로 바꾸지 않음)
      // 제출은 formAction이 처리하고, pending 표시는 useFormStatus가 담당
    },
    [confirmMessage]
  );

  return (
    <button
      type="submit"
      formAction={formAction as any}   // ★ 서버 액션 직결
      onClick={onClick}                // 확인창만 담당
      disabled={pending}               // 제출 진행 중에만 잠금
      style={{
        padding: "4px 8px",
        background: danger ? "#fee" : undefined,
        border: danger ? "1px solid #f88" : "1px solid #ddd",
        opacity: pending ? 0.6 : 1,
        ...style,
      }}
      aria-busy={pending || undefined}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
