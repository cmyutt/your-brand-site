"use client";

import { useState } from "react";

export default function CsvExportButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const form = e.currentTarget.closest("form") as HTMLFormElement | null;
    if (!form) return;

    const base = new URL(form.action || "/admin/orders/export", location.origin);
    const fd = new FormData(form);
    const qs = new URLSearchParams();

    // checkbox 다중값 포함해서 GET 쿼리 구성
    fd.forEach((v, k) => {
      if (v == null) return;
      qs.append(k, String(v));
    });

    const href = `${base.pathname}?${qs.toString()}`;

    setLoading(true);
    // 새 탭으로 다운로드 (페이지 네비게이션 막기)
    window.open(href, "_blank", "noopener");
    setTimeout(() => setLoading(false), 400);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={[
        "rounded-lg px-3 py-1.5 text-sm ring-1 ring-gray-300 hover:bg-gray-50",
        loading ? "opacity-60 cursor-wait" : "",
        className ?? "",
      ].join(" ")}
      disabled={loading}
    >
      {loading ? "내보내는 중…" : children}
    </button>
  );
}
