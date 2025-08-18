// src/app/products/[slug]/page.tsx
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export const runtime = 'nodejs';

// Next.js 15 규칙: params는 Promise 타입으로 받습니다.
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sort: 'asc' } },
      variants: { orderBy: { name: 'asc' } },
    },
  });

  if (!product) notFound();

  const cover = product.images[0]?.url;

  return (
    <main style={{ maxWidth: 960, margin: '24px auto', padding: '0 16px' }}>
      <nav style={{ marginBottom: 16 }}>
        <Link href="/">← 홈으로</Link>{' '}
        <Link href="/products" style={{ marginLeft: 8 }}>
          전체 상품
        </Link>
      </nav>

      <section style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr 1fr' }}>
        <div>
          {cover ? (
            <Image
              src={cover}
              alt={product.name}
              width={800}
              height={800}
              style={{ width: '100%', height: 'auto', borderRadius: 12, objectFit: 'cover' }}
              priority
            />
          ) : (
            <div
              style={{
                width: '100%',
                aspectRatio: '1/1',
                border: '1px solid #eee',
                borderRadius: 12,
                display: 'grid',
                placeItems: 'center',
                color: '#999',
              }}
            >
              이미지 없음
            </div>
          )}

          {/* 썸네일 목록 */}
          {product.images.length > 1 && (
            <ul style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {product.images.slice(0, 6).map((img) => (
                <li key={img.id}>
                  <Image
                    src={img.url}
                    alt={img.alt ?? product.name}
                    width={120}
                    height={120}
                    style={{ borderRadius: 8, objectFit: 'cover' }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h1 style={{ fontSize: 28, margin: '0 0 8px' }}>{product.name}</h1>
          <div style={{ opacity: 0.7, marginBottom: 8 }}>{product.slug}</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
            {product.price.toLocaleString()}원
          </div>
          {product.description && (
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{product.description}</p>
          )}

          {/* 옵션/재고 정보 */}
          {product.variants.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <strong>옵션</strong>
              <ul style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                {product.variants.map((v) => (
                  <li key={v.id} style={{ opacity: v.stock > 0 ? 1 : 0.6 }}>
                    {v.name} · 재고 {v.stock}개
                    {v.extra ? ` (추가금 ${v.extra.toLocaleString()}원)` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 장바구니 이동(이미 구현되어 있다면 링크만 노출) */}
          <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
            <Link
              href="/cart"
              style={{
                padding: '10px 14px',
                border: '1px solid #ddd',
                borderRadius: 8,
                textDecoration: 'none',
              }}
            >
              장바구니 보기
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
