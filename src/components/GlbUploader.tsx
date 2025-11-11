"use client";

import { useState } from "react";
import GlbViewer from "./GlbViewer";

type Vector = {
  x: number;
  y: number;
  z: number;
};

type GuideSizeKey = "width" | "height";

export default function GlbUploader() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [pivot, setPivot] = useState<Vector>({ x: 0, y: 0, z: 0 });
  const [modelOffset, setModelOffset] = useState<Vector>({ x: 0, y: 0, z: 0 });
  const [modelScale, setModelScale] = useState(1);
  const [showGuide, setShowGuide] = useState(true);
  const [guideSize, setGuideSize] = useState<{ width: number; height: number }>({ width: 90, height: 60 });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileUrl(URL.createObjectURL(file));
    }
  };

  const handlePivotChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setPivot((prev) => ({
      ...prev,
      [name]: Number.isFinite(Number(value)) ? Number(value) : 0,
    }));
  };

  const handleOffsetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setModelOffset((prev) => ({
      ...prev,
      [name]: Number.isFinite(Number(value)) ? Number(value) : 0,
    }));
  };

  const handleScaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setModelScale(Number.isFinite(Number(event.target.value)) ? Number(event.target.value) : 1);
  };

  const handleGuideSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const key = name as GuideSizeKey;
    const numericValue = Number(value);

    setGuideSize((prev) => ({
      ...prev,
      [key]: Number.isFinite(numericValue) ? Math.min(100, Math.max(10, numericValue)) : prev[key],
    }));
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {!fileUrl ? (
        <input type="file" accept=".glb" onChange={handleFileChange} />
      ) : (
        <>
          <GlbViewer showZoomIndicator
            url={fileUrl}
            pivot={pivot}
            modelOffset={modelOffset}
            modelScale={modelScale}
            showPivotIndicator
            showGuide={showGuide}
            guideSize={guideSize}
            className="w-full max-w-4xl aspect-[16/9]"
          />
          <div className="flex flex-wrap justify-center gap-4">
            {(["x", "y", "z"] as const).map((axis) => (
              <label key={`pivot-${axis}`} className="flex flex-col text-sm">
                Pivot {axis.toUpperCase()}
                <input
                  type="number"
                  name={axis}
                  value={pivot[axis]}
                  onChange={handlePivotChange}
                  className="w-24 rounded border border-gray-300 px-2 py-1"
                />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {(["x", "y", "z"] as const).map((axis) => (
              <label key={`offset-${axis}`} className="flex flex-col text-sm">
                Offset {axis.toUpperCase()}
                <input
                  type="number"
                  name={axis}
                  value={modelOffset[axis]}
                  onChange={handleOffsetChange}
                  className="w-24 rounded border border-gray-300 px-2 py-1"
                />
              </label>
            ))}
            <label className="flex flex-col text-sm">
              Scale
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={modelScale}
                onChange={handleScaleChange}
                className="w-24 rounded border border-gray-300 px-2 py-1"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showGuide}
                onChange={(event) => setShowGuide(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Show guide overlay
            </label>
            <label className="flex flex-col text-sm">
              Guide width (%)
              <input
                type="number"
                step="1"
                min="10"
                max="100"
                name="width"
                value={guideSize.width}
                onChange={handleGuideSizeChange}
                className="w-24 rounded border border-gray-300 px-2 py-1"
              />
            </label>
            <label className="flex flex-col text-sm">
              Guide height (%)
              <input
                type="number"
                step="1"
                min="10"
                max="100"
                name="height"
                value={guideSize.height}
                onChange={handleGuideSizeChange}
                className="w-24 rounded border border-gray-300 px-2 py-1"
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
}
