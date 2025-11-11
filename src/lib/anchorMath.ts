import { BACKGROUND_SOURCE_HEIGHT, BACKGROUND_SOURCE_WIDTH } from "@/lib/openingDefaults";

const clamp = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) {
    return min;
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

export const resolveSourceAnchor = (
  anchorY: number | null | undefined,
  sourceHeight: number = BACKGROUND_SOURCE_HEIGHT,
): number => {
  if (typeof anchorY === "number" && Number.isFinite(anchorY)) {
    return clamp(anchorY, 0, sourceHeight);
  }
  return sourceHeight - 190;
};

export const calculateAnchorVisibleY = (
  containerWidth: number,
  containerHeight: number,
  anchorY: number,
  sourceWidth: number = BACKGROUND_SOURCE_WIDTH,
  sourceHeight: number = BACKGROUND_SOURCE_HEIGHT,
): number => {
  const effectiveAnchor = clamp(anchorY, 0, sourceHeight);
  const scale = Math.max(containerWidth / sourceWidth, containerHeight / sourceHeight);
  const scaledHeight = sourceHeight * scale;
  const cropTop = Math.max(0, (scaledHeight - containerHeight) / 2);
  const anchorScaled = effectiveAnchor * scale;
  const anchorVisible = anchorScaled - cropTop;
  return anchorVisible;
};

export const calculatePadding = (
  containerWidth: number,
  containerHeight: number,
  anchorY: number,
  panelHeight: number,
  sourceWidth: number = BACKGROUND_SOURCE_WIDTH,
  sourceHeight: number = BACKGROUND_SOURCE_HEIGHT,
  minTopGap = 0,
  minBottomGap = 0,
) => {
  const anchorVisible = calculateAnchorVisibleY(
    containerWidth,
    containerHeight,
    anchorY,
    sourceWidth,
    sourceHeight,
  );

  const topGap = Math.max(minTopGap, Math.round(anchorVisible - panelHeight));
  const bottomGap = Math.max(minBottomGap, Math.round(containerHeight - anchorVisible));

  return { topGap, bottomGap };
};

export const calculateAnchorPercent = (
  containerWidth: number,
  containerHeight: number,
  anchorY: number,
  sourceWidth: number = BACKGROUND_SOURCE_WIDTH,
  sourceHeight: number = BACKGROUND_SOURCE_HEIGHT,
) => {
  if (containerHeight <= 0) {
    return 50;
  }
  const anchorVisible = calculateAnchorVisibleY(
    containerWidth,
    containerHeight,
    anchorY,
    sourceWidth,
    sourceHeight,
  );
  const percent = (anchorVisible / containerHeight) * 100;
  return clamp(percent, 0, 100);
};
