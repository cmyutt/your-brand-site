import './globals.css';

export const metadata = {
  title: 'your-brand-site',
  description: 'Brand shop built with Next.js + Prisma + Supabase',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
