import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { DEFAULT_ACRYLIC_ANCHOR_Y, DEFAULT_ACRYLIC_TOP_GAP } from "@/lib/openingDefaults";

export { DEFAULT_ACRYLIC_ANCHOR_Y, DEFAULT_ACRYLIC_TOP_GAP } from "@/lib/openingDefaults";

type OpeningVector = {
  x: number;
  y: number;
  z: number;
};

type OpeningImagePosition = {
  x: number;
  y: number;
};

export const DEFAULT_IMAGE_LAYER_SCALE = 100;
export const DEFAULT_ACRYLIC_BLUR = 20;
export const DEFAULT_ACRYLIC_OPACITY = 0.08;
export const DEFAULT_ACRYLIC_TEXTURE_OPACITY = 0.18;
export const DEFAULT_ACRYLIC_BRIGHTNESS = 0;

export type OpeningAdditionalModel = {
  url: string;
  offset: OpeningVector;
  scale: number;
};

export type OpeningManifest = {
  updatedAt: string;
  backgroundUrl: string | null;
  imageLayerUrl: string | null;
  imageLayerPosition: OpeningImagePosition;
  imageLayerScale: number;
  acrylicBlur: number;
  acrylicOpacity: number;
  acrylicTextureOpacity: number;
  acrylicBrightness: number;
  acrylicTopGap: number;
  acrylicAnchorY: number;
  modelUrl: string | null;
  pivot: OpeningVector;
  modelOffset: OpeningVector;
  modelScale: number;
  additionalModels: OpeningAdditionalModel[];
  additionalModelUrls: string[];
};

export const DEFAULT_OPENING_PIVOT: OpeningVector = { x: 0, y: 0, z: 0 };
export const DEFAULT_OPENING_OFFSET: OpeningVector = { x: 0, y: 0, z: 0 };
export const DEFAULT_OPENING_SCALE = 1;
const DEFAULT_IMAGE_POSITION: OpeningImagePosition = { x: 50, y: 50 };

const OPENING_DIR = path.join(process.cwd(), "public", "opening");
const MANIFEST_PATH = path.join(OPENING_DIR, "manifest.json");

export const openingPaths = {
  dir: OPENING_DIR,
  manifest: MANIFEST_PATH,
};

const PUBLIC_DIR = path.join(process.cwd(), "public");
const EXTERNAL_URL_REGEX = /^https?:\/\//i;

async function ensureDirExists() {
  await mkdir(OPENING_DIR, { recursive: true });
}

async function ensureManifestExists() {
  try {
    await readFile(MANIFEST_PATH);
  } catch {
    await writeOpeningManifest({
      backgroundUrl: null,
      imageLayerUrl: null,
      imageLayerPosition: DEFAULT_IMAGE_POSITION,
      imageLayerScale: DEFAULT_IMAGE_LAYER_SCALE,
      acrylicBlur: DEFAULT_ACRYLIC_BLUR,
      acrylicOpacity: DEFAULT_ACRYLIC_OPACITY,
      acrylicTextureOpacity: DEFAULT_ACRYLIC_TEXTURE_OPACITY,
      acrylicBrightness: DEFAULT_ACRYLIC_BRIGHTNESS,
      acrylicTopGap: DEFAULT_ACRYLIC_TOP_GAP,
      acrylicAnchorY: DEFAULT_ACRYLIC_ANCHOR_Y,
      modelUrl: null,
      pivot: DEFAULT_OPENING_PIVOT,
      modelOffset: DEFAULT_OPENING_OFFSET,
      modelScale: DEFAULT_OPENING_SCALE,
      additionalModels: [],
      additionalModelUrls: [],
    });
  }
}

export async function readOpeningManifest(): Promise<OpeningManifest> {
  await ensureDirExists();
  await ensureManifestExists();

  try {
    const data = await readFile(MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(data) as Partial<OpeningManifest> & {
      background?: string | null;
      model?: string | null;
      entries?: Array<{ imageUrl?: string | null; modelUrl?: string | null }>;
      pivot?: unknown;
      modelOffset?: unknown;
      modelScale?: unknown;
      additionalModels?: unknown;
      additionalModelUrls?: unknown;
      imageLayerUrl?: unknown;
      imageLayerPosition?: unknown;
      imageLayerScale?: unknown;
      acrylicBlur?: unknown;
      acrylicOpacity?: unknown;
      acrylicTextureOpacity?: unknown;
      acrylicBrightness?: unknown;
      acrylicTopGap?: unknown;
      acrylicAnchorY?: unknown;
    };

    const legacyBackground =
      typeof parsed.background === "string" && parsed.background.trim().length > 0
        ? parsed.background.trim()
        : parsed.entries?.find((entry) => typeof entry?.imageUrl === "string")?.imageUrl?.trim() ?? null;

    const legacyModel =
      typeof parsed.model === "string" && parsed.model.trim().length > 0
        ? parsed.model.trim()
        : parsed.entries?.find((entry) => typeof entry?.modelUrl === "string")?.modelUrl?.trim() ?? null;

    const backgroundUrl =
      typeof parsed.backgroundUrl === "string" && parsed.backgroundUrl.trim().length > 0
        ? parsed.backgroundUrl.trim()
        : legacyBackground;

    const modelUrl =
      typeof parsed.modelUrl === "string" && parsed.modelUrl.trim().length > 0
        ? parsed.modelUrl.trim()
        : legacyModel;

    const imageLayerUrl = sanitizeString(parsed.imageLayerUrl as string | null);
    const imageLayerPosition = sanitizeImagePosition(parsed.imageLayerPosition);
    const imageLayerScale = sanitizeImageScale(parsed.imageLayerScale);
    const acrylicBlur = sanitizeAcrylicBlur(parsed.acrylicBlur);
    const acrylicOpacity = sanitizeAcrylicOpacity(parsed.acrylicOpacity);
    const acrylicTextureOpacity = sanitizeAcrylicTextureOpacity(parsed.acrylicTextureOpacity);
    const acrylicBrightness = sanitizeAcrylicBrightness(parsed.acrylicBrightness);
    const acrylicTopGap = sanitizeAcrylicTopGap(parsed.acrylicTopGap);
    const acrylicAnchorY = sanitizeAcrylicAnchorY(parsed.acrylicAnchorY);

    const pivot = sanitizeVector(parsed.pivot, DEFAULT_OPENING_PIVOT);
    const modelOffset = sanitizeVector(parsed.modelOffset, DEFAULT_OPENING_OFFSET);
    const modelScale = sanitizeScale(parsed.modelScale, DEFAULT_OPENING_SCALE);

    let additionalModels = sanitizeAdditionalModelsFromUnknown(
      parsed.additionalModels,
      DEFAULT_OPENING_OFFSET,
      DEFAULT_OPENING_SCALE,
    );

    const additionalModelCandidates = uniqueStrings([
      ...additionalModels.map((entry) => entry.url),
      ...sanitizeStringArray(parsed.additionalModelUrls),
      ...collectLegacyAdditionalModels(parsed.entries),
    ]).filter((url) => !modelUrl || url !== modelUrl);

    if (additionalModels.length === 0 && additionalModelCandidates.length > 0) {
      additionalModels = additionalModelCandidates.map((url) => ({
        url,
        offset: { ...DEFAULT_OPENING_OFFSET },
        scale: DEFAULT_OPENING_SCALE,
      }));
    } else if (additionalModels.length > 0) {
      const candidateSet = new Set(additionalModelCandidates);
      additionalModels = additionalModels.filter((entry) => candidateSet.size === 0 || candidateSet.has(entry.url));
      const missingUrls = additionalModelCandidates.filter(
        (url) => !additionalModels.some((entry) => entry.url === url),
      );
      additionalModels.push(
        ...missingUrls.map((url) => ({
          url,
          offset: { ...DEFAULT_OPENING_OFFSET },
          scale: DEFAULT_OPENING_SCALE,
        })),
      );
    }

    const cleanedAdditionalModels = uniqueAdditionalModels(
      additionalModels.filter((entry) => (modelUrl ? entry.url !== modelUrl : true)),
    );

    const [validatedBackgroundUrl, validatedModelUrl, validatedImageLayerUrl] = await Promise.all([
      ensureAssetAvailable(backgroundUrl),
      ensureAssetAvailable(modelUrl),
      ensureAssetAvailable(imageLayerUrl),
    ]);

    const filteredAdditionalModels = await filterAvailableAdditionalModels(
      cleanedAdditionalModels.filter((entry) => (validatedModelUrl ? entry.url !== validatedModelUrl : true)),
    );

    const additionalModelUrls = filteredAdditionalModels.map((entry) => entry.url);

    const manifest: OpeningManifest = {
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
      backgroundUrl: validatedBackgroundUrl,
      imageLayerUrl: validatedImageLayerUrl,
      imageLayerPosition,
      imageLayerScale,
      acrylicBlur,
      acrylicOpacity,
      acrylicTextureOpacity,
      acrylicBrightness,
      acrylicTopGap,
      acrylicAnchorY,
      modelUrl: validatedModelUrl,
      pivot,
      modelOffset,
      modelScale,
      additionalModels: filteredAdditionalModels,
      additionalModelUrls,
    };

    const parsedImageLayerPosition = parsed.imageLayerPosition;
    const hasValidImageLayerPosition =
      parsedImageLayerPosition &&
      typeof parsedImageLayerPosition === "object" &&
      typeof (parsedImageLayerPosition as Record<string, unknown>).x === "number" &&
      typeof (parsedImageLayerPosition as Record<string, unknown>).y === "number";

    const normalize = (value: unknown) =>
      typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

    const shouldRewrite =
      !hasValidImageLayerPosition ||
      normalize(parsed.backgroundUrl) !== manifest.backgroundUrl ||
      normalize(parsed.imageLayerUrl) !== manifest.imageLayerUrl ||
      normalize(parsed.modelUrl) !== manifest.modelUrl ||
      sanitizeImageScale(parsed.imageLayerScale) !== manifest.imageLayerScale ||
      sanitizeAcrylicBlur(parsed.acrylicBlur) !== manifest.acrylicBlur ||
      sanitizeAcrylicOpacity(parsed.acrylicOpacity) !== manifest.acrylicOpacity ||
      sanitizeAcrylicTextureOpacity(parsed.acrylicTextureOpacity) !== manifest.acrylicTextureOpacity ||
      sanitizeAcrylicBrightness(parsed.acrylicBrightness) !== manifest.acrylicBrightness ||
      sanitizeAcrylicTopGap(parsed.acrylicTopGap) !== manifest.acrylicTopGap ||
      sanitizeAcrylicAnchorY(parsed.acrylicAnchorY) !== manifest.acrylicAnchorY;

    if (shouldRewrite) {
      try {
        await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
      } catch {
        // ignore rewrite failures; manifest can still be consumed in-memory
      }
    }

    return manifest;
  } catch {
    return {
      updatedAt: new Date(0).toISOString(),
      backgroundUrl: null,
      imageLayerUrl: null,
      imageLayerPosition: { ...DEFAULT_IMAGE_POSITION },
      imageLayerScale: DEFAULT_IMAGE_LAYER_SCALE,
      acrylicBlur: DEFAULT_ACRYLIC_BLUR,
      acrylicOpacity: DEFAULT_ACRYLIC_OPACITY,
      acrylicTextureOpacity: DEFAULT_ACRYLIC_TEXTURE_OPACITY,
      acrylicBrightness: DEFAULT_ACRYLIC_BRIGHTNESS,
      acrylicTopGap: DEFAULT_ACRYLIC_TOP_GAP,
      acrylicAnchorY: DEFAULT_ACRYLIC_ANCHOR_Y,
      modelUrl: null,
      pivot: { ...DEFAULT_OPENING_PIVOT },
      modelOffset: { ...DEFAULT_OPENING_OFFSET },
      modelScale: DEFAULT_OPENING_SCALE,
      additionalModels: [],
      additionalModelUrls: [],
    };
  }
}

export async function writeOpeningManifest(params: {
  backgroundUrl: string | null;
  imageLayerUrl: string | null;
  imageLayerPosition: { x: number | null; y: number | null } | null;
  imageLayerScale: number | null;
  acrylicBlur: number | null;
  acrylicOpacity: number | null;
  acrylicTextureOpacity: number | null;
  acrylicBrightness: number | null;
  acrylicTopGap: number | null;
  acrylicAnchorY: number | null;
  modelUrl: string | null;
  pivot: OpeningVector | null;
  modelOffset: OpeningVector | null;
  modelScale: number | null;
  additionalModels?: Array<{ url: string | null; offset?: OpeningVector | null; scale?: number | null } | null> | null;
  additionalModelUrls?: Array<string | null> | null;
}) {
  await ensureDirExists();

  const sanitizedAdditionalModelsInput = sanitizeAdditionalModelsFromUnknown(
    params.additionalModels,
    DEFAULT_OPENING_OFFSET,
    DEFAULT_OPENING_SCALE,
  );

  const sanitizedAdditionalModelUrlsInput = sanitizeStringArray(params.additionalModelUrls);
  const sanitizedBackgroundUrl = sanitizeString(params.backgroundUrl);
  const sanitizedImageLayerUrl = sanitizeString(params.imageLayerUrl);
  const sanitizedModelUrl = sanitizeString(params.modelUrl);
  const sanitizedImageLayerPosition = sanitizeImagePosition(params.imageLayerPosition);
  const sanitizedImageLayerScale = sanitizeImageScale(params.imageLayerScale);
  const sanitizedAcrylicBlur = sanitizeAcrylicBlur(params.acrylicBlur);
  const sanitizedAcrylicOpacity = sanitizeAcrylicOpacity(params.acrylicOpacity);
  const sanitizedAcrylicTextureOpacity = sanitizeAcrylicTextureOpacity(params.acrylicTextureOpacity);
  const sanitizedAcrylicBrightness = sanitizeAcrylicBrightness(params.acrylicBrightness);
  const sanitizedAcrylicTopGap = sanitizeAcrylicTopGap(params.acrylicTopGap);
  const sanitizedAcrylicAnchorY = sanitizeAcrylicAnchorY(params.acrylicAnchorY);

  const mergedAdditionalModels: OpeningAdditionalModel[] = [
    ...sanitizedAdditionalModelsInput,
    ...sanitizedAdditionalModelUrlsInput
      .filter((url) => !sanitizedAdditionalModelsInput.some((entry) => entry.url === url))
      .map((url) => ({
        url,
        offset: { ...DEFAULT_OPENING_OFFSET },
        scale: DEFAULT_OPENING_SCALE,
      })),
  ];

  const [validatedBackgroundUrl, validatedModelUrl, validatedImageLayerUrl] = await Promise.all([
    ensureAssetAvailable(sanitizedBackgroundUrl),
    ensureAssetAvailable(sanitizedModelUrl),
    ensureAssetAvailable(sanitizedImageLayerUrl),
  ]);

  const cleanedAdditionalModels = uniqueAdditionalModels(
    mergedAdditionalModels.filter((entry) => (validatedModelUrl ? entry.url !== validatedModelUrl : true)),
  );

  const filteredAdditionalModels = await filterAvailableAdditionalModels(cleanedAdditionalModels);
  const filteredAdditionalModelUrls = filteredAdditionalModels.map((entry) => entry.url);

  const payload: OpeningManifest = {
    updatedAt: new Date().toISOString(),
    backgroundUrl: validatedBackgroundUrl,
    imageLayerUrl: validatedImageLayerUrl,
    imageLayerPosition: sanitizedImageLayerPosition,
    imageLayerScale: sanitizedImageLayerScale,
    acrylicBlur: sanitizedAcrylicBlur,
    acrylicOpacity: sanitizedAcrylicOpacity,
    acrylicTextureOpacity: sanitizedAcrylicTextureOpacity,
    acrylicBrightness: sanitizedAcrylicBrightness,
    acrylicTopGap: sanitizedAcrylicTopGap,
    acrylicAnchorY: sanitizedAcrylicAnchorY,
    modelUrl: validatedModelUrl,
    pivot: sanitizeVector(params.pivot, DEFAULT_OPENING_PIVOT),
    modelOffset: sanitizeVector(params.modelOffset, DEFAULT_OPENING_OFFSET),
    modelScale: sanitizeScale(params.modelScale, DEFAULT_OPENING_SCALE),
    additionalModels: filteredAdditionalModels,
    additionalModelUrls: filteredAdditionalModelUrls,
  };

  await writeFile(MANIFEST_PATH, JSON.stringify(payload, null, 2), "utf8");
}


function sanitizeString(value: string | null | undefined): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function sanitizeScale(input: unknown, fallback = DEFAULT_OPENING_SCALE): number {
  if (typeof input === "number" && Number.isFinite(input) && input > 0) {
    return input;
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed.length > 0) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }
  return fallback;
}

function sanitizeImagePosition(input: unknown): OpeningImagePosition {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_IMAGE_POSITION };
  }
  const record = input as Record<string, unknown>;
  const x = clampPercentage(toNumber(record.x, DEFAULT_IMAGE_POSITION.x));
  const y = clampPercentage(toNumber(record.y, DEFAULT_IMAGE_POSITION.y));
  return { x, y };
}

function sanitizeImageScale(input: unknown): number {
  const raw = toNumber(input, DEFAULT_IMAGE_LAYER_SCALE);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_IMAGE_LAYER_SCALE;
  }
  if (raw < 10) {
    return 10;
  }
  if (raw > 400) {
    return 400;
  }
  return raw;
}

function sanitizeAcrylicBlur(input: unknown): number {
  const raw = toNumber(input, DEFAULT_ACRYLIC_BLUR);
  if (!Number.isFinite(raw) || raw < 0) {
    return DEFAULT_ACRYLIC_BLUR;
  }
  if (raw > 80) {
    return 80;
  }
  return raw;
}

function sanitizeAcrylicOpacity(input: unknown): number {
  const raw = toNumber(input, DEFAULT_ACRYLIC_OPACITY);
  if (!Number.isFinite(raw)) {
    return DEFAULT_ACRYLIC_OPACITY;
  }
  if (raw < 0) {
    return 0;
  }
  if (raw > 1) {
    return 1;
  }
  return raw;
}

function sanitizeAcrylicTextureOpacity(input: unknown): number {
  const raw = toNumber(input, DEFAULT_ACRYLIC_TEXTURE_OPACITY);
  if (!Number.isFinite(raw)) {
    return DEFAULT_ACRYLIC_TEXTURE_OPACITY;
  }
  if (raw < 0) {
    return 0;
  }
  if (raw > 1) {
    return 1;
  }
  return raw;
}

function sanitizeAcrylicBrightness(input: unknown): number {
  const raw = toNumber(input, DEFAULT_ACRYLIC_BRIGHTNESS);
  if (!Number.isFinite(raw)) {
    return DEFAULT_ACRYLIC_BRIGHTNESS;
  }
  if (raw < -1) {
    return -1;
  }
  if (raw > 1) {
    return 1;
  }
  return raw;
}

function sanitizeAcrylicTopGap(input: unknown): number {
  const raw = toNumber(input, DEFAULT_ACRYLIC_TOP_GAP);
  if (!Number.isFinite(raw)) {
    return DEFAULT_ACRYLIC_TOP_GAP;
  }
  if (raw < 0) {
    return 0;
  }
  if (raw > 2000) {
    return 2000;
  }
  return raw;
}

function sanitizeAcrylicAnchorY(input: unknown): number {
  const raw = toNumber(input, DEFAULT_ACRYLIC_ANCHOR_Y);
  if (!Number.isFinite(raw)) {
    return DEFAULT_ACRYLIC_ANCHOR_Y;
  }
  if (raw < 0) {
    return 0;
  }
  if (raw > 5000) {
    return 5000;
  }
  return raw;
}

function sanitizeVector(input: unknown, fallback: OpeningVector): OpeningVector {
  if (!input || typeof input !== "object") {
    return { ...fallback };
  }

  const source = input as Record<string, unknown>;
  const x = toNumber(source.x, fallback.x);
  const y = toNumber(source.y, fallback.y);
  const z = toNumber(source.z, fallback.z);

  return { x, y, z };
}

function sanitizeStringArray(input: unknown): string[] {
  if (!input) {
    return [];
  }
  if (Array.isArray(input)) {
    return (input as unknown[])
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter((entry) => entry.length > 0);
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }
  return [];
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

function sanitizeAdditionalModelsFromUnknown(
  input: unknown,
  fallbackOffset: OpeningVector,
  fallbackScale: number,
): OpeningAdditionalModel[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const result: OpeningAdditionalModel[] = [];

  for (const entry of input) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const urlCandidate = sanitizeString(record.url as string | null) ?? sanitizeString(record.modelUrl as string | null);
    if (!urlCandidate) {
      continue;
    }
    const offsetSource = record.offset ?? record.modelOffset;
    const scaleSource = record.scale ?? record.modelScale;
    result.push({
      url: urlCandidate,
      offset: sanitizeVector(offsetSource, fallbackOffset),
      scale: sanitizeScale(scaleSource, fallbackScale),
    });
  }

  return uniqueAdditionalModels(result);
}

function uniqueAdditionalModels(models: OpeningAdditionalModel[]): OpeningAdditionalModel[] {
  const seen = new Set<string>();
  const result: OpeningAdditionalModel[] = [];
  for (const model of models) {
    if (!model.url || seen.has(model.url)) {
      continue;
    }
    seen.add(model.url);
    result.push({ url: model.url, offset: { ...model.offset }, scale: model.scale });
  }
  return result;
}

function collectLegacyAdditionalModels(
  entries: Array<{ imageUrl?: string | null; modelUrl?: string | null }> | undefined,
): string[] {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries
    .map((entry) => (typeof entry?.modelUrl === "string" ? entry.modelUrl.trim() : ""))
    .filter((value) => value.length > 0);
}

async function filterAvailableAdditionalModels(models: OpeningAdditionalModel[]): Promise<OpeningAdditionalModel[]> {
  if (!Array.isArray(models) || models.length === 0) {
    return [];
  }
  const filtered: OpeningAdditionalModel[] = [];
  for (const entry of models) {
    const verifiedUrl = await ensureAssetAvailable(entry.url);
    if (!verifiedUrl) {
      continue;
    }
    filtered.push({
      url: verifiedUrl,
      offset: { ...entry.offset },
      scale: entry.scale,
    });
  }
  return uniqueAdditionalModels(filtered);
}

async function ensureAssetAvailable(url: string | null): Promise<string | null> {
  const sanitized = sanitizeString(url);
  if (!sanitized) {
    return null;
  }
  if (EXTERNAL_URL_REGEX.test(sanitized)) {
    return sanitized;
  }

  const normalized = sanitized.split(/[?#]/, 1)[0] ?? "";
  const relativePath = normalized.replace(/^[\\/]+/, "");
  if (!relativePath || relativePath.includes("..")) {
    return null;
  }

  const absolutePath = path.resolve(PUBLIC_DIR, relativePath);
  if (!isSubPath(PUBLIC_DIR, absolutePath)) {
    return null;
  }

  try {
    await access(absolutePath);
    return sanitized;
  } catch {
    return null;
  }
}

function isSubPath(parent: string, candidate: string): boolean {
  const parentPath = path.resolve(parent);
  const candidatePath = path.resolve(candidate);
  return candidatePath === parentPath || candidatePath.startsWith(parentPath + path.sep);
}

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

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_IMAGE_POSITION.x;
  }
  return Math.min(100, Math.max(0, value));
}
