"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Vector3 } from "three";

export type GlbVector = {
  x: number;
  y: number;
  z: number;
};

type GlbViewerProps = {
  url: string;
  pivot: GlbVector;
  modelOffset?: GlbVector;
  modelScale?: number;
  className?: string;
  showPivotIndicator?: boolean;
  showGuide?: boolean;
  guideSize?: { width: number; height: number };
  showZoomIndicator?: boolean;
  maxZoom?: number;
};

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={clone} />;
}

function GuideOverlay({ width, height }: { width: number; height: number }) {
  const clamp = (value: number) => Math.min(Math.max(value, 0), 100);
  const sizePercent = clamp(Math.min(width, height));

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div
        className="border border-gray-400/80 bg-gray-200/10"
        style={{
          height: `${sizePercent}%`,
          aspectRatio: "1 / 1",
          maxWidth: "95%",
          boxShadow: "0 0 0 1px rgba(156, 163, 175, 0.35)",
        }}
      />
    </div>
  );
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function applyDistanceLimits(
  controls: OrbitControlsImpl,
  base: number,
  safeMaxZoom: number,
) {
  const minDist = Math.max(base / safeMaxZoom, 0.001);
  const maxDist = Math.max(base, minDist);
  controls.minDistance = minDist;
  controls.maxDistance = maxDist;
  return { minDist, maxDist };
}

const INITIAL_CAMERA_Z = 5;

function ZoomController({
  controlsRef,
  baseDistanceRef,
  tempVectorRef,
  safeMaxZoom,
  setZoomFactor,
}: {
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  baseDistanceRef: React.MutableRefObject<number | null>;
  tempVectorRef: React.MutableRefObject<Vector3>;
  safeMaxZoom: number;
  setZoomFactor: React.Dispatch<React.SetStateAction<number>>;
}) {
  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }

    const { object, target } = controls;
    const currentDistance = object.position.distanceTo(target);
    if (!Number.isFinite(currentDistance) || currentDistance <= 0) {
      return;
    }

    if (!baseDistanceRef.current || baseDistanceRef.current <= 0) {
      baseDistanceRef.current = currentDistance;
      applyDistanceLimits(controls, baseDistanceRef.current, safeMaxZoom);
      setZoomFactor(1);
      return;
    }

    const { minDist, maxDist } = applyDistanceLimits(controls, baseDistanceRef.current, safeMaxZoom);
    const clampedDistance = clampValue(currentDistance, minDist, maxDist);

    if (Math.abs(clampedDistance - currentDistance) > 1e-4) {
      tempVectorRef.current
        .copy(object.position)
        .sub(target)
        .normalize()
        .multiplyScalar(clampedDistance)
        .add(target);
      object.position.copy(tempVectorRef.current);
      controls.update();
    }

    const constrainedDistance = object.position.distanceTo(target);
    if (!Number.isFinite(constrainedDistance) || constrainedDistance <= 0) {
      return;
    }

    const ratio = baseDistanceRef.current / constrainedDistance;
    const clampedRatio = clampValue(ratio, 1, safeMaxZoom);
    setZoomFactor((prev) => (Math.abs(prev - clampedRatio) > 1e-3 ? clampedRatio : prev));
  });

  return null;
}

export default function GlbViewer({
  url,
  pivot,
  modelOffset,
  modelScale = 1,
  className,
  showPivotIndicator = false,
  showGuide = false,
  guideSize = { width: 90, height: 60 },
  showZoomIndicator = true,
  maxZoom = 3,
}: GlbViewerProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const baseDistanceRef = useRef<number | null>(null);
  const tempVectorRef = useRef(new Vector3());
  const [zoomFactor, setZoomFactor] = useState(1);
  const [pixelRatio, setPixelRatio] = useState(1);

  const offset = modelOffset ?? { x: 0, y: 0, z: 0 };
  const containerClass = className ? `relative ${className}` : "relative w-full aspect-[16/9]";
  const safeMaxZoom = Math.max(1, Math.min(maxZoom, 10));

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }

    controls.target.set(pivot.x, pivot.y, pivot.z);
    controls.update();
    baseDistanceRef.current = null;
  }, [pivot.x, pivot.y, pivot.z, url]);

  useEffect(() => {
    const updatePixelRatio = () => {
      if (typeof window === 'undefined') {
        return;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      setPixelRatio((prev) => (Math.abs(prev - dpr) > 1e-3 ? dpr : prev));
    };
    updatePixelRatio();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updatePixelRatio, { passive: true });
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', updatePixelRatio);
      }
    };
  }, []);

  const fallbackBase = baseDistanceRef.current && Number.isFinite(baseDistanceRef.current) && baseDistanceRef.current > 0
    ? baseDistanceRef.current
    : INITIAL_CAMERA_Z;
  const minDistanceProp = Math.max(fallbackBase / safeMaxZoom, 0.001);
  const maxDistanceProp = Math.max(fallbackBase, minDistanceProp);
  const progressPercent = safeMaxZoom > 1 ? ((zoomFactor - 1) / (safeMaxZoom - 1)) * 100 : 0;
  const guideHeightPercent = clampValue(guideSize?.height ?? 100, 0, 100);
  const barTop = `calc(50% + ${guideHeightPercent / 2}% + 12px)`;

  return (
    <div className={containerClass}>
      <Canvas
        camera={{ position: [0, 1, INITIAL_CAMERA_Z], fov: 50 }}
        shadows
        dpr={pixelRatio}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <group position={[pivot.x, pivot.y, pivot.z]}>
            <group position={[offset.x, offset.y, offset.z]} scale={modelScale}>
              <Model url={url} />
            </group>
          </group>

          {showPivotIndicator ? (
            <mesh position={[pivot.x, pivot.y, pivot.z]}>
              <sphereGeometry args={[0.05, 24, 24]} />
              <meshBasicMaterial color="#ef4444" toneMapped={false} depthTest={false} />
            </mesh>
          ) : null}

          <ambientLight intensity={0.6} />
          <directionalLight position={[6, 8, 6]} intensity={1.4} castShadow />
          <directionalLight position={[-6, 4, -6]} intensity={0.9} color="#b0d0ff" />
          <Environment preset="studio" />

          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.12}
            enablePan={false}
            zoomSpeed={1.8}
            minDistance={minDistanceProp}
            maxDistance={maxDistanceProp}
          />

          <ZoomController
            controlsRef={controlsRef}
            baseDistanceRef={baseDistanceRef}
            tempVectorRef={tempVectorRef}
            safeMaxZoom={safeMaxZoom}
            setZoomFactor={setZoomFactor}
          />
        </Suspense>
      </Canvas>

      {showGuide ? <GuideOverlay width={guideSize.width} height={guideSize.height} /> : null}

      {showZoomIndicator ? (
        <div className="pointer-events-none absolute left-1/2 w-56 -translate-x-1/2" style={{ top: barTop }}>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-150 ease-out"
              style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
