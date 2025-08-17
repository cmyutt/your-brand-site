'use client';

import { useEffect, useRef, useState } from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  value: number;
};

export default function AutoSubmitNumber({ value, style, min, max, step, ...rest }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [val, setVal] = useState<number>(value);

  useEffect(() => setVal(value), [value]);

  const clamp = (n: number) => {
    const lo = (min ?? 1) as number;
    const hi = (max ?? 999) as number;
    return Math.min(hi, Math.max(lo, n));
  };

  /** 소계/총액을 낙관적으로 즉시 갱신 */
  const optimisticUpdate = (nextQty: number) => {
    const el = ref.current;
    if (!el) return;
    const lineKey = el.dataset.lineKey;           // ex) productId__variantId
    const unit = Number(el.dataset.unitPrice || 0);

    // 소계
    if (lineKey) {
      const sub = document.getElementById(`sub-${lineKey}`);
      if (sub) sub.textContent = (unit * nextQty).toLocaleString() + '원';
    }

    // 총액은 전체 소계를 합산
    const totalEl = document.getElementById('cart-total');
    if (totalEl) {
      const allSubs = Array.from(document.querySelectorAll('[data-subtotal]')) as HTMLElement[];
      const sum = allSubs
        .map((s) => Number(s.dataset.subtotal || '0'))
        .reduce((a, b) => a + b, 0);

      // 방금 변경 라인의 data-subtotal 도 즉시 반영
      if (lineKey) {
        const subEl = document.getElementById(`sub-${lineKey}`) as HTMLElement | null;
        if (subEl) subEl.dataset.subtotal = String(unit * nextQty);
      }

      const newSum = Array.from(document.querySelectorAll('[data-subtotal]'))
        .map((s) => Number((s as HTMLElement).dataset.subtotal || '0'))
        .reduce((a, b) => a + b, 0);

      totalEl.textContent = newSum.toLocaleString() + '원';
    }
  };

  /** 제출을 한 틱 뒤로 미뤄 Router 업데이트 경고 제거 */
  const deferSubmit = (form?: HTMLFormElement | null) => {
    if (!form) return;
    setTimeout(() => {
      try {
        form.requestSubmit();
      } catch {
        const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
        btn?.click();
      }
    }, 0);
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.currentTarget.valueAsNumber;
    const next = Number.isFinite(v)
      ? clamp(v)
      : clamp(parseInt(e.currentTarget.value.replace(/[^\d]/g, ''), 10) || value);

    setVal(next);
    if (ref.current) ref.current.value = String(next);
    optimisticUpdate(next);
    deferSubmit(e.currentTarget.form);
  };

  const stepClick = (delta: number) => {
    setVal((prev) => {
      const next = clamp((prev ?? value) + delta);
      if (ref.current) {
        ref.current.value = String(next);
        optimisticUpdate(next);
        deferSubmit(ref.current.form);
      }
      return next;
    });
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <button
        type="button"
        aria-label="수량 감소"
        onClick={() => stepClick(-1)}
        style={{
          width: 28,
          height: 28,
          border: '1px solid #ddd',
          borderRadius: 6,
          lineHeight: '26px',
          cursor: 'pointer',
        }}
      >
        −
      </button>

      <input
        ref={ref}
        type="number"
        inputMode="numeric"
        value={val}
        onChange={handleChange}
        min={min ?? 1}
        max={max ?? 999}
        step={step ?? 1}
        style={{
          width: 56,
          textAlign: 'center',
          ...((style as React.CSSProperties) || {}),
        }}
        {...rest}
      />

      <button
        type="button"
        aria-label="수량 증가"
        onClick={() => stepClick(1)}
        style={{
          width: 28,
          height: 28,
          border: '1px solid #ddd',
          borderRadius: 6,
          lineHeight: '26px',
          cursor: 'pointer',
        }}
      >
        ＋
      </button>
    </div>
  );
}
