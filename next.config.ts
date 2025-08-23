// next.config.ts
import type { NextConfig } from "next";

const SUPABASE_HOST =
  process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : undefined;

const nextConfig: NextConfig = {
  // ✅ Server Actions 업로드 허용 용량(예: 10MB)
  serverActions: {
    bodySizeLimit: "10mb",
  },

  images: {
    remotePatterns: [
      // ✅ Supabase Storage 퍼블릭 URL 허용
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
      // 데모/기타 이미지 도메인 (기존 유지)
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
