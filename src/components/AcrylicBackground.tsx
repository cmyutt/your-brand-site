import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/cn";

type AcrylicBackgroundProps = {
  backgroundImage?: string | null;
  imageLayer?: string | null;
  imageLayerPosition?: { x?: number | null; y?: number | null } | null;
  imageLayerScale?: number | null;
  acrylicBlur?: number | null;
  acrylicOpacity?: number | null;
  acrylicTextureOpacity?: number | null;
  acrylicBrightness?: number | null;
  imageLayerScaleFactor?: number | null;
  showAcrylic?: boolean;
  showStage?: boolean;
  showImageLayer?: boolean;
  children?: ReactNode;
  className?: string;
  fullBleed?: boolean;
  backgroundMinHeight?: CSSProperties["minHeight"];
  panelMinHeight?: string | number;
  panelHeight?: string | number;
  panelWidth?: string | number;
  maxWidth?: string | number;
  aspectRatio?: string | number;
  padding?: string | number;
  contentPadding?: string | number;
  frameAlign?: CSSProperties["alignItems"];
  frameJustify?: CSSProperties["justifyContent"];
  frameOffsetY?: string | number;
  frameBottomOffset?: string | number;
  stageAlign?: CSSProperties["alignItems"];
};

const DEFAULT_BACKGROUND = "/images/background_image_v8_no_margin.webp";
const DEFAULT_IMAGE_SCALE = 100;
const MIN_IMAGE_SCALE = 10;
const MAX_IMAGE_SCALE = 400;
const DEFAULT_ACRYLIC_BLUR = 20;
const MIN_ACRYLIC_BLUR = 0;
const MAX_ACRYLIC_BLUR = 80;
const DEFAULT_PANEL_OPACITY = 0.08;
const DEFAULT_TEXTURE_OPACITY = 0.18;
const DEFAULT_BRIGHTNESS = 0;

const toCssValue = (value?: string | number) => {
  if (typeof value === "number") {
    return `${value}px`;
  }
  return value ?? undefined;
};

const setCssVar = (style: CSSProperties, name: string, value?: string) => {
  if (value) {
    (style as Record<string, string>)[name] = value;
  }
};

const clampBrightnessValue = (value: number | null | undefined, fallback: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  if (value < -1) {
    return -1;
  }
  if (value > 1) {
    return 1;
  }
  return value;
};

const clampUnitOpacity = (value: number | null | undefined, fallback: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
};

export default function AcrylicBackground({
  backgroundImage,
  imageLayer,
  imageLayerPosition,
  imageLayerScale,
  acrylicBlur,
  acrylicOpacity,
  acrylicTextureOpacity,
  acrylicBrightness,
  imageLayerScaleFactor,
  children,
  className,
  fullBleed = true,
  backgroundMinHeight = "100svh",
  panelMinHeight,
  panelHeight,
  panelWidth,
  maxWidth,
  aspectRatio,
  padding,
  contentPadding,
  frameAlign = "center",
  frameJustify = "center",
  frameOffsetY = 0,
  frameBottomOffset,
  stageAlign,
  showAcrylic = true,
  showStage = true,
  showImageLayer = true,
}: AcrylicBackgroundProps) {
  const resolvedBackground =
    typeof backgroundImage === "string" && backgroundImage.trim().length > 0
      ? backgroundImage
      : DEFAULT_BACKGROUND;

  const hasImageLayer = typeof imageLayer === "string" && imageLayer.trim().length > 0;
  const resolvedImagePosition = {
    x: Math.min(100, Math.max(0, Number(imageLayerPosition?.x ?? 50))),
    y: Math.min(100, Math.max(0, Number(imageLayerPosition?.y ?? 50))),
  };
  const rawScale = Number(imageLayerScale ?? DEFAULT_IMAGE_SCALE);
  const resolvedImageScale = Number.isFinite(rawScale)
    ? Math.min(MAX_IMAGE_SCALE, Math.max(MIN_IMAGE_SCALE, rawScale))
    : DEFAULT_IMAGE_SCALE;
  const rawBlur = Number(acrylicBlur ?? DEFAULT_ACRYLIC_BLUR);
  const resolvedAcrylicBlur = Number.isFinite(rawBlur)
    ? Math.min(MAX_ACRYLIC_BLUR, Math.max(MIN_ACRYLIC_BLUR, rawBlur))
    : DEFAULT_ACRYLIC_BLUR;
  const resolvedSaturate = 120;
  const resolvedPanelOpacity = clampUnitOpacity(acrylicOpacity, DEFAULT_PANEL_OPACITY);
  const resolvedTextureOpacity = clampUnitOpacity(acrylicTextureOpacity, DEFAULT_TEXTURE_OPACITY);
  const resolvedBrightness = clampBrightnessValue(acrylicBrightness, DEFAULT_BRIGHTNESS);
  const brightenAmount = resolvedBrightness > 0 ? resolvedBrightness : 0;
  const darkenAmount = resolvedBrightness < 0 ? -resolvedBrightness : 0;
  const layerScaleMultiplierRaw =
    typeof imageLayerScaleFactor === "number" && Number.isFinite(imageLayerScaleFactor) && imageLayerScaleFactor > 0
      ? imageLayerScaleFactor
      : 1;
  const layerScaleMultiplier = Math.min(1, Math.max(layerScaleMultiplierRaw, 0.05));

  const fallbackImageGradient =
    "radial-gradient(circle at 50% 45%, rgba(72, 164, 255, 0.55) 0%, rgba(72, 164, 255, 0.24) 40%, rgba(52, 92, 140, 0.08) 62%, rgba(0, 0, 0, 0) 85%)";

const stageImageStyle: CSSProperties = {
  backgroundPosition: `${resolvedImagePosition.x}% ${resolvedImagePosition.y}%`,
  backgroundSize: `${resolvedImageScale * layerScaleMultiplier}% auto`,
  backgroundRepeat: "no-repeat",
  transition:
    "opacity 0.35s ease, background-position 0.35s ease, background-size 0.35s ease, filter 0.35s ease",
  opacity: 0.9,
  display: showImageLayer ? "block" : "none",
};

  if (hasImageLayer) {
    stageImageStyle.backgroundImage = `url(${String(imageLayer)})`;
    stageImageStyle.opacity = 1;
    stageImageStyle.filter = "saturate(115%)";
  } else {
    stageImageStyle.background = fallbackImageGradient;
    stageImageStyle.filter = "saturate(135%)";
  }

  const containerStyle: CSSProperties = {
    backgroundImage: resolvedBackground ? `url(${resolvedBackground})` : undefined,
  };

  if (fullBleed) {
    containerStyle.width = "100vw";
    containerStyle.marginLeft = "calc(50% - 50vw)";
    containerStyle.marginRight = "calc(50% - 50vw)";
  }

  const backgroundMinHeightValue = toCssValue(backgroundMinHeight);
  setCssVar(containerStyle, "--acrylic-content-min-height", backgroundMinHeightValue);
  containerStyle.minHeight = backgroundMinHeightValue ?? "100svh";

  const overlayStyle: CSSProperties = {};
  setCssVar(overlayStyle, "--acrylic-shell-padding", toCssValue(padding));
  if (frameAlign) {
    overlayStyle.alignItems = frameAlign;
  }
  if (frameJustify) {
    overlayStyle.justifyContent = frameJustify;
  }
  if (!showAcrylic && !showImageLayer) {
    overlayStyle.visibility = "hidden";
  }

  const frameStyle: CSSProperties = {};
  setCssVar(frameStyle, "--acrylic-min-height", toCssValue(panelMinHeight));
  setCssVar(frameStyle, "--acrylic-panel-height", toCssValue(panelHeight));
  setCssVar(frameStyle, "--acrylic-max-width", toCssValue(maxWidth));
  setCssVar(frameStyle, "--acrylic-panel-width", toCssValue(panelWidth));
  setCssVar(frameStyle, "--acrylic-aspect-ratio", toCssValue(aspectRatio));
  setCssVar(frameStyle, "--acrylic-blur", `${resolvedAcrylicBlur}px`);
  setCssVar(frameStyle, "--acrylic-saturate", `${resolvedSaturate}%`);
  const frameOffsetValue = toCssValue(frameOffsetY);
  if (frameOffsetValue !== undefined) {
    frameStyle.marginTop = frameOffsetValue;
  }
  const frameBottomValue = toCssValue(frameBottomOffset);
  if (frameBottomValue !== undefined) {
    frameStyle.position = "absolute";
    frameStyle.left = "50%";
    frameStyle.transform = "translateX(-50%)";
    frameStyle.bottom = frameBottomValue;
    frameStyle.marginTop = undefined;
  }

  const contentStyle: CSSProperties = {};
  setCssVar(contentStyle, "--acrylic-content-padding", toCssValue(contentPadding));

  const stageStyle: CSSProperties = {};
  if (stageAlign) {
    stageStyle.alignItems = stageAlign;
  }

  const panelStyle: CSSProperties = {
    backdropFilter: `blur(${resolvedAcrylicBlur}px) saturate(${resolvedSaturate}%)`,
    WebkitBackdropFilter: `blur(${resolvedAcrylicBlur}px) saturate(${resolvedSaturate}%)`,
    backgroundColor: `rgba(255, 255, 255, ${resolvedPanelOpacity})`,
  };
  const textureStyle: CSSProperties = {
    opacity: resolvedTextureOpacity,
  };

  return (
    <div className="background-layer" style={containerStyle}>
      <div className="acrylic-shell" style={overlayStyle} aria-hidden>
        {showStage ? (
          <div className="acrylic-frame" style={frameStyle}>
            <div className="acrylic-stage" style={stageStyle}>
              <div className="acrylic-image-layer" style={stageImageStyle} />
              {showAcrylic ? (
                <div className="acrylic-panel" style={panelStyle}>
                  <div className="acrylic-panel__texture" style={textureStyle} />
                  {brightenAmount > 0 ? (
                    <div className="acrylic-panel__brightness" style={{ opacity: brightenAmount }} />
                  ) : null}
                  {darkenAmount > 0 ? (
                    <div className="acrylic-panel__shade" style={{ opacity: darkenAmount }} />
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      <div className={cn("acrylic-content", className)} style={contentStyle}>
        {children}
      </div>
    </div>
  );
}
