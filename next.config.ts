// next.config.ts
import type { NextConfig } from "next";

const SUPABASE_HOST =
  process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : undefined;

const nextConfig: NextConfig = {
  // Disable ESLint during production builds (Vercel)
  eslint: {
    ignoreDuringBuilds: true,
  },

  serverExternalPackages: ["meshoptimizer"],

  images: {
    remotePatterns: [
      // Supabase Storage 공개 버킷 URL 허용
      ...(SUPABASE_HOST
        ? [
            {
              protocol: "https",
              hostname: SUPABASE_HOST,
              // 공개 버킷 경로 패턴
              pathname: "/storage/v1/object/public/**",
            } as const,
          ]
        : []),
      // 데모/기본 이미지 허용
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
