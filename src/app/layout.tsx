// src/app/layout.tsx
// (필요하면 전역 스타일을 여기서 임포트하세요)
// import './globals.css'

export const metadata = {
  title: 'Your Brand',
  description: 'Your brand site built with Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ 최상위 레이아웃만 <html> / <body>를 렌더링합니다.
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
