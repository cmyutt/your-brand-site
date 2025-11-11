import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/cn";
import { inputBaseClass } from "@/lib/ui";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>((
  { className, type = "text", ...props },
  ref,
) => <input ref={ref} type={type} className={cn(inputBaseClass, className)} {...props} />);

Input.displayName = "Input";
