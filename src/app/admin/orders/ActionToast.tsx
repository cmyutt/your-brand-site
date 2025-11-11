"use client";
import { useEffect, useState } from "react";

type Props = { message?: string; variant?: "success"|"warning"|"error"|"info"; autoHide?: number };

export default function ActionToast({ message, variant="info", autoHide=4000 }: Props) {
  const [open, setOpen] = useState(!!message);
  useEffect(() => { setOpen(!!message); }, [message]);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setOpen(false), autoHide);
    return () => clearTimeout(t);
  }, [message, autoHide]);

  if (!message || !open) return null;

  const style =
    variant === "success" ? "bg-emerald-600" :
    variant === "warning" ? "bg-amber-600" :
    variant === "error"   ? "bg-rose-600"   :
                            "bg-slate-700";

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50">
      <div className={`rounded-xl px-4 py-2 text-white shadow ${style}`}>{message}</div>
    </div>
  );
}
