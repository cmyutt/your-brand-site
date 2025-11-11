"use client";

import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import { useGLTF } from "@react-three/drei";
import GlbViewer from "./GlbViewer";

type Vector = {
  x: number;
  y: number;
  z: number;
};

type OpeningModelEntry = {
  url: string;
  offset?: Vector | null;
  scale?: number | null;
};

type SanitizedModel = {
  url: string;
  offset: Vector;
  scale: number;
};

type OpeningModelCarouselProps = {
  models: OpeningModelEntry[] | null | undefined;
  pivot?: Vector | null;
  variant?: "overlay" | "page";
  className?: string;
  onNavigateToMain?: () => void;
};

const DEFAULT_VECTOR: Vector = { x: 0, y: 0, z: 0 };
const DEFAULT_SCALE = 1;

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return fallback;
}

function sanitizeModels(source: OpeningModelEntry[] | null | undefined): SanitizedModel[] {
  if (!Array.isArray(source)) {
    return [];
  }

  const result: SanitizedModel[] = [];

  for (const entry of source) {
    if (!entry || typeof entry.url !== "string") {
      continue;
    }
    const url = entry.url.trim();
    if (!url) {
      continue;
    }

    const offsetSource = entry.offset ?? null;
    const offset: Vector = {
      x: toNumber(offsetSource?.x, DEFAULT_VECTOR.x),
      y: toNumber(offsetSource?.y, DEFAULT_VECTOR.y),
      z: toNumber(offsetSource?.z, DEFAULT_VECTOR.z),
    };

    const scaleValue = toNumber(entry.scale, DEFAULT_SCALE);
    const scale = scaleValue > 0 ? scaleValue : DEFAULT_SCALE;

    result.push({ url, offset, scale });
  }

  return result;
}

function sanitizePivot(value: Vector | null | undefined): Vector {
  if (!value) {
    return { ...DEFAULT_VECTOR };
  }
  return {
    x: toNumber(value.x, DEFAULT_VECTOR.x),
    y: toNumber(value.y, DEFAULT_VECTOR.y),
    z: toNumber(value.z, DEFAULT_VECTOR.z),
  };
}



function CarouselArrow({ direction }: { direction: "prev" | "next" }) {
  const isPrev = direction === "prev";
  const offsets = [0, 6, 12];
  return (
    <svg
      className={cn(
        "h-24 w-24 drop-shadow-[0_10px_26px_rgba(0,0,0,0.6)] transition-transform",
        isPrev ? "" : "-scale-x-100",
      )}
      viewBox="0 0 48 84"
      aria-hidden
    >
      {offsets.map((offset) => (
        <path
          key={offset}
          d={`M${36 - offset} 6 L${14 - offset} 42 L${36 - offset} 78 L${41 - offset} 78 L${19 - offset} 42 L${41 - offset} 6 Z`}
          fill="#ffffff"
        />
      ))}
    </svg>
  );
}

export default function OpeningModelCarousel({ models, pivot, variant = "page", className, onNavigateToMain }: OpeningModelCarouselProps) {
  const sanitized = useMemo(() => sanitizeModels(models), [models]);
  const sanitizedPivot = useMemo(() => sanitizePivot(pivot), [pivot]);
  const key = useMemo(() => {
    return sanitized
      .map((item) => [item.url, item.offset.x, item.offset.y, item.offset.z, item.scale].join(":"))
      .join("|");
  }, [sanitized]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    sanitized.forEach((item) => {
      if (!item?.url) {
        return;
      }
      try {
        useGLTF.preload(item.url);
      } catch {
        // ignore preload errors
      }
    });
  }, [sanitized]);

  useEffect(() => {
    setIndex((prev) => {
      if (sanitized.length === 0) {
        return 0;
      }
      if (prev >= sanitized.length) {
        return sanitized.length - 1;
      }
      return prev;
    });
  }, [key, sanitized.length]);

  const hasMultiple = sanitized.length > 1;
  const current = sanitized[index] ?? null;

  const currentViewerKey = useMemo(() => {
    if (!current) {
      return "empty";
    }
    return [
      current.url,
      current.offset.x,
      current.offset.y,
      current.offset.z,
      current.scale,
      sanitizedPivot.x,
      sanitizedPivot.y,
      sanitizedPivot.z,
      index,
    ].join("|");
  }, [current, sanitizedPivot.x, sanitizedPivot.y, sanitizedPivot.z, index]);

  const goPrev = () => {
    setIndex((prev) => (sanitized.length > 0 ? (prev - 1 + sanitized.length) % sanitized.length : 0));
  };

  const goNext = () => {
    setIndex((prev) => (sanitized.length > 0 ? (prev + 1) % sanitized.length : 0));
  };

  if (!current) {
    const emptyStyles =
      variant === "overlay"
        ? "flex h-full w-full items-center justify-center text-sm text-white/70"
        : "flex w-full items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-12 text-sm text-gray-500";
    return <div className={cn(emptyStyles, className)}>등록된 3D 모델이 없습니다.</div>;
  }

  if (variant === "overlay") {
    return (
      <div className={cn("relative h-full w-full", className)}>
        <div className="absolute inset-0">
          <GlbViewer
            key={currentViewerKey}
            url={current.url}
            pivot={sanitizedPivot}
            modelOffset={current.offset}
            modelScale={current.scale}
            className="h-full w-full"
            showZoomIndicator
            showPivotIndicator={false}
            guideSize={{ width: 90, height: 60 }}
          />
        </div>

        {hasMultiple ? (
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-12 top-1/2 -translate-y-1/2 transition-transform hover:scale-110 focus-visible:outline-none"
            aria-label="이전 모델"
          >
            <CarouselArrow direction="prev" />
          </button>
        ) : null}

        {hasMultiple ? (
          <button
            type="button"
            onClick={goNext}
            className="absolute right-12 top-1/2 -translate-y-1/2 transition-transform hover:scale-110 focus-visible:outline-none"
            aria-label="다음 모델"
          >
            <CarouselArrow direction="next" />
          </button>
        ) : null}

        {sanitized.length > 0 ? (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
            <div className="rounded-full bg-black/60 px-4 py-1 text-sm text-white/80">
              {index + 1} / {sanitized.length}
            </div>
            <a
              href="#product-hero"
              onClick={(event) => {
                event.preventDefault();
                onNavigateToMain?.();
                if (typeof window !== "undefined") {
                  const el = document.getElementById("product-hero");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }
              }}
              className="inline-flex items-center justify-center rounded-full border border-white/70 px-5 py-2 text-sm font-medium text-white transition hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              메인 페이지로 이동
            </a>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("flex w-full flex-col items-center gap-4", className)}>
      <div className="flex w-full items-center justify-center gap-4">
        {hasMultiple ? (
          <button
            type="button"
            onClick={goPrev}
            className="rounded-full border-0 bg-transparent p-1 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/40"
            aria-label="이전 모델"
          >
            <CarouselArrow direction="prev" />
          </button>
        ) : null}

        <div className="w-full max-w-4xl">
          <GlbViewer
            key={currentViewerKey}
            url={current.url}
            pivot={sanitizedPivot}
            modelOffset={current.offset}
            modelScale={current.scale}
            className="w-full aspect-[16/9]"
            showZoomIndicator
            showPivotIndicator={false}
            guideSize={{ width: 90, height: 60 }}
          />
        </div>

        {hasMultiple ? (
          <button
            type="button"
            onClick={goNext}
            className="rounded-full border-0 bg-transparent p-1 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/40"
            aria-label="다음 모델"
          >
            <CarouselArrow direction="next" />
          </button>
        ) : null}
      </div>

      {hasMultiple ? (
        <div className="text-sm text-gray-500">
          {index + 1} / {sanitized.length}
        </div>
      ) : null}
    </div>
  );
}
