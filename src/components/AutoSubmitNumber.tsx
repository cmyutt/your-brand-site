'use client';

import { useEffect, useRef, useState } from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  value: number;
};

export default function AutoSubmitNumber({
  value,
  style,
  min,
  max,
  step,
  ...rest
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [val, setVal] = useState<number>(value);

  useEffect(() => setVal(value), [value]);

  const clamp = (n: number) => {
    const lo = (min ?? 1) as number;
    const hi = (max ?? 999) as number;
    return Math.min(hi, Math.max(lo, n));
  };

  /** 소계/총액 낙관적 업데이트 (깜빡임/잘못된 합계 방지) */
  const optimisticUpdate = (nextQty: number) => {
    const el = ref.current;
    if (!el) return;

    const lineKey = el.dataset.lineKey; // ex) productId__variantId
    const unit = Number(el.dataset.unitPrice || 0);
    const newSub = Math.max(0, unit * nextQty);

    // DOM 업데이트는 한 프레임에 모아서 수행
    requestAnimationFrame(() => {
      // 현재 라인 소계 텍스트 + 데이터 동기화
      if (lineKey) {
        const subEl = document.getElementById(
          `sub-${lineKey}`
        ) as HTMLElement | null;
        if (subEl) {
          subEl.dataset.subtotal = String(newSub);
          subEl.textContent = newSub.toLocaleString() + '원';
        }
      }

      // 전체 합계는 모든 소계의 data-subtotal을 이용하되
      // 현재 라인은 방금 계산한 값으로 치환해서 합산
      const subs = Array.from(
        document.querySelectorAll<HTMLElement>('[data-subtotal]')
      );
      const total = subs.reduce((acc, s) => {
        if (lineKey && s.id === `sub-${lineKey}`) return acc + newSub;
        const v = Number(s.dataset.subtotal || '0');
        return acc + (Number.isFinite(v) ? v : 0);
      }, 0);

      const totalEl = document.getElementById('cart-total');
      if (totalEl) totalEl.textContent = total.toLocaleString() + '원';
    });
  };

  /** 제출을 한 틱 뒤로 미뤄 Router 경고 제거 */
  const deferSubmit = (form?: HTMLFormElement | null) => {
    if (!form) return;
    setTimeout(() => {
      try {
        form.requestSubmit();
      } catch {
        const btn = form.querySelector(
          'button[type="submit"]'
        ) as HTMLButtonElement | null;
        btn?.click();
      }
    }, 0);
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.currentTarget.valueAsNumber;
    const next = Number.isFinite(v)
      ? clamp(v)
      : clamp(
          parseInt(e.currentTarget.value.replace(/[^\d]/g, ''), 10) || value
        );

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
