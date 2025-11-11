"use client";

import { useEffect, useLayoutEffect, useMemo, useState, useRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

import AcrylicBackground from "@/components/AcrylicBackground";
import { BACKGROUND_SOURCE_HEIGHT, BACKGROUND_SOURCE_WIDTH } from "@/lib/openingDefaults";
import { calculateAnchorVisibleY, resolveSourceAnchor } from "@/lib/anchorMath";

type AnchoredAcrylicBackgroundProps = Omit<
  ComponentPropsWithoutRef<typeof AcrylicBackground>,
  "padding"
> & {
  anchorY?: number | null;
  sourceHeight?: number;
  sourceWidth?: number;
  horizontalPadding?: string | number;
  minTopGap?: number;
  minBottomGap?: number;
};

const BASE_VIEWPORT_HEIGHT = BACKGROUND_SOURCE_HEIGHT;
const PANEL_HEIGHT = 720;
const PANEL_WIDTH = 250;
const DEFAULT_HORIZONTAL_PADDING = "100px";
const DEFAULT_MIN_TOP_GAP = 36;
const DEFAULT_MIN_BOTTOM_GAP = 20;

const normalizeSize = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(/px$/, ""));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function AnchoredAcrylicBackground({
  anchorY,
  sourceHeight = BACKGROUND_SOURCE_HEIGHT,
  sourceWidth = BACKGROUND_SOURCE_WIDTH,
  horizontalPadding = DEFAULT_HORIZONTAL_PADDING,
  minTopGap = DEFAULT_MIN_TOP_GAP,
  minBottomGap = DEFAULT_MIN_BOTTOM_GAP,
  ...rest
}: AnchoredAcrylicBackgroundProps) {
  const restProps = rest as ComponentPropsWithoutRef<typeof AcrylicBackground>;
  const backgroundImage = restProps.backgroundImage;
  const initialReady =
    typeof backgroundImage !== "string" || backgroundImage.trim().length === 0 ? true : false;
  const [isBackgroundReady, setIsBackgroundReady] = useState<boolean>(initialReady);

  const effectiveAnchor = useMemo(() => resolveSourceAnchor(anchorY, sourceHeight), [anchorY, sourceHeight]);

  const basePanelHeight = normalizeSize(restProps.panelHeight, PANEL_HEIGHT);
  const basePanelWidth = normalizeSize(restProps.panelWidth, PANEL_WIDTH);
  const resolvedMinTopGap = Math.max(0, Number(minTopGap ?? DEFAULT_MIN_TOP_GAP));
  const resolvedMinBottomGap = Math.max(0, Number(minBottomGap ?? DEFAULT_MIN_BOTTOM_GAP));

  const computeLayout = useMemo(() => {
    return (containerWidth: number, containerHeight: number) => {
      const anchorVisible = calculateAnchorVisibleY(
        containerWidth,
        containerHeight,
        effectiveAnchor,
        sourceWidth,
        sourceHeight,
      );

      const desiredHeight = Math.max(0, anchorVisible - resolvedMinTopGap);
      const scaledHeight = Math.max(1, Math.min(basePanelHeight, desiredHeight));
      const scaleFactor = basePanelHeight > 0 ? scaledHeight / basePanelHeight : 1;
      const scaledWidth = basePanelWidth * scaleFactor;

      const topGap = Math.max(resolvedMinTopGap, anchorVisible - scaledHeight);
      const bottomGap = Math.max(resolvedMinBottomGap, containerHeight - anchorVisible);

      return {
        topGap,
        bottomGap,
        panelHeight: scaledHeight,
        panelWidth: scaledWidth,
        scaleFactor,
      };
    };
  }, [
    basePanelHeight,
    basePanelWidth,
    effectiveAnchor,
    resolvedMinBottomGap,
    resolvedMinTopGap,
    sourceHeight,
    sourceWidth,
  ]);

  const initialLayout = useMemo(
    () => computeLayout(BACKGROUND_SOURCE_WIDTH, BASE_VIEWPORT_HEIGHT),
    [computeLayout],
  );

  const [{ topGap, bottomGap, panelHeight, panelWidth, scaleFactor }, setLayout] = useState(initialLayout);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!backgroundImage || typeof backgroundImage !== "string" || backgroundImage.trim().length === 0) {
      setIsBackgroundReady(true);
      return;
    }

    let cancelled = false;
    setIsBackgroundReady(false);
    const img = new Image();
    const handleComplete = () => {
      if (!cancelled) {
        setIsBackgroundReady(true);
      }
    };
    img.addEventListener("load", handleComplete);
    img.addEventListener("error", handleComplete);
    img.src = backgroundImage;

    return () => {
      cancelled = true;
      img.removeEventListener("load", handleComplete);
      img.removeEventListener("error", handleComplete);
    };
  }, [backgroundImage]);

  useIsomorphicLayoutEffect(() => {
    if (!isBackgroundReady) {
      return;
    }

    const wrapper = containerRef.current;
    if (!wrapper) {
      return undefined;
    }

    const target = wrapper.firstElementChild as HTMLElement | null;
    if (!target) {
      return undefined;
    }

    const measure = () => {
      const rect = target.getBoundingClientRect();
      const viewportWidth = rect.width || BACKGROUND_SOURCE_WIDTH;
      const viewportHeight = rect.height || BASE_VIEWPORT_HEIGHT;
      setLayout(computeLayout(viewportWidth, viewportHeight));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(target);

    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [
    computeLayout,
    effectiveAnchor,
    isBackgroundReady,
    resolvedMinBottomGap,
    resolvedMinTopGap,
    sourceHeight,
    sourceWidth,
  ]);

  const paddingValue = `${topGap}px ${horizontalPadding} ${bottomGap}px`;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <AcrylicBackground
        {...rest}
        panelHeight={panelHeight}
        panelWidth={panelWidth}
        panelMinHeight={panelHeight}
        padding={paddingValue}
        stageAlign="flex-end"
        imageLayerScaleFactor={scaleFactor}
        showAcrylic={isBackgroundReady && restProps.showAcrylic !== false}
        showStage={isBackgroundReady && restProps.showStage !== false}
        showImageLayer={isBackgroundReady && restProps.showImageLayer !== false}
      />
    </div>
  );
}
