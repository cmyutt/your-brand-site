// src/app/products/[slug]/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { addLine } from '@/lib/cart';

export const runtime = 'nodejs';

type PageProps = { params: { slug: string } };

/** 장바구니 담기 (서버 액션) */
async function addToCart(formData: FormData) {
  'use server';
  const productId = String(formData.get('productId') || '');
  const rawVariant = String(formData.get('variantId') || '');
  const variantId = rawVariant ? rawVariant : null;

  const qty =
    Math.max(1, parseInt(String(formData.get('qty') || '1'), 10) || 1);

  if (!productId) throw new Error('productId가 없습니다.');
  await addLine({ productId, variantId, qty });

  // 담기 후 장바구니로 이동 (원하면 주석 처리하고 페이지 유지 가능)
  // import { redirect } from 'next/navigation' 가 필요
  // redirect('/cart');
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sort: 'asc' } },
      variants: { orderBy: { name: 'asc' } },
    },
  });

  if (!product || !product.published) notFound();

  const cover = product.images[0]?.url;

  return (
    <main style={{ maxWidth: 1040, margin: '24px auto', display: 'grid', gap: 24, gridTemplateColumns: '1fr 1fr' }}>
      {/* 좌측: 이미지 */}
      <section>
        {cover ? (
          <Image
            src={cover}
            alt={product.name}
            width={800}
            height={1000}
            style={{ width: '100%', height: 'auto', borderRadius: 12, objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', aspectRatio: '4/5', border: '1px dashed #ddd', borderRadius: 12, display: 'grid', placeItems: 'center', color: '#777' }}>
            이미지 없음
          </div>
        )}

        {/* 썸네일 */}
        <ul style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
          {product.images.map((img) => (
            <li key={img.id}>
              <Image
                src={img.url}
                alt={product.name}
                width={140}
                height={140}
                style={{ borderRadius: 8 }}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* 우측: 정보 + 장바구니 폼 */}
      <section>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>{product.name}</h1>
        <div style={{ opacity: 0.7, margin: '4px 0 12px' }}>{product.slug}</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
          {product.price.toLocaleString()}원
        </div>
        {product.description && (
          <p style={{ opacity: 0.8, marginBottom: 16 }}>{product.description}</p>
        )}

        {/* 옵션/재고 표시 */}
        {product.variants.length > 0 && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>옵션</h3>
            <ul style={{ marginBottom: 12 }}>
              {product.variants.map((v) => (
                <li key={v.id} style={{ opacity: 0.85 }}>
                  {v.name} · 재고 {v.stock ?? 0}개{v.extra ? ` · +${v.extra.toLocaleString()}원` : ''}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* ✅ 장바구니 담기 폼 */}
        <form action={addToCart} style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
          <input type="hidden" name="productId" value={product.id} />

          {product.variants.length > 0 ? (
            <select name="variantId" required>
              <option value="">옵션을 선택하세요</option>
              {product.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.extra ? ` (+${v.extra.toLocaleString()}원)` : ''}
                </option>
              ))}
            </select>
          ) : (
            // 옵션이 없다면 null을 명시적으로 보냄
            <input type="hidden" name="variantId" value="" />
          )}

          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 64 }}>수량</span>
            <input
              name="qty"
              type="number"
              inputMode="numeric"
              defaultValue={1}
              min={1}
              max={999}
              style={{ width: 100 }}
            />
          </label>

          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button type="submit" style={{ padding: '8px 12px' }}>
              장바구니 담기
            </button>
            <Link href="/cart" style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8 }}>
              장바구니 보기
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
