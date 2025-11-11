"use client";

// 옵션 선택 UI (재고 0이면 옵션 비활성화 + "(품절)" 표시)
// 선택된 옵션이 품절이거나 미선택이면 submit 버튼도 비활성화
import { useEffect, useMemo, useState } from "react";

type Variant = { id: string; name: string; stock: number; extra: number };
type Props = {
  variants: Variant[];
  /** 서버 컴포넌트 쪽 submit 버튼 id (이 버튼의 disabled를 토글함) */
  submitButtonId: string;
};

export default function VariantControls({ variants, submitButtonId }: Props) {
  const [selected, setSelected] = useState<string>("");

  const rows = useMemo(
    () =>
      variants.map((v) => ({
        ...v,
        soldout: (v.stock ?? 0) <= 0,
        label:
          v.name +
          (v.extra ? ` (+${v.extra.toLocaleString()}원)` : "") +
          ((v.stock ?? 0) <= 0 ? " — (품절)" : ` — 재고 ${v.stock}`),
      })),
    [variants]
  );

  // 선택 상태에 따라 서버 컴포넌트에 있는 제출 버튼 disabled 토글
  useEffect(() => {
    const btn = document.getElementById(submitButtonId) as HTMLButtonElement | null;
    if (!btn) return;

    const soldout = rows.find((r) => r.id === selected)?.soldout ?? true;
    // 미선택이거나 품절이면 비활성화
    btn.disabled = !selected || soldout;
    btn.style.opacity = btn.disabled ? "0.5" : "1";
  }, [selected, rows, submitButtonId]);

  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontWeight: 600 }}>옵션</span>
      <select
        name="variantId"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        required
      >
        <option value="">옵션을 선택하세요</option>
        {rows.map((r) => (
          <option key={r.id} value={r.id} disabled={r.soldout}>
            {r.label}
          </option>
        ))}
      </select>
    </label>
  );
}
