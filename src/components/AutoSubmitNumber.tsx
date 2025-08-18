'use client';

import { useEffect, useRef, useState } from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  value: number;
};

/**
 * 사용 전제:
 * - input에 data-line-key="productId__variantId" 형태로 고유키 제공
 * - input에 data-unit-price="19900" 단가 제공 (정수, 원 단위)
 * - 각 라인 소계 엘리먼트는 id="sub-<lineKey>" 이고 data-subtotal="<정수>" 를 가짐
 * - 총액 엘리먼트는 id="cart-total"
 */
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

  /** 소계/총액을 낙관적으로 즉시 갱신 */
  const optimisticUpdate = (nextQty: number) => {
    const el = ref.current;
    if (!el) return;

    const lineKey = el.dataset.lineKey; // ex) productId__variantId
    const unit = Number(el.dataset.unitPrice || 0);
    const newLineSubtotal = unit * nextQty;

    // 1) 해당 라인의 data-subtotal 및 텍스트 먼저 갱신
    if (lineKey) {
      const subEl = document.getElementById(`sub-${lineKey}`) as
        | (HTMLElement & { dataset: DOMStringMap })
        | null;
      if (subEl) {
        subEl.dataset.subtotal = String(newLineSubtotal);
        subEl.textContent = newLineSubtotal.toLocaleString() + '원';
      }
    }

    // 2) 모든 라인의 data-subtotal 합산 → 총액 텍스트 갱신
    const totalEl = document.getElementById('cart-total') as
      | (HTMLElement & { dataset: DOMStringMap })
      | null;
    if (totalEl) {
      const allSubs = Array.from(
        document.querySelectorAll('[data-subtotal]'),
      ) as (HTMLElement & { dataset: DOMStringMap })[];

      const newSum = allSubs
        .map((s) => Number(s.dataset.subtotal || '0'))
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
        const btn = form.querySelector(
          'button[type="submit"]',
        ) as HTMLButtonElement | null;
        btn?.click();
      }
    }, 0);
  };

  const commit = (next: number, form?: HTMLFormElement | null) => {
    const fixed = clamp(next);
    setVal(fixed);
    if (ref.current) ref.current.value = String(fixed);
    optimisticUpdate(fixed);
    deferSubmit(form);
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    // valueAsNumber가 NaN일 수 있으니 보강
    const raw = e.currentTarget.value;
    const num = Number.isFinite(e.currentTarget.valueAsNumber)
      ? e.currentTarget.valueAsNumber
      : parseInt(raw.replace(/[^\d]/g, ''), 10);

    const next = Number.isFinite(num) ? num : value;
    commit(next, e.currentTarget.form);
  };

  const handleBlur: React.FocusEventHandler<HTMLInputElement> = (e) => {
    // 빈 문자열로 남았을 때 min으로 복원
    if (e.currentTarget.value.trim() === '') {
      commit((min as number) ?? 1, e.currentTarget.form);
    } else {
      // 이미 숫자라면 clamp만 보장
      const num = parseInt(e.currentTarget.value.replace(/[^\d]/g, ''), 10);
      commit(Number.isFinite(num) ? num : value, e.currentTarget.form);
    }
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
        onBlur={handleBlur}
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
