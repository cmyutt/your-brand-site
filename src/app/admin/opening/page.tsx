"use client";



import { useCallback, useEffect, useRef, useState } from "react";

import type { ChangeEvent, MutableRefObject } from "react";



import GlbViewer from "@/components/GlbViewer";
import {
  BACKGROUND_SOURCE_HEIGHT,
  BACKGROUND_SOURCE_WIDTH,
  DEFAULT_ACRYLIC_ANCHOR_Y,
  DEFAULT_ACRYLIC_TOP_GAP,
} from "@/lib/openingDefaults";
import { calculateAnchorPercent, resolveSourceAnchor } from "@/lib/anchorMath";



type ManifestAdditionalModel = {

  url: string | null;

  offset?: Pivot | null;

  modelOffset?: Pivot | null;

  scale?: number | null;

  modelScale?: number | null;

};



type ManifestResponse = {

  backgroundUrl: string | null;

  imageLayerUrl: string | null;

  imageLayerPosition?: { x?: number | null; y?: number | null } | null;

  imageLayerScale?: number | null;

  acrylicBlur?: number | null;

  acrylicOpacity?: number | null;

  acrylicTextureOpacity?: number | null;

  acrylicBrightness?: number | null;

  acrylicTopGap?: number | null;

  acrylicAnchorY?: number | null;

  modelUrl: string | null;

  pivot: Pivot | null;

  modelOffset: Pivot | null;

  modelScale: number | null;

  additionalModels?: ManifestAdditionalModel[] | null;

  additionalModelUrls?: string[] | null;

};



type Pivot = {

  x: number;

  y: number;

  z: number;

};



type ImagePosition = {

  x: number;

  y: number;

};



type AdditionalModelState = {

  id: string;

  kind: "existing" | "new";

  url: string | null;

  file?: File;

  previewUrl: string | null;

  label: string;

  offset: Pivot;

  scale: number;

};



const defaultPivot: Pivot = { x: 0, y: 0, z: 0 };

const defaultScale = 1;

const defaultImagePosition: ImagePosition = { x: 50, y: 50 };

const defaultImageScale = 100;

const defaultAcrylicBlur = 20;
const defaultAcrylicOpacity = 0.08;
const defaultTextureOpacity = 0.18;
const defaultAcrylicBrightness = 0;
const defaultAcrylicAnchorY = DEFAULT_ACRYLIC_ANCHOR_Y;
const defaultAcrylicTopGap = DEFAULT_ACRYLIC_TOP_GAP;

const backgroundSourceHeight = BACKGROUND_SOURCE_HEIGHT;
const backgroundSourceWidth = BACKGROUND_SOURCE_WIDTH;

const acrylicPreviewBaseWidth = 250;
const acrylicPreviewBaseHeight = 720;
const acrylicPreviewAspectRatio = `${acrylicPreviewBaseWidth} / ${acrylicPreviewBaseHeight}`;
const acrylicPreviewMaxWidth = 200;



export default function AdminOpeningPage() {

  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);

  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);

  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);

  const [imageLayerUrl, setImageLayerUrl] = useState<string | null>(null);

  const [imageLayerPreview, setImageLayerPreview] = useState<string | null>(null);

  const [imageLayerFile, setImageLayerFile] = useState<File | null>(null);

  const [imageLayerPosition, setImageLayerPosition] = useState<ImagePosition>(defaultImagePosition);

  const [imageLayerScale, setImageLayerScale] = useState<number>(defaultImageScale);

  const [acrylicBlur, setAcrylicBlur] = useState<number>(defaultAcrylicBlur);
  const [acrylicOpacity, setAcrylicOpacity] = useState<number>(defaultAcrylicOpacity);
  const [acrylicBrightness, setAcrylicBrightness] = useState<number>(defaultAcrylicBrightness);
  const [textureOpacity, setTextureOpacity] = useState<number>(defaultTextureOpacity);
  const [acrylicTopGap, setAcrylicTopGap] = useState<number>(defaultAcrylicTopGap);
  const [acrylicAnchorY, setAcrylicAnchorY] = useState<number>(defaultAcrylicAnchorY);
  const [anchorPreviewPercent, setAnchorPreviewPercent] = useState<number>(50);



  const [modelUrl, setModelUrl] = useState<string | null>(null);

  const [modelPreview, setModelPreview] = useState<string | null>(null);

  const [modelFile, setModelFile] = useState<File | null>(null);

  const [pivot, setPivot] = useState<Pivot>(defaultPivot);

  const [modelOffset, setModelOffset] = useState<Pivot>(defaultPivot);

  const [modelScale, setModelScale] = useState(defaultScale);



  const [additionalModels, setAdditionalModels] = useState<AdditionalModelState[]>([]);



  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);



  const backgroundBlobRef = useRef<string | null>(null);

  const imageLayerBlobRef = useRef<string | null>(null);

  const modelBlobRef = useRef<string | null>(null);
  const backgroundPreviewRef = useRef<HTMLDivElement | null>(null);

  const updateAnchorPreview = useCallback(
    (anchorValue: number) => {
      const container = backgroundPreviewRef.current;
      if (!container) {
        return;
      }
      const resolvedAnchor = resolveSourceAnchor(anchorValue, backgroundSourceHeight);
      const rect = container.getBoundingClientRect();
      const percent = calculateAnchorPercent(
        rect.width,
        rect.height,
        resolvedAnchor,
        backgroundSourceWidth,
        backgroundSourceHeight,
      );
      setAnchorPreviewPercent(percent);
    },
    [],
  );

  const additionalBlobMapRef = useRef(new Map<string, string>());



  const clearAdditionalPreviews = useCallback(() => {

    additionalBlobMapRef.current.forEach((url) => {

      URL.revokeObjectURL(url);

    });

    additionalBlobMapRef.current.clear();

  }, []);



  const revokeAdditionalPreview = useCallback((id: string) => {

    const url = additionalBlobMapRef.current.get(id);

    if (url) {

      URL.revokeObjectURL(url);

      additionalBlobMapRef.current.delete(id);

    }

  }, []);



  const loadManifest = useCallback(async () => {

    setLoading(true);

    setError(null);

    try {

      const response = await fetch("/api/admin/opening", { cache: "no-store" });

      if (!response.ok) {

        throw new Error("Failed to fetch opening configuration");

      }

      const data = (await response.json()) as ManifestResponse;

      setBackgroundUrl(data.backgroundUrl);

      setBackgroundPreview(data.backgroundUrl);

      setBackgroundFile(null);

      revokeUrl(backgroundBlobRef);



      setImageLayerUrl(data.imageLayerUrl ?? null);

      setImageLayerPreview(data.imageLayerUrl ?? null);

      setImageLayerFile(null);

      revokeUrl(imageLayerBlobRef);



      const position = sanitizeImagePositionFromResponse(data.imageLayerPosition);

      setImageLayerPosition(position);

      setImageLayerScale(sanitizeImageScaleFromResponse(data.imageLayerScale));

      setAcrylicBlur(sanitizeAcrylicBlurFromResponse(data.acrylicBlur));
      setAcrylicOpacity(sanitizeAcrylicOpacityFromResponse(data.acrylicOpacity));
      setAcrylicBrightness(sanitizeAcrylicBrightnessFromResponse(data.acrylicBrightness));
      setTextureOpacity(sanitizeTextureOpacityFromResponse(data.acrylicTextureOpacity));
      const savedTopGap = sanitizeAcrylicTopGapFromResponse(data.acrylicTopGap);
      setAcrylicTopGap(savedTopGap);
      const savedAnchor = sanitizeAcrylicAnchorYFromResponse(data.acrylicAnchorY);
      setAcrylicAnchorY(savedAnchor);
      updateAnchorPreview(savedAnchor);
      const resolvedTopGap = sanitizeAcrylicTopGapFromResponse(data.acrylicTopGap);
      setAcrylicTopGap(resolvedTopGap);
      const resolvedAnchor = sanitizeAcrylicAnchorYFromResponse(data.acrylicAnchorY);
      setAcrylicAnchorY(resolvedAnchor);
      updateAnchorPreview(resolvedAnchor);

      setModelUrl(data.modelUrl);

      setModelPreview(data.modelUrl);

      setModelFile(null);

      setPivot(data.pivot ?? defaultPivot);

      setModelOffset(data.modelOffset ?? defaultPivot);

      setModelScale(typeof data.modelScale === "number" && Number.isFinite(data.modelScale) ? data.modelScale : defaultScale);

      revokeUrl(modelBlobRef);



      clearAdditionalPreviews();

      setAdditionalModels(createAdditionalStateFromResponse(data));

    } catch (err) {

      console.error(err);

      setError("Unable to load opening configuration.");

      setBackgroundUrl(null);

      setBackgroundPreview(null);

      setImageLayerUrl(null);

      setImageLayerPreview(null);

      setImageLayerFile(null);

      revokeUrl(imageLayerBlobRef);

      setImageLayerPosition(defaultImagePosition);

      setImageLayerScale(defaultImageScale);

      setAcrylicBlur(defaultAcrylicBlur);
      setAcrylicOpacity(defaultAcrylicOpacity);
      setAcrylicBrightness(defaultAcrylicBrightness);
      setTextureOpacity(defaultTextureOpacity);
      setAcrylicTopGap(defaultAcrylicTopGap);
      setAcrylicAnchorY(defaultAcrylicAnchorY);
      updateAnchorPreview(defaultAcrylicAnchorY);

      setModelUrl(null);

      setModelPreview(null);

      setPivot(defaultPivot);

      setModelOffset(defaultPivot);

      setModelScale(defaultScale);

      clearAdditionalPreviews();

      setAdditionalModels([]);

    } finally {

      setLoading(false);

    }

  }, [clearAdditionalPreviews, updateAnchorPreview]);



  useEffect(() => {

    void loadManifest();

    return () => {

      revokeUrl(backgroundBlobRef);

      revokeUrl(imageLayerBlobRef);

      revokeUrl(modelBlobRef);

      clearAdditionalPreviews();

    };

  }, [loadManifest, clearAdditionalPreviews]);

  useEffect(() => {
    const container = backgroundPreviewRef.current;
    if (!container) {
      return;
    }

    const measure = () => {
      updateAnchorPreview(acrylicAnchorY);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [acrylicAnchorY, backgroundPreview, updateAnchorPreview]);



  const handleBackgroundChange = (event: ChangeEvent<HTMLInputElement>) => {

    const file = event.target.files?.[0] ?? null;

    revokeUrl(backgroundBlobRef);

    setSuccess(null);

    setError(null);



    if (file) {

      const url = URL.createObjectURL(file);

      backgroundBlobRef.current = url;

      setBackgroundFile(file);

      setBackgroundPreview(url);

    } else {

      setBackgroundFile(null);

      setBackgroundPreview(backgroundUrl);

    }

  };



  const handleImageLayerChange = (event: ChangeEvent<HTMLInputElement>) => {

    const file = event.target.files?.[0] ?? null;

    revokeUrl(imageLayerBlobRef);

    setSuccess(null);

    setError(null);



    if (file) {

      const url = URL.createObjectURL(file);

      imageLayerBlobRef.current = url;

      setImageLayerFile(file);

      setImageLayerPreview(url);

      setImageLayerUrl(null);

    } else {

      setImageLayerFile(null);

      setImageLayerPreview(imageLayerUrl);

    }

  };



  const handleImageLayerPositionChange = (axis: keyof ImagePosition) => (event: ChangeEvent<HTMLInputElement>) => {

    const numericValue = clampPercentage(Number(event.target.value));

    setImageLayerPosition((prev) => ({

      ...prev,

      [axis]: numericValue,

    }));

    setSuccess(null);

    setError(null);

  };



  const handleImageLayerScaleChange = (event: ChangeEvent<HTMLInputElement>) => {

    const numericValue = clampImageScale(Number(event.target.value));

    setImageLayerScale(numericValue);

    setSuccess(null);

    setError(null);

  };



  const handleAcrylicBlurChange = (event: ChangeEvent<HTMLInputElement>) => {

    const numericValue = clampAcrylicBlur(Number(event.target.value));

    setAcrylicBlur(numericValue);

    setSuccess(null);

    setError(null);

  };

  const handleAcrylicOpacityChange = (event: ChangeEvent<HTMLInputElement>) => {

    const numericValue = clampAcrylicOpacity(Number(event.target.value));

    setAcrylicOpacity(numericValue);

    setSuccess(null);

    setError(null);

  };

  const handleAcrylicBrightnessChange = (event: ChangeEvent<HTMLInputElement>) => {

    const numericValue = clampAcrylicBrightness(Number(event.target.value));

    setAcrylicBrightness(numericValue);

    setSuccess(null);

    setError(null);

  };

  const handleTextureOpacityChange = (event: ChangeEvent<HTMLInputElement>) => {

    const numericValue = clampTextureOpacity(Number(event.target.value));

    setTextureOpacity(numericValue);

    setSuccess(null);

    setError(null);

  };

  const handleAcrylicTopGapChange = (event: ChangeEvent<HTMLInputElement>) => {

    const numericValue = clampAcrylicTopGap(Number(event.target.value));

    setAcrylicTopGap(numericValue);

    setSuccess(null);

    setError(null);

  };

  const handleAcrylicAnchorYChange = (event: ChangeEvent<HTMLInputElement>) => {

    const numericValue = clampAcrylicAnchor(Number(event.target.value));

    setAcrylicAnchorY(numericValue);

    updateAnchorPreview(numericValue);

    setSuccess(null);

    setError(null);

  };



  const handleModelChange = (event: ChangeEvent<HTMLInputElement>) => {

    const file = event.target.files?.[0] ?? null;

    revokeUrl(modelBlobRef);

    setSuccess(null);

    setError(null);



    if (file) {

      const url = URL.createObjectURL(file);

      modelBlobRef.current = url;

      setModelFile(file);

      setModelPreview(url);

      setPivot(defaultPivot);

      setModelOffset(defaultPivot);

      setModelScale(defaultScale);

    } else {

      setModelFile(null);

      setModelPreview(modelUrl);

    }

  };



  const handleAddAdditionalModel = () => {

    setSuccess(null);

    setError(null);

    const id = generateLocalId();

    setAdditionalModels((prev) => [

      ...prev,

      {

        id,

        kind: "new",

        url: null,

        file: undefined,

        previewUrl: null,

        label: "new-model.glb",

        offset: { ...defaultPivot },

        scale: defaultScale,

      },

    ]);

  };



  const handleAdditionalFileChange = (id: string, event: ChangeEvent<HTMLInputElement>) => {

    const file = event.target.files?.[0] ?? null;

    setSuccess(null);

    setError(null);



    const previousUrl = additionalBlobMapRef.current.get(id) ?? null;



    if (file) {

      if (previousUrl) {

        URL.revokeObjectURL(previousUrl);

      }

      const previewUrl = URL.createObjectURL(file);

      additionalBlobMapRef.current.set(id, previewUrl);



      setAdditionalModels((prev) =>

        prev.map((item) =>

          item.id === id

            ? {

                ...item,

                file,

                previewUrl,

                label: file.name,

              }

            : item,

        ),

      );

    } else {

      if (previousUrl) {

        URL.revokeObjectURL(previousUrl);

        additionalBlobMapRef.current.delete(id);

      }



      setAdditionalModels((prev) =>

        prev.map((item) =>

          item.id === id

            ? {

                ...item,

                file: undefined,

                previewUrl: item.url,

                label: item.url ? deriveFileLabel(item.url) : "new-model.glb",

              }

            : item,

        ),

      );

    }



    event.target.value = "";

  };



  const handleAdditionalOffsetChange = (id: string, axis: keyof Pivot, value: string) => {

    const trimmed = value.trim();

    if (trimmed.length === 0) {

      return;

    }

    const numericValue = Number(trimmed);

    setAdditionalModels((prev) =>

      prev.map((item) =>

        item.id === id

          ? {

              ...item,

              offset: {

                ...item.offset,

                [axis]: Number.isFinite(numericValue) ? numericValue : item.offset[axis],

              },

            }

          : item,

      ),

    );

  };



  const handleAdditionalScaleChange = (id: string, value: string) => {

    const trimmed = value.trim();

    if (trimmed.length === 0) {

      return;

    }

    const numericValue = Number(trimmed);

    setAdditionalModels((prev) =>

      prev.map((item) =>

        item.id === id

          ? {

              ...item,

              scale: Number.isFinite(numericValue) && numericValue > 0 ? numericValue : item.scale,

            }

          : item,

      ),

    );

  };



  const handleRemoveAdditionalModel = (id: string) => {

    setSuccess(null);

    setError(null);

    revokeAdditionalPreview(id);

    setAdditionalModels((prev) => prev.filter((entry) => entry.id !== id));

  };



  const handleOffsetChange = (event: ChangeEvent<HTMLInputElement>) => {

    const axis = event.target.name as keyof Pivot;

    const numericValue = Number(event.target.value);

    setModelOffset((prev) => ({

      ...prev,

      [axis]: Number.isFinite(numericValue) ? numericValue : prev[axis],

    }));

  };



  const handleClearImageLayer = () => {

    revokeUrl(imageLayerBlobRef);

    setImageLayerFile(null);

    setImageLayerPreview(null);

    setImageLayerUrl(null);

    setImageLayerPosition(defaultImagePosition);

    setImageLayerScale(defaultImageScale);

    setSuccess(null);

    setError(null);

  };



  const handleClearBackground = () => {

    revokeUrl(backgroundBlobRef);

    setBackgroundFile(null);

    setBackgroundPreview(null);

    setBackgroundUrl(null);

    setSuccess(null);

    setError(null);

  };



  const handleClearModel = () => {

    revokeUrl(modelBlobRef);

    setModelFile(null);

    setModelPreview(null);

    setModelUrl(null);

    setPivot(defaultPivot);

    setModelOffset(defaultPivot);

    setSuccess(null);

    setError(null);

  };



  const handleSave = async () => {

    setSaving(true);

    setSuccess(null);

    setError(null);

    try {

      const formData = new FormData();

      if (backgroundFile) {

        formData.append("backgroundFile", backgroundFile);

      }

      formData.append("backgroundUrl", backgroundFile ? "" : backgroundUrl ?? "");



      if (imageLayerFile) {

        formData.append("imageLayerFile", imageLayerFile);

      }

      formData.append("imageLayerUrl", imageLayerFile ? "" : imageLayerUrl ?? "");

      formData.append("imageLayerPosX", String(imageLayerPosition.x));

      formData.append("imageLayerPosY", String(imageLayerPosition.y));

      formData.append("imageLayerScale", String(imageLayerScale));

      formData.append("acrylicBlur", String(acrylicBlur));
      formData.append("acrylicOpacity", String(acrylicOpacity));

      formData.append("acrylicBrightness", String(acrylicBrightness));

      formData.append("acrylicTextureOpacity", String(textureOpacity));
      formData.append("acrylicTopGap", String(acrylicTopGap));

      formData.append("acrylicAnchorY", String(acrylicAnchorY));



      if (modelFile) {

        formData.append("modelFile", modelFile);

      }

      formData.append("modelUrl", modelFile ? "" : modelUrl ?? "");



      const additionalPayload = additionalModels.reduce<Array<Record<string, unknown>>>(

        (acc, item) => {

          const basePayload = {

            offset: item.offset,

            scale: item.scale,

          };



          if (item.file) {

            const fieldName = `additionalModelFile_${item.id}`;

            formData.append(fieldName, item.file);

            acc.push({ ...basePayload, kind: "new", fileField: fieldName });

          } else if (item.url) {

            acc.push({ ...basePayload, kind: "existing", url: item.url });

          }



          return acc;

        },

        [],

      );



      formData.append("additionalModelPayload", JSON.stringify(additionalPayload));



      formData.append("pivotX", String(pivot.x));

      formData.append("pivotY", String(pivot.y));

      formData.append("pivotZ", String(pivot.z));

      formData.append("offsetX", String(modelOffset.x));

      formData.append("offsetY", String(modelOffset.y));

      formData.append("offsetZ", String(modelOffset.z));

      formData.append("modelScale", String(modelScale));



      const response = await fetch("/api/admin/opening", {

        method: "POST",

        body: formData,

      });

      if (!response.ok) {

        throw new Error("Failed to save opening assets");

      }

      const data = (await response.json()) as ManifestResponse;

      setBackgroundUrl(data.backgroundUrl);

      setBackgroundPreview(data.backgroundUrl);

      setBackgroundFile(null);

      revokeUrl(backgroundBlobRef);



      setImageLayerUrl(data.imageLayerUrl);

      setImageLayerPreview(data.imageLayerUrl);

      setImageLayerFile(null);

      revokeUrl(imageLayerBlobRef);



      const position = sanitizeImagePositionFromResponse(data.imageLayerPosition);

      setImageLayerPosition(position);

      setImageLayerScale(sanitizeImageScaleFromResponse(data.imageLayerScale));

      setAcrylicBlur(sanitizeAcrylicBlurFromResponse(data.acrylicBlur));
      setAcrylicOpacity(sanitizeAcrylicOpacityFromResponse(data.acrylicOpacity));
      setAcrylicBrightness(sanitizeAcrylicBrightnessFromResponse(data.acrylicBrightness));
      setTextureOpacity(sanitizeTextureOpacityFromResponse(data.acrylicTextureOpacity));



      setModelUrl(data.modelUrl);

      setModelPreview(data.modelUrl);

      setModelFile(null);

      setPivot(data.pivot ?? defaultPivot);

      setModelOffset(data.modelOffset ?? defaultPivot);

      setModelScale(typeof data.modelScale === "number" && Number.isFinite(data.modelScale) ? data.modelScale : defaultScale);

      revokeUrl(modelBlobRef);



      clearAdditionalPreviews();

      setAdditionalModels(createAdditionalStateFromResponse(data));



      setSuccess("Opening assets saved.");

    } catch (err) {

      console.error(err);

      setError("Failed to save opening assets. Please try again.");

    } finally {

      setSaving(false);

    }

  };



  const hasAdditionalModels = additionalModels.length > 0;


  return (
    <div className="space-y-8 pb-8 pt-24">
      <div className="fixed right-6 top-6 z-50 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saving}
          className="inline-flex items-center rounded-lg bg-gray-900 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => void loadManifest()}
          disabled={loading || saving}
          className="inline-flex items-center rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400"
        >
          Reload from Server
        </button>
      </div>
      <header>

        <h1 className="text-2xl font-semibold text-gray-900">Opening Assets</h1>

        <p className="mt-2 text-sm text-gray-600">

          Upload a background image and GLB model that will appear on the opening screen.

        </p>

      </header>



      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

        <h2 className="text-lg font-semibold text-gray-900">Background Image</h2>

        <p className="mt-1 text-sm text-gray-500">JPEG, PNG or WEBP formats (up to 4K) are recommended.</p>

        <div className="mt-4 space-y-4">

          <input

            type="file"

            accept="image/png,image/jpeg,image/webp"

            onChange={handleBackgroundChange}

            disabled={loading || saving}

            className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-gray-800"

          />

          {backgroundPreview ? (

            <div
              ref={backgroundPreviewRef}
              className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-inner"
            >

              <img src={backgroundPreview} alt="Background preview" className="h-[28rem] w-full object-cover" />

              <div className="pointer-events-none absolute inset-0">

                <div

                  className="absolute left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_0_2px_rgba(255,255,255,0.9)]"

                  style={{ top: `${anchorPreviewPercent}%` }}

                  aria-hidden

                />

              </div>

            </div>

          ) : (

            <p className="text-sm text-gray-400">No background preview available.</p>

          )}

          <div className="mt-4 space-y-2">
            <label className="flex flex-col gap-2 text-sm text-gray-600">
              <span className="font-medium text-gray-700">Minimum top gap ({acrylicTopGap}px)</span>
              <input
                type="range"
                min={0}
                max={600}
                value={acrylicTopGap}
                onChange={handleAcrylicTopGapChange}
                disabled={loading || saving}
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm"
                  value={acrylicTopGap}
                  min={0}
                  max={2000}
                  onChange={handleAcrylicTopGapChange}
                  disabled={loading || saving}
                />
                <span className="text-xs text-gray-500">px kept above acrylic panel</span>
              </div>
            </label>
          </div>

          <div className="mt-4 space-y-2">
            <label className="flex flex-col gap-2 text-sm text-gray-600">
              <span className="font-medium text-gray-700">Acrylic anchor Y ({acrylicAnchorY}px)</span>
              <input
                type="range"
                min={0}
                max={backgroundSourceHeight}
                value={acrylicAnchorY}
                onChange={handleAcrylicAnchorYChange}
                disabled={loading || saving}
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm"
                  value={acrylicAnchorY}
                  min={0}
                  max={backgroundSourceHeight}
                  onChange={handleAcrylicAnchorYChange}
                  disabled={loading || saving}
                />
                <span className="text-xs text-gray-500">px from top of source image ({backgroundSourceHeight}px)</span>
              </div>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">

            <button

              type="button"

              onClick={handleClearBackground}

              disabled={loading || saving || (!backgroundUrl && !backgroundFile)}

              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400"

            >

              Remove Background

            </button>

          </div>

        </div>

      </section>



      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

        <h2 className="text-lg font-semibold text-gray-900">Image Layer</h2>

        <p className="mt-1 text-sm text-gray-500">

          This image appears between the fixed background and the acrylic overlay.

        </p>

        <div className="mt-4 space-y-4">

          <input

            type="file"

            accept="image/png,image/jpeg,image/webp"

            onChange={handleImageLayerChange}

            disabled={loading || saving}

            className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-gray-800"

          />

          {imageLayerPreview ? (

            <div className="grid gap-6 md:grid-cols-2">

              <div className="space-y-2">

                <div

                  className="overflow-hidden border border-gray-200 bg-gray-100 shadow-inner"

                  style={{ maxWidth: acrylicPreviewMaxWidth, marginInline: "auto" }}

                >

                  <div

                    className="w-full"

                    style={{

                      aspectRatio: acrylicPreviewAspectRatio,
                      backgroundImage: `url(${imageLayerPreview})`,
                      backgroundSize: `${imageLayerScale}% auto`,
                      backgroundPosition: `${imageLayerPosition.x}% ${imageLayerPosition.y}%`,
                      backgroundRepeat: "no-repeat",
                    }}




                  />



                </div>

                <p className="text-center text-xs text-gray-500">Position preview</p>

              </div>

              <div className="space-y-2">

                <div

                  className="relative overflow-hidden border border-gray-200 bg-gray-100 shadow-inner"

                  style={{ maxWidth: acrylicPreviewMaxWidth, marginInline: "auto", borderRadius: "0px" }}

                >

                  <div
                    className="relative w-full"
                    style={{
                      aspectRatio: acrylicPreviewAspectRatio,
                      backgroundImage: `url(${imageLayerPreview})`,
                      backgroundSize: `${imageLayerScale}% auto`,
                      backgroundPosition: `${imageLayerPosition.x}% ${imageLayerPosition.y}%`,
                      backgroundRepeat: "no-repeat",
                    }}
                  >
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backdropFilter: `blur(${acrylicBlur}px) saturate(120%)`,
                        WebkitBackdropFilter: `blur(${acrylicBlur}px) saturate(120%)`,
                        background: `rgba(255, 255, 255, ${acrylicOpacity})`,
                        border: "1px solid rgba(255, 255, 255, 0.25)",
                        boxShadow:
                          "0 20px 40px rgba(0, 0, 0, 0.22), inset 0 0 14px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
                        borderRadius: "0px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: "url('/textures/acrylic_highres_texture.png') center / cover no-repeat",
                          opacity: textureOpacity,
                          mixBlendMode: "overlay",
                        }}
                      />
                      {acrylicBrightness > 0 ? (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: "rgba(255, 255, 255, 1)",
                            mixBlendMode: "screen",
                            opacity: acrylicBrightness,
                          }}
                        />
                      ) : null}
                      {acrylicBrightness < 0 ? (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: "rgba(0, 0, 0, 1)",
                            mixBlendMode: "multiply",
                            opacity: Math.abs(acrylicBrightness),
                          }}
                        />
                      ) : null}
                    </div>
                  </div>

                </div>

                <p className="text-center text-xs text-gray-500">Blurred preview</p>

              </div>

            </div>

          ) : (

            <p className="text-sm text-gray-400">No image layer preview available.</p>

          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">

            <label className="flex flex-col gap-2 text-sm text-gray-600">

              <span className="font-medium text-gray-700">Horizontal position ({imageLayerPosition.x}%)</span>

              <input

                type="range"

                min={0}

                max={100}

                value={imageLayerPosition.x}

                onChange={handleImageLayerPositionChange("x")}

                disabled={loading || saving}

              />

            </label>

            <label className="flex flex-col gap-2 text-sm text-gray-600">

              <span className="font-medium text-gray-700">Vertical position ({imageLayerPosition.y}%)</span>

              <input

                type="range"

                min={0}

                max={100}

                value={imageLayerPosition.y}

                onChange={handleImageLayerPositionChange("y")}

                disabled={loading || saving}

              />

            </label>

            <label className="flex flex-col gap-2 text-sm text-gray-600">

              <span className="font-medium text-gray-700">Scale ({imageLayerScale}%)</span>

              <input

                type="range"

                min={10}

                max={400}

                value={imageLayerScale}

                onChange={handleImageLayerScaleChange}

                disabled={loading || saving}

              />

            </label>

            <label className="flex flex-col gap-2 text-sm text-gray-600">

              <span className="font-medium text-gray-700">Acrylic blur ({acrylicBlur}px)</span>

              <input

                type="range"

                min={0}

                max={80}

                value={acrylicBlur}

                onChange={handleAcrylicBlurChange}

                disabled={loading || saving}

              />

            </label>

            <label className="flex flex-col gap-2 text-sm text-gray-600">

              <span className="font-medium text-gray-700">Acrylic brightness ({acrylicBrightness.toFixed(2)})</span>

              <input

                type="range"

                min={-1}

                max={1}

                step={0.01}

                value={acrylicBrightness}

                onChange={handleAcrylicBrightnessChange}

                disabled={loading || saving}

              />

            </label>

            <label className="flex flex-col gap-2 text-sm text-gray-600">

              <span className="font-medium text-gray-700">Acrylic opacity ({acrylicOpacity.toFixed(2)})</span>

              <input

                type="range"

                min={0}
                max={1}

                step={0.01}

                value={acrylicOpacity}

                onChange={handleAcrylicOpacityChange}

                disabled={loading || saving}

              />

            </label>

            <label className="flex flex-col gap-2 text-sm text-gray-600">

              <span className="font-medium text-gray-700">Texture intensity ({textureOpacity.toFixed(2)})</span>

              <input

                type="range"

                min={0}

                max={1}

                step={0.01}

                value={textureOpacity}

                onChange={handleTextureOpacityChange}

                disabled={loading || saving}

              />

            </label>


          </div>

          <div className="flex flex-wrap gap-2">

            <button

              type="button"

              onClick={handleClearImageLayer}

              disabled={loading || saving || (!imageLayerUrl && !imageLayerFile)}

              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400"

            >

              Remove Image Layer

            </button>

          </div>

        </div>

      </section>



      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

        <h2 className="text-lg font-semibold text-gray-900">GLB Model</h2>

        <p className="mt-1 text-sm text-gray-500">Upload a .glb file; the model will render in the center of the opening scene.</p>

        <div className="mt-4 space-y-4">

          <input

            type="file"

            accept=".glb"

            onChange={handleModelChange}

            disabled={loading || saving}

            className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-gray-800"

          />

          {modelPreview ? (

            <div className="space-y-3">

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-4">

                <GlbViewer

                  url={modelPreview}

                  pivot={pivot}

                  modelOffset={modelOffset}

                  modelScale={modelScale}

                  className="w-full max-w-4xl aspect-[16/9]"

                  showPivotIndicator

                  showGuide

                  guideSize={{ width: 90, height: 60 }}

                />

              </div>


            </div>

          ) : (

            <p className="text-sm text-gray-400">Upload a GLB file to see the preview.</p>

          )}

          <div className="flex flex-wrap gap-2">

            <button

              type="button"

              onClick={handleClearModel}

              disabled={loading || saving || (!modelUrl && !modelFile)}

              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400"

            >

              Remove Model

            </button>

          </div>

        </div>



        <div className="mt-6 space-y-6">

          <button

            type="button"

            onClick={handleAddAdditionalModel}

            disabled={loading || saving}

            className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400"

          >

            Add GLB Model

          </button>



          {hasAdditionalModels ? (

            additionalModels.map((item, index) => {

              const viewerUrl = item.previewUrl ?? item.url;

              return (

                <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">

                  <div className="flex items-center justify-between gap-3">

                    <div className="min-w-0">

                      <h3 className="text-base font-semibold text-gray-900">Additional GLB Model {index + 1}</h3>

                      <p className="truncate text-sm text-gray-500">{item.label}</p>

                      {item.kind === "new" && item.file ? (

                        <p className="text-xs text-emerald-600">Not yet saved</p>

                      ) : null}

                    </div>

                    <button

                      type="button"

                      onClick={() => handleRemoveAdditionalModel(item.id)}

                      disabled={saving}

                      className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400"

                    >

                      Remove Model

                    </button>

                  </div>

                  <div className="mt-4 space-y-4">

                    <input

                      type="file"

                      accept=".glb"

                      onChange={(event) => handleAdditionalFileChange(item.id, event)}

                      disabled={loading || saving}

                      className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-gray-800"

                    />

                    {viewerUrl ? (

                      <div className="space-y-3">

                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-4">

                          <GlbViewer

                            url={viewerUrl}

                            pivot={pivot}

                            modelOffset={item.offset}

                            modelScale={item.scale}

                            className="w-full max-w-4xl aspect-[16/9]"

                            showPivotIndicator

                            showGuide

                            guideSize={{ width: 90, height: 60 }}

                          />

                        </div>


                      </div>

                    ) : (

                      <p className="text-sm text-gray-400">Upload a GLB file to see the preview.</p>

                    )}

                  </div>

                </div>

              );

            })

          ) : (

            <p className="text-sm text-gray-400">No additional GLB models added.</p>

          )}

        </div>

      </section>



      <div className="flex flex-wrap gap-3">

        <button

          type="button"

          onClick={handleSave}

          disabled={loading || saving}

          className="inline-flex items-center rounded-lg bg-gray-900 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"

        >

          {saving ? "Saving..." : "Save"}

        </button>

        <button

          type="button"

          onClick={() => void loadManifest()}

          disabled={loading || saving}

          className="inline-flex items-center rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-400"

        >

          Reload from Server

        </button>

      </div>



      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

    </div>

  );



}



function revokeUrl(ref: MutableRefObject<string | null>) {

  if (ref.current) {

    URL.revokeObjectURL(ref.current);

    ref.current = null;

  }

}



function generateLocalId() {

  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

}



function deriveFileLabel(url: string | null) {

  if (!url) {

    return "unnamed.glb";

  }

  try {

    const trimmed = url.trim();

    if (trimmed.length === 0) {

      return "unnamed.glb";

    }

    const segments = trimmed.split(/[\\/]/);

    return segments[segments.length - 1] || trimmed;

  } catch {

    return url;

  }

}



function createAdditionalStateFromResponse(data: ManifestResponse): AdditionalModelState[] {

  const models = Array.isArray(data.additionalModels)

    ? data.additionalModels

        .map((entry, index) => {

          const url = typeof entry?.url === "string" ? entry.url.trim() : "";

          if (!url) {

            return null;

          }

          const offsetSource = entry?.offset ?? entry?.modelOffset;

          const scaleSource = entry?.scale ?? entry?.modelScale;

          return {

            id: `existing-${index}`,

            kind: "existing" as const,

            url,

            file: undefined,

            previewUrl: url,

            label: deriveFileLabel(url),

            offset: sanitizePivotFromResponse(offsetSource),

            scale: sanitizeScaleFromResponse(scaleSource),

          } satisfies AdditionalModelState | null;

        })

        .filter((entry): entry is AdditionalModelState => Boolean(entry))

    : null;



  if (models && models.length > 0) {

    return models.map((entry) => ({ ...entry, offset: { ...entry.offset } }));

  }



  const fallbackUrls = Array.isArray(data.additionalModelUrls) ? data.additionalModelUrls : [];

  return fallbackUrls

    .map((value, index) => {

      const url = typeof value === "string" ? value.trim() : "";

      if (!url) {

        return null;

      }

      return {

        id: `existing-${index}`,

        kind: "existing" as const,

        url,

        file: undefined,

        previewUrl: url,

        label: deriveFileLabel(url),

        offset: { ...defaultPivot },

        scale: defaultScale,

      } satisfies AdditionalModelState | null;

    })

    .filter((entry): entry is AdditionalModelState => Boolean(entry));

}



function sanitizePivotFromResponse(value: unknown): Pivot {

  if (!value || typeof value !== "object") {

    return { ...defaultPivot };

  }

  const record = value as Record<string, unknown>;

  return {

    x: coerceNumber(record.x, defaultPivot.x),

    y: coerceNumber(record.y, defaultPivot.y),

    z: coerceNumber(record.z, defaultPivot.z),

  };

}



function sanitizeScaleFromResponse(value: unknown): number {

  const parsed = coerceNumber(value, defaultScale);

  return parsed > 0 ? parsed : defaultScale;

}



function sanitizeImagePositionFromResponse(value: ManifestResponse["imageLayerPosition"]): ImagePosition {

  const x = clampPercentage(coerceNumber(value?.x ?? defaultImagePosition.x, defaultImagePosition.x));

  const y = clampPercentage(coerceNumber(value?.y ?? defaultImagePosition.y, defaultImagePosition.y));

  return { x, y };

}



function sanitizeImageScaleFromResponse(value: ManifestResponse["imageLayerScale"]): number {

  const numeric = coerceNumber(value ?? defaultImageScale, defaultImageScale);

  return clampImageScale(numeric);

}



function sanitizeAcrylicBlurFromResponse(value: ManifestResponse["acrylicBlur"]): number {

  const numeric = coerceNumber(value ?? defaultAcrylicBlur, defaultAcrylicBlur);

  return clampAcrylicBlur(numeric);

}

function sanitizeAcrylicOpacityFromResponse(value: ManifestResponse["acrylicOpacity"]): number {
  const numeric = coerceNumber(value ?? defaultAcrylicOpacity, defaultAcrylicOpacity);
  return clampAcrylicOpacity(numeric);
}

function sanitizeAcrylicBrightnessFromResponse(value: ManifestResponse["acrylicBrightness"]): number {
  const numeric = coerceNumber(value ?? defaultAcrylicBrightness, defaultAcrylicBrightness);
  return clampAcrylicBrightness(numeric);
}

function sanitizeAcrylicTopGapFromResponse(value: ManifestResponse["acrylicTopGap"]): number {
  const numeric = coerceNumber(value ?? defaultAcrylicTopGap, defaultAcrylicTopGap);
  return clampAcrylicTopGap(numeric);
}

function sanitizeAcrylicAnchorYFromResponse(value: ManifestResponse["acrylicAnchorY"]): number {
  const numeric = coerceNumber(value ?? defaultAcrylicAnchorY, defaultAcrylicAnchorY);
  return clampAcrylicAnchor(numeric);
}

function sanitizeTextureOpacityFromResponse(value: ManifestResponse["acrylicTextureOpacity"]): number {

  const numeric = coerceNumber(value ?? defaultTextureOpacity, defaultTextureOpacity);

  return clampTextureOpacity(numeric);

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

    return defaultImageScale;

  }

  if (value < 10) {

    return 10;

  }

  if (value > 400) {

    return 400;

  }

  return value;

}



function clampAcrylicBlur(value: number): number {

  if (!Number.isFinite(value) || value < 0) {

    return defaultAcrylicBlur;

  }

  if (value > 80) {

    return 80;

  }

  return value;

}

function clampAcrylicOpacity(value: number): number {

  if (!Number.isFinite(value)) {

    return defaultAcrylicOpacity;

  }

  if (value < 0) {

    return 0;

  }

  if (value > 1) {

    return 1;

  }

  return value;

}

function clampAcrylicBrightness(value: number): number {

  if (!Number.isFinite(value)) {

    return defaultAcrylicBrightness;

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

    return defaultTextureOpacity;

  }

  if (value < 0) {

    return 0;

  }

  if (value > 1) {

    return 1;

  }

  return value;

}

function clampAcrylicTopGap(value: number): number {

  if (!Number.isFinite(value)) {

    return defaultAcrylicTopGap;

  }

  if (value < 0) {

    return 0;

  }

  if (value > 2000) {

    return 2000;

  }

  return value;

}

function clampAcrylicAnchor(value: number): number {

  if (!Number.isFinite(value)) {

    return defaultAcrylicAnchorY;

  }

  if (value < 0) {

    return 0;

  }

  if (value > 5000) {

    return 5000;

  }

  return value;

}



function coerceNumber(value: unknown, fallback: number): number {

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
