"use client";

import { useEffect, useState } from "react";

type ToastPayload = { kind: "ok" | "fail"; message: string } | null;

export default function TopToast({ trigger }: { trigger: ToastPayload }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setShow(true);
    const timer = setTimeout(() => setShow(false), 3200);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (!trigger || !show) return null;

  const ok = trigger.kind === "ok";
  const baseClass = ok
    ? "bg-gray-900 text-white border border-gray-800"
    : "bg-rose-600 text-white border border-rose-700";

  return (
    <div className="pointer-events-none fixed left-1/2 top-6 z-[120] -translate-x-1/2">
      <div
        className={`min-w-[260px] max-w-sm rounded-md px-4 py-3 text-sm font-medium shadow-xl ${baseClass}`}
        role="status"
        aria-live="polite"
      >
        {trigger.message}
      </div>
    </div>
  );
}
