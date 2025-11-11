import { cn } from "./cn";

export const cardBaseClass = "rounded-2xl border border-gray-200 bg-white shadow-sm";
export const cardSurfaceSubtleClass = cn(cardBaseClass, "bg-gray-50");
export const cardInteractiveClass = cn(
  cardBaseClass,
  "transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
);
export const cardPanelClass = cn(cardBaseClass, "ring-1 ring-gray-200");

const buttonBase = "inline-flex items-center justify-center rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 disabled:cursor-not-allowed disabled:opacity-60";
const buttonSecondaryBase = cn(
  buttonBase,
  "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
);

export const buttonPrimaryClass = cn(
  buttonBase,
  "bg-black text-white px-4 py-3 text-sm md:text-base hover:bg-gray-900"
);

export const buttonSecondaryClass = cn(
  buttonSecondaryBase,
  "px-4 py-3 text-sm md:text-base"
);

export const buttonSecondaryCompactClass = cn(
  buttonSecondaryBase,
  "rounded-lg px-3 py-1.5 text-sm"
);

export const buttonGhostClass = cn(
  buttonBase,
  "px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
);

export const inputBaseClass = "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm md:text-base outline-none transition focus:border-black focus:ring-2 focus:ring-black/20 disabled:bg-gray-100 disabled:text-gray-500";

export const fieldLabelClass = "mb-1 block text-sm font-medium text-gray-700 md:text-base";
export const helperTextClass = "text-xs text-gray-500 md:text-sm";
export const formSectionClass = "space-y-4 md:space-y-6";
export const sectionHeadingClass = "text-sm font-semibold text-gray-900 md:text-base";

export const responsiveGapClass = "gap-3 md:gap-4";
export const responsiveStackClass = "space-y-3 md:space-y-4";
