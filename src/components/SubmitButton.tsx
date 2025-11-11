"use client";
// CODPATCH: SubmitButton — useFormStatus-based disabled & spinner
import { useFormStatus } from "react-dom";

type Props = React.ComponentProps<"button"> & { children: React.ReactNode };

export default function SubmitButton({ children, className = "", ...rest }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || rest.disabled}
      className={["inline-flex items-center gap-2 disabled:opacity-50", className].join(" ")}
      {...rest}
    >
      {pending ? <span className="animate-pulse">…</span> : null}
      {children}
    </button>
  );
}

