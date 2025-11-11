'use client';

import { useState } from 'react';

type Props = {
  /** 기본 라벨 */
  label: string;
  /** 확인 대화상자에 표시할 문구 */
  confirmMessage: string;
  /** 제출 중일 때 라벨 (선택) */
  pendingLabel?: string;
  /** 위험(삭제 등) 스타일 가이드용 (선택) */
  danger?: boolean;
  /** 스타일/클래스 전달 (선택) */
  style?: React.CSSProperties;
  className?: string;
};

/**
 * 폼 안에서 쓰는 “제출 확인” 버튼.
 * - type="submit" 을 유지하면서 클릭 시 confirm()으로 사용자 확인
 * - 확인 취소 시 e.preventDefault()로 제출 취소
 */
export default function ConfirmSubmitButton({
  label,
  confirmMessage,
  pendingLabel = '처리 중…',
  danger,
  style,
  className,
}: Props) {
  const [submitting, setSubmitting] = useState(false);

  return (
    <button
      type="submit"
      className={className}
      style={{
        ...(danger
          ? { background: '#fee', border: '1px solid #f88' }
          : undefined),
        borderRadius: 8,
        padding: '6px 10px',
        ...style,
      }}
      disabled={submitting}
      onClick={(e) => {
        if (submitting) return;
        const ok = window.confirm(confirmMessage);
        if (!ok) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        setSubmitting(true);
      }}
    >
      {submitting ? pendingLabel : label}
    </button>
  );
}
