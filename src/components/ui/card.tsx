import type { HTMLAttributes } from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/cn";
import {
  cardBaseClass,
  cardInteractiveClass,
  cardPanelClass,
  cardSurfaceSubtleClass,
} from "@/lib/ui";

type CardVariant = "base" | "surface" | "interactive" | "panel";

const VARIANT_CLASS: Record<CardVariant, string> = {
  base: cardBaseClass,
  surface: cardSurfaceSubtleClass,
  interactive: cardInteractiveClass,
  panel: cardPanelClass,
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export const Card = forwardRef<HTMLDivElement, CardProps>((
  { variant = "base", className, ...props },
  ref,
) => <div ref={ref} className={cn(VARIANT_CLASS[variant], className)} {...props} />);

Card.displayName = "Card";
