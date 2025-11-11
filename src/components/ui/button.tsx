import type { ButtonHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/cn";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  buttonSecondaryCompactClass,
  buttonGhostClass,
} from "@/lib/ui";

type ButtonVariant = "primary" | "secondary" | "secondaryCompact" | "ghost";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: buttonPrimaryClass,
  secondary: buttonSecondaryClass,
  secondaryCompact: buttonSecondaryCompactClass,
  ghost: buttonGhostClass,
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  iconSpacingClassName?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      leftIcon,
      rightIcon,
      className,
      iconSpacingClassName = "gap-2",
      type = "button",
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(VARIANT_CLASS[variant], className)}
      {...props}
    >
      <span className={cn("inline-flex items-center justify-center", iconSpacingClassName)}>
        {leftIcon && <span className="inline-flex items-center">{leftIcon}</span>}
        {children && <span className="inline-flex items-center">{children}</span>}
        {rightIcon && <span className="inline-flex items-center">{rightIcon}</span>}
      </span>
    </button>
  ),
);

Button.displayName = "Button";
