import "@/app/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Your Brand",
  description: "Your brand site built with Next.js",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // 최상위 레이아웃 <html> / <body> 렌더
  return (
    <html lang="ko">
      <head>
        {/* CODPATCH: 모바일 반응형 viewport 메타태그 추가 */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      {/* CODPATCH: 반응형 여백 + 넓이 확장 */}
      <body className="font-sans text-sm text-gray-900 bg-white">
        <div className="w-full max-w-screen-md md:max-w-screen-lg mx-auto px-4 md:px-8">{children}</div>
      </body>
    </html>
  );
}
