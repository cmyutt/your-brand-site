import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  DEFAULT_ACRYLIC_BLUR,
  DEFAULT_ACRYLIC_BRIGHTNESS,
  DEFAULT_ACRYLIC_ANCHOR_Y,
  DEFAULT_ACRYLIC_OPACITY,
  DEFAULT_ACRYLIC_TOP_GAP,
  DEFAULT_ACRYLIC_TEXTURE_OPACITY,
  DEFAULT_IMAGE_LAYER_SCALE,
  DEFAULT_OPENING_OFFSET,
  DEFAULT_OPENING_PIVOT,
  DEFAULT_OPENING_SCALE,
  openingPaths,
  readOpeningManifest,
  writeOpeningManifest,
} from "@/lib/openingManifest";
import type { OpeningManifest } from "@/lib/openingManifest";

export const runtime = "nodejs";

type ManifestResponse = Pick<
  OpeningManifest,
  | "backgroundUrl"
  | "imageLayerUrl"
  | "imageLayerPosition"
  | "imageLayerScale"
  | "acrylicBlur"
  | "acrylicOpacity"
  | "acrylicTextureOpacity"
  | "acrylicBrightness"
  | "acrylicTopGap"
  | "acrylicAnchorY"
  | "modelUrl"
  | "pivot"
  | "modelOffset"
  | "modelScale"
  | "additionalModels"
  | "additionalModelUrls"
>;

type AdditionalPayloadEntry =
  | { kind: "existing"; url: string; offset?: unknown; scale?: unknown }
  | { kind: "new"; fileField: string; offset?: unknown; scale?: unknown };

const BACKGROUND_ENTRY_ID = "opening-background";
const MODEL_ENTRY_ID = "opening-model";
const IMAGE_LAYER_ENTRY_ID = "opening-image-layer";

export async function GET() {
  const manifest = await readOpeningManifest();
  return NextResponse.json<ManifestResponse>({
    backgroundUrl: manifest.backgroundUrl ?? null,
    imageLayerUrl: manifest.imageLayerUrl ?? null,
    imageLayerPosition: manifest.imageLayerPosition ?? { x: 50, y: 50 },
    imageLayerScale: manifest.imageLayerScale ?? DEFAULT_IMAGE_LAYER_SCALE,
    acrylicBlur: manifest.acrylicBlur ?? DEFAULT_ACRYLIC_BLUR,
    acrylicOpacity: manifest.acrylicOpacity ?? DEFAULT_ACRYLIC_OPACITY,
    acrylicTextureOpacity: manifest.acrylicTextureOpacity ?? DEFAULT_ACRYLIC_TEXTURE_OPACITY,
    acrylicBrightness: manifest.acrylicBrightness ?? DEFAULT_ACRYLIC_BRIGHTNESS,
    acrylicTopGap: manifest.acrylicTopGap ?? DEFAULT_ACRYLIC_TOP_GAP,
    acrylicAnchorY: manifest.acrylicAnchorY ?? DEFAULT_ACRYLIC_ANCHOR_Y,
    modelUrl: manifest.modelUrl ?? null,
    pivot: manifest.pivot ?? DEFAULT_OPENING_PIVOT,
    modelOffset: manifest.modelOffset ?? DEFAULT_OPENING_OFFSET,
    modelScale: manifest.modelScale ?? DEFAULT_OPENING_SCALE,
    additionalModels: manifest.additionalModels ?? [],
    additionalModelUrls: manifest.additionalModelUrls ?? [],
  });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const existing = await readOpeningManifest();

    const backgroundFile = extractFile(formData.get("backgroundFile"));
    const backgroundField = formData.get("backgroundUrl");
    const backgroundProvided = backgroundField !== null;
    let backgroundUrl = normalizeString(backgroundField);

    if (backgroundFile) {
      backgroundUrl = await persistUpload(backgroundFile, BACKGROUND_ENTRY_ID, "background");
    }

    const imageLayerFile = extractFile(formData.get("imageLayerFile"));
    const imageLayerField = formData.get("imageLayerUrl");
    const imageLayerProvided = imageLayerField !== null;
    let imageLayerUrl = normalizeString(imageLayerField);

    if (imageLayerFile) {
      imageLayerUrl = await persistUpload(imageLayerFile, IMAGE_LAYER_ENTRY_ID, "image");
    }

    const modelFile = extractFile(formData.get("modelFile"));
    const modelField = formData.get("modelUrl");
    const modelProvided = modelField !== null;
    let modelUrl = normalizeString(modelField);

    if (modelFile) {
      modelUrl = await persistUpload(modelFile, MODEL_ENTRY_ID, "model");
    }

    const additionalPayloadRaw = formData.get("additionalModelPayload");
    const resolvedAdditionalModels = await resolveAdditionalModels(
      additionalPayloadRaw,
      formData,
      existing.additionalModels ?? [],
    );

    const finalPivot = {
      x: parseNumber(formData.get("pivotX"), (existing.pivot ?? DEFAULT_OPENING_PIVOT).x),
      y: parseNumber(formData.get("pivotY"), (existing.pivot ?? DEFAULT_OPENING_PIVOT).y),
      z: parseNumber(formData.get("pivotZ"), (existing.pivot ?? DEFAULT_OPENING_PIVOT).z),
    };

    const finalOffset = {
      x: parseNumber(formData.get("offsetX"), (existing.modelOffset ?? DEFAULT_OPENING_OFFSET).x),
      y: parseNumber(formData.get("offsetY"), (existing.modelOffset ?? DEFAULT_OPENING_OFFSET).y),
      z: parseNumber(formData.get("offsetZ"), (existing.modelOffset ?? DEFAULT_OPENING_OFFSET).z),
    };

    const finalScaleValue = parseNumber(formData.get("modelScale"), existing.modelScale ?? DEFAULT_OPENING_SCALE);
    const finalScale = finalScaleValue > 0 ? finalScaleValue : DEFAULT_OPENING_SCALE;

    const finalBackground = backgroundFile
      ? backgroundUrl
      : backgroundProvided
        ? backgroundUrl.length > 0
          ? backgroundUrl
          : null
        : existing.backgroundUrl ?? null;

    const finalImageLayer = imageLayerFile
      ? imageLayerUrl
      : imageLayerProvided
        ? imageLayerUrl.length > 0
          ? imageLayerUrl
          : null
        : existing.imageLayerUrl ?? null;

    const finalImageLayerPosX = clampPercentage(
      parseNumber(formData.get("imageLayerPosX"), existing.imageLayerPosition?.x ?? 50),
    );
    const finalImageLayerPosY = clampPercentage(
      parseNumber(formData.get("imageLayerPosY"), existing.imageLayerPosition?.y ?? 50),
    );
    const finalImageLayerScale = clampImageScale(
      parseNumber(formData.get("imageLayerScale"), existing.imageLayerScale ?? DEFAULT_IMAGE_LAYER_SCALE),
    );
    const finalAcrylicBlur = clampBlur(
      parseNumber(formData.get("acrylicBlur"), existing.acrylicBlur ?? DEFAULT_ACRYLIC_BLUR),
    );
    const finalAcrylicOpacity = clampAcrylicOpacity(
      parseNumber(formData.get("acrylicOpacity"), existing.acrylicOpacity ?? DEFAULT_ACRYLIC_OPACITY),
    );
    const finalAcrylicTextureOpacity = clampTextureOpacity(
      parseNumber(
        formData.get("acrylicTextureOpacity"),
        existing.acrylicTextureOpacity ?? DEFAULT_ACRYLIC_TEXTURE_OPACITY,
      ),
    );
    const finalAcrylicBrightness = clampBrightness(
      parseNumber(formData.get("acrylicBrightness"), existing.acrylicBrightness ?? DEFAULT_ACRYLIC_BRIGHTNESS),
    );
    const finalAcrylicTopGap = clampTopGap(
      parseNumber(formData.get("acrylicTopGap"), existing.acrylicTopGap ?? DEFAULT_ACRYLIC_TOP_GAP),
    );
    const finalAcrylicAnchorY = clampAnchor(
      parseNumber(formData.get("acrylicAnchorY"), existing.acrylicAnchorY ?? DEFAULT_ACRYLIC_ANCHOR_Y),
    );

    const finalModel = modelFile
      ? modelUrl
      : modelProvided
        ? modelUrl.length > 0
          ? modelUrl
          : null
        : existing.modelUrl ?? null;

    await writeOpeningManifest({
      backgroundUrl: finalBackground,
      imageLayerUrl: finalImageLayer,
      imageLayerPosition: { x: finalImageLayerPosX, y: finalImageLayerPosY },
      imageLayerScale: finalImageLayerScale,
      acrylicBlur: finalAcrylicBlur,
      acrylicOpacity: finalAcrylicOpacity,
      acrylicTextureOpacity: finalAcrylicTextureOpacity,
      acrylicBrightness: finalAcrylicBrightness,
      acrylicTopGap: finalAcrylicTopGap,
      acrylicAnchorY: finalAcrylicAnchorY,
      modelUrl: finalModel,
      pivot: finalPivot,
      modelOffset: finalOffset,
      modelScale: finalScale,
      additionalModels: resolvedAdditionalModels,
    });

    const updatedManifest = await readOpeningManifest();

    revalidatePath("/");
    revalidatePath("/admin/opening");

    return NextResponse.json<ManifestResponse>({
      backgroundUrl: updatedManifest.backgroundUrl ?? null,
      imageLayerUrl: updatedManifest.imageLayerUrl ?? null,
      imageLayerPosition: updatedManifest.imageLayerPosition ?? { x: 50, y: 50 },
      imageLayerScale: updatedManifest.imageLayerScale ?? DEFAULT_IMAGE_LAYER_SCALE,
      acrylicBlur: updatedManifest.acrylicBlur ?? DEFAULT_ACRYLIC_BLUR,
      acrylicOpacity: updatedManifest.acrylicOpacity ?? DEFAULT_ACRYLIC_OPACITY,
      acrylicTextureOpacity: updatedManifest.acrylicTextureOpacity ?? DEFAULT_ACRYLIC_TEXTURE_OPACITY,
      acrylicBrightness: updatedManifest.acrylicBrightness ?? DEFAULT_ACRYLIC_BRIGHTNESS,
      acrylicTopGap: updatedManifest.acrylicTopGap ?? DEFAULT_ACRYLIC_TOP_GAP,
      acrylicAnchorY: updatedManifest.acrylicAnchorY ?? DEFAULT_ACRYLIC_ANCHOR_Y,
      modelUrl: updatedManifest.modelUrl ?? null,
      pivot: updatedManifest.pivot ?? DEFAULT_OPENING_PIVOT,
      modelOffset: updatedManifest.modelOffset ?? DEFAULT_OPENING_OFFSET,
      modelScale: updatedManifest.modelScale ?? DEFAULT_OPENING_SCALE,
      additionalModels: updatedManifest.additionalModels ?? [],
      additionalModelUrls: updatedManifest.additionalModelUrls ?? [],
    });
  } catch (error) {
    console.error("[opening:POST]", error);
    return NextResponse.json({ error: "Failed to save opening assets" }, { status: 500 });
  }
}

function extractFile(entry: FormDataEntryValue | null): File | null {
  if (!entry) return null;
  if (entry instanceof File && entry.size > 0) {
    return entry;
  }
  return null;
}

async function resolveAdditionalModels(
  entry: FormDataEntryValue | null,
  formData: FormData,
  fallback: OpeningManifest["additionalModels"],
) {
  if (entry === null) {
    return fallback.map(cloneAdditionalModel);
  }

  const payload = parseAdditionalPayload(entry);
  if (payload.length === 0) {
    return [];
  }

  const result: OpeningManifest["additionalModels"] = [];
  const seen = new Set<string>();

  const fallbackByUrl = new Map<string, OpeningManifest["additionalModels"][number]>();
  for (const model of fallback) {
    if (model?.url) {
      fallbackByUrl.set(model.url, model);
    }
  }

  for (const item of payload) {
    if (item.kind === "existing") {
      const normalized = normalizeString(item.url);
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      const fallbackEntry = fallbackByUrl.get(normalized);
      const offsetFallback = fallbackEntry?.offset ?? DEFAULT_OPENING_OFFSET;
      const scaleFallback = fallbackEntry?.scale ?? DEFAULT_OPENING_SCALE;
      result.push({
        url: normalized,
        offset: sanitizePayloadVector(item.offset, offsetFallback),
        scale: sanitizePayloadScale(item.scale, scaleFallback),
      });
      seen.add(normalized);
    } else if (item.kind === "new") {
      const file = extractFile(formData.get(item.fileField));
      if (!file) {
        continue;
      }
      const storedUrl = await persistUpload(file, `${MODEL_ENTRY_ID}-${randomUUID()}`, "model");
      if (seen.has(storedUrl)) {
        continue;
      }
      result.push({
        url: storedUrl,
        offset: sanitizePayloadVector(item.offset, DEFAULT_OPENING_OFFSET),
        scale: sanitizePayloadScale(item.scale, DEFAULT_OPENING_SCALE),
      });
      seen.add(storedUrl);
    }
  }

  if (result.length === 0) {
    return fallback.map(cloneAdditionalModel);
  }

  return result;
}

function cloneAdditionalModel(model: OpeningManifest["additionalModels"][number]) {
  return {
    url: model.url,
    offset: { ...model.offset },
    scale: model.scale,
  };
}

function sanitizePayloadVector(value: unknown, fallback: typeof DEFAULT_OPENING_OFFSET) {
  if (!value || typeof value !== "object") {
    return { ...fallback };
  }
  const record = value as Record<string, unknown>;
  return {
    x: parseNumber(record.x, fallback.x),
    y: parseNumber(record.y, fallback.y),
    z: parseNumber(record.z, fallback.z),
  };
}

function sanitizePayloadScale(value: unknown, fallback: number) {
  const parsed = parseNumber(value, fallback);
  return parsed > 0 ? parsed : fallback;
}

async function persistUpload(file: File, entryId: string, kind: "model" | "background" | "image") {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const extension = sanitizeExtension(file.name, kind);
  const filename = `${kind}-${entryId}${extension}`;
  const diskPath = path.join(openingPaths.dir, filename);
  await mkdir(openingPaths.dir, { recursive: true });
  await writeFile(diskPath, buffer);
  return `/opening/${filename}`;
}

function sanitizeExtension(filename: string, kind: "model" | "background" | "image") {
  const ext = path.extname(filename ?? "").toLowerCase();
  if (kind === "model") {
    return ext === ".glb" ? ext : ".glb";
  }
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
    return ext;
  }
  return ".jpg";
}

function normalizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 50;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return value;
}

function clampImageScale(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_IMAGE_LAYER_SCALE;
  }
  if (value < 10) {
    return 10;
  }
  if (value > 400) {
    return 400;
  }
  return value;
}

function clampBlur(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return DEFAULT_ACRYLIC_BLUR;
  }
  if (value > 80) {
    return 80;
  }
  return value;
}

function clampAcrylicOpacity(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_ACRYLIC_OPACITY;
  }
  if (value < -1) {
    return -1;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function clampTextureOpacity(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_ACRYLIC_TEXTURE_OPACITY;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function clampBrightness(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_ACRYLIC_BRIGHTNESS;
  }
  if (value < -1) {
    return -1;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function clampTopGap(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_ACRYLIC_TOP_GAP;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 2000) {
    return 2000;
  }
  return value;
}

function clampAnchor(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_ACRYLIC_ANCHOR_Y;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 5000) {
    return 5000;
  }
  return value;
}

function parseAdditionalPayload(entry: FormDataEntryValue | null): AdditionalPayloadEntry[] {
  if (typeof entry !== "string") {
    return [];
  }
  const trimmed = entry.trim();
  if (trimmed.length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const result: AdditionalPayloadEntry[] = [];
    for (const candidate of parsed) {
      if (!candidate || typeof candidate !== "object") {
        continue;
      }
      const record = candidate as Record<string, unknown>;
      const kind = record.kind;
      if (kind === "existing" && typeof record.url === "string") {
        result.push({
          kind: "existing",
          url: String(record.url),
          offset: record.offset ?? record.modelOffset,
          scale: record.scale ?? record.modelScale,
        });
      } else if (kind === "new" && typeof record.fileField === "string") {
        result.push({
          kind: "new",
          fileField: String(record.fileField),
          offset: record.offset ?? record.modelOffset,
          scale: record.scale ?? record.modelScale,
        });
      }
    }
    return result;
  } catch {
    return [];
  }
}
