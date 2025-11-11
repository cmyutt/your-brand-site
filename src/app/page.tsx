/* eslint-disable @next/next/no-img-element */

import Link from "next/link";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import LogoutButton from "@/app/account/LogoutButton";
import AuthPanel from "@/components/AuthPanel";
import AnchoredAcrylicBackground from "@/components/AnchoredAcrylicBackground";
import OpeningOverlay from "@/components/OpeningOverlay";
import { readOpeningManifest } from "@/lib/openingManifest";

export const runtime = "nodejs";
export const revalidate = 0;

type ProductWithImages = {
  id: string;
  slug: string;
  name: string;
  price: number;
  images: { url: string }[];
};

export default async function Home() {
  const session = await getSession();
  const manifest = await readOpeningManifest();

  const products: ProductWithImages[] = await prisma.product.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    include: {
      images: {
        select: { url: true },
        orderBy: { sort: "asc" },
        take: 1,
      },
    },
  });

  return (
    <OpeningOverlay
      backgroundUrl={manifest.backgroundUrl}
      imageLayerUrl={manifest.imageLayerUrl}
      imageLayerPosition={manifest.imageLayerPosition}
      imageLayerScale={manifest.imageLayerScale}
      acrylicBlur={manifest.acrylicBlur}
      acrylicOpacity={manifest.acrylicOpacity}
      acrylicTextureOpacity={manifest.acrylicTextureOpacity}
      acrylicBrightness={manifest.acrylicBrightness}
      acrylicTopGap={manifest.acrylicTopGap}
      acrylicAnchorY={manifest.acrylicAnchorY}
      modelUrl={manifest.modelUrl}
      modelPivot={manifest.pivot}
      modelOffset={manifest.modelOffset}
      modelScale={manifest.modelScale}
      additionalModels={manifest.additionalModels}
    >
      <AnchoredAcrylicBackground
        backgroundImage={manifest.backgroundUrl}
        imageLayer={manifest.imageLayerUrl}
        imageLayerPosition={manifest.imageLayerPosition}
        imageLayerScale={manifest.imageLayerScale}
        acrylicBlur={manifest.acrylicBlur}
        acrylicOpacity={manifest.acrylicOpacity}
        acrylicTextureOpacity={manifest.acrylicTextureOpacity}
        acrylicBrightness={manifest.acrylicBrightness}
        anchorY={manifest.acrylicAnchorY}
        minTopGap={manifest.acrylicTopGap}
        backgroundMinHeight="100svh"
        horizontalPadding="100px"
        frameAlign="center"
        contentPadding="56px"
        className="mx-auto flex h-full w-full max-w-screen-lg flex-col gap-8"
        showAcrylic={false}
        showImageLayer
      >
        <main className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3" id="product-hero">
            <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
            {session ? (
              // @ts-expect-error client component usage
              <div className="flex items-center gap-2">
                <a
                  href="/account"
                  className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
                >
                  {"\uB9C8\uC774\uD398\uC774\uC9C0"}
                </a>
                <LogoutButton />
              </div>
            ) : (
              <AuthPanel />
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group flex flex-col overflow-hidden border border-gray-900/15 bg-transparent p-4 text-gray-900 shadow-[0_10px_26px_-18px_rgba(15,15,15,0.4)] transition duration-200 hover:-translate-y-1 hover:border-gray-900/25 hover:shadow-[0_26px_44px_-20px_rgba(10,10,10,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/60"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  {product.images[0]?.url ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs text-gray-400">No image</span>
                  )}
                </div>
                <div className="mt-3 text-sm font-semibold text-gray-900 md:text-base">{product.name}</div>
                <div className="text-sm text-gray-500 md:text-base">{product.price.toLocaleString()}{"\uC6D0"}</div>
              </Link>
            ))}
          </div>
        </main>
      </AnchoredAcrylicBackground>
    </OpeningOverlay>
  );
}



