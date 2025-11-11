"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import AnchoredAcrylicBackground from "@/components/AnchoredAcrylicBackground";
import OpeningModelCarousel from "@/components/OpeningModelCarousel";

type OverlayAdditionalModel = {
  url: string;
  offset: { x: number; y: number; z: number };
  scale: number;
};

type OpeningOverlayProps = {
  backgroundUrl?: string | null;
  imageLayerUrl?: string | null;
  imageLayerPosition?: { x: number; y: number } | null;
  imageLayerScale?: number | null;
  acrylicBlur?: number | null;
  acrylicOpacity?: number | null;
  acrylicTextureOpacity?: number | null;
  acrylicBrightness?: number | null;
  acrylicTopGap?: number | null;
  acrylicAnchorY?: number | null;
  modelUrl?: string | null;
  modelPivot?: { x: number; y: number; z: number } | null;
  modelOffset?: { x: number; y: number; z: number } | null;
  modelScale?: number | null;
  additionalModels?: OverlayAdditionalModel[] | null;
  children: ReactNode;
};

const DEFAULT_PIVOT = { x: 0, y: 0, z: 0 } as const;
const DEFAULT_SCALE = 1;

export default function OpeningOverlay({
  backgroundUrl,
  imageLayerUrl,
  imageLayerPosition,
  imageLayerScale,
  acrylicBlur,
  acrylicOpacity,
  acrylicTextureOpacity,
  acrylicBrightness,
  acrylicTopGap,
  acrylicAnchorY,
  modelUrl,
  modelPivot,
  modelOffset,
  modelScale,
  additionalModels,
  children,
}: OpeningOverlayProps) {
  const overlayModels = useMemo(() => {
    const entries: Array<{ url: string; offset: { x: number; y: number; z: number }; scale: number }> = [];

    if (typeof modelUrl === "string" && modelUrl.trim().length > 0) {
      const sanitizedUrl = modelUrl.trim();
      const sanitizedOffset = modelOffset ?? DEFAULT_PIVOT;
      const sanitizedScale =
        typeof modelScale === "number" && Number.isFinite(modelScale) && modelScale > 0
          ? modelScale
          : DEFAULT_SCALE;
      entries.push({ url: sanitizedUrl, offset: sanitizedOffset, scale: sanitizedScale });
    }

    if (Array.isArray(additionalModels)) {
      for (const entry of additionalModels) {
        if (!entry || typeof entry.url !== "string") {
          continue;
        }
        const trimmed = entry.url.trim();
        if (!trimmed) {
          continue;
        }
        entries.push({
          url: trimmed,
          offset: entry.offset ?? DEFAULT_PIVOT,
          scale:
            typeof entry.scale === "number" && Number.isFinite(entry.scale) && entry.scale > 0
              ? entry.scale
              : DEFAULT_SCALE,
        });
      }
    }

    return entries;
  }, [additionalModels, modelOffset, modelScale, modelUrl]);

  const overlayModelCount = overlayModels.length;
  const shouldShow = useMemo(
    () => Boolean(backgroundUrl || imageLayerUrl || overlayModelCount > 0),
    [backgroundUrl, imageLayerUrl, overlayModelCount],
  );
  const viewerPivot = modelPivot ?? DEFAULT_PIVOT;

  const [showOverlay, setShowOverlay] = useState(shouldShow);

  const handleNavigateToMain = useCallback(() => {
    setShowOverlay(false);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        const target = document.getElementById("product-hero");
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  }, []);

  useEffect(() => {
    if (!showOverlay) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showOverlay]);

  useEffect(() => {
    setShowOverlay(shouldShow);
  }, [shouldShow]);

  if (!shouldShow) {
    return <>{children}</>;
  }

  const hasModels = overlayModelCount > 0;

  return (
    <>
      {showOverlay ? (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          <AnchoredAcrylicBackground
            backgroundImage={backgroundUrl}
            imageLayer={imageLayerUrl}
            imageLayerPosition={imageLayerPosition ?? undefined}
            imageLayerScale={imageLayerScale ?? undefined}
            acrylicBlur={acrylicBlur ?? undefined}
            acrylicOpacity={acrylicOpacity ?? undefined}
            acrylicTextureOpacity={acrylicTextureOpacity ?? undefined}
            acrylicBrightness={acrylicBrightness ?? undefined}
            anchorY={acrylicAnchorY ?? undefined}
            minTopGap={acrylicTopGap ?? undefined}
            fullBleed={false}
            backgroundMinHeight="100svh"
            horizontalPadding="100px"
            frameAlign="center"
            contentPadding="0px"
            className="flex h-full w-full items-center justify-center text-white"
            showAcrylic={false}
            showImageLayer
          >
            <div className="flex h-full w-full flex-col gap-6">
              <div className="flex-1" />
              <div className="flex w-full justify-center pb-4">
                <button
                  type="button"
                  onClick={handleNavigateToMain}
                  className="inline-flex items-center justify-center rounded-full bg-white/80 px-6 py-2 text-sm font-semibold text-gray-900 shadow transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  {"메인 페이지로 이동"}
                </button>
              </div>
            </div>
          </AnchoredAcrylicBackground>
        </div>
      ) : null}
      <div aria-hidden={showOverlay} className={showOverlay ? "hidden" : "block"}>
        {children}
      </div>
    </>
  );
}


