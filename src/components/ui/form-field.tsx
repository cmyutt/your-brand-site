import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";
import { fieldLabelClass, helperTextClass } from "@/lib/ui";

export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
  label?: ReactNode;
  labelFor?: string;
  helperText?: ReactNode;
  required?: boolean;
  requiredMark?: ReactNode;
  labelAdornment?: ReactNode;
}

export function FormField({
  label,
  labelFor,
  helperText,
  required = false,
  requiredMark = <span className="text-rose-500">*</span>,
  labelAdornment,
  className,
  children,
  ...props
}: FormFieldProps) {
  const showLabelRow = label || labelAdornment;
  const showRequired = required && requiredMark !== null;

  return (
    <div className={cn("space-y-2", className)} {...props}>
      {showLabelRow && (
        <div className="flex items-center justify-between gap-2">
          {label ? (
            <label htmlFor={labelFor} className={fieldLabelClass}>
              {label}
              {showRequired && <span className="ml-1 align-middle">{requiredMark}</span>}
            </label>
          ) : (
            <span />
          )}
          {labelAdornment && <div className="text-xs text-gray-500">{labelAdornment}</div>}
        </div>
      )}
      <div>{children}</div>
      {helperText && <p className={helperTextClass}>{helperText}</p>}
    </div>
  );
}
