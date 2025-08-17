import prisma from '@/lib/prisma';
import { addLine } from '@/lib/cart';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';

export const runtime = 'nodejs';

type PageProps = { params: { slug: string } };

export default async function ProductDetailPage({ params }: PageProps) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: {
      images: { orderBy: { sort: 'asc' } },
      variants: { orderBy: { name: 'asc' } },
    },
  });

  // 404 가드
  if (!product) notFound();

  // ✅ 여기서부터는 non-null 보장 변수 p 를 사용
  const p = product as NonNullable<typeof product>;

  /* ---------------- 서버 액션: 장바구니 담기 ---------------- */
  async function addToCart(formData: FormData) {
    'use server';
    const productId = p.id; // p 는 non-null
    const variantId = (formData.get('variantId') as string) || '';
    const qty = Math.max(1, parseInt(String(formData.get('qty') || '1'), 10) || 1);

    await addLine({ productId, variantId: variantId || null, qty });
    revalidatePath('/cart');
  }

  /* ------------------------------ UI ------------------------------ */
  return (
    <main style={{ maxWidth: 960, margin: '24px auto', display: 'grid', gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>{p.name}</h1>
      <div style={{ opacity: 0.7, marginTop: 4 }}>{p.slug}</div>
      <div style={{ fontSize: 18, marginTop: 12 }}>{p.price.toLocaleString()}원</div>

      {/* 이미지 */}
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        {p.images.length ? (
          p.images.map((img) => (
            <img
              key={img.url}
              src={img.url}
              alt=""
              style={{ width: 200, height: 200, objectFit: 'cover', borderRadius: 8 }}
            />
          ))
        ) : (
          <div style={{ opacity: 0.6 }}>이미지가 없습니다.</div>
        )}
      </div>

      {/* 담기 폼 */}
      <form action={addToCart} style={{ display: 'grid', gap: 8, maxWidth: 280 }}>
        {p.variants.length > 0 && (
          <label>
            옵션
            <select name="variantId" defaultValue={p.variants[0].id}>
              {p.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {typeof v.stock === 'number' ? ` (재고 ${v.stock})` : ''}
                  {v.extra ? ` / +${v.extra.toLocaleString()}원` : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        <label>
          수량
          <input
            name="qty"
            type="number"
            min={1}
            defaultValue={1}
            inputMode="numeric"
            style={{ width: 100 }}
          />
        </label>

        <button type="submit">장바구니 담기</button>
      </form>

      <div style={{ marginTop: 12 }}>
        <a href="/cart">장바구니 보러가기 →</a>
      </div>
    </main>
  );
}
