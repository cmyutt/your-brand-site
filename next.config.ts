// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // next/image로 불러올 원격 이미지 호스트를 허용
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      // 필요하면 여기에 추가:
      // { protocol: 'https', hostname: 'images.unsplash.com' },
      // { protocol: 'https', hostname: 'your-cdn.example.com' },
    ],
  },
};

export default nextConfig;
