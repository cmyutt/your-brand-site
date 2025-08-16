// src/app/admin/products/page.tsx
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
export const runtime = 'nodejs';

// 생성
async function createProduct(formData: FormData) {
  'use server';

  const name = String(formData.get('name') || '').trim();
  const slug = String(formData.get('slug') || '').trim();

  // 가격: 숫자만 추출 → 정수 변환 → 범위 검증(Int32 한도)
  const priceStr = String(formData.get('price') || '').replace(/[^\d]/g, '');
  const price = parseInt(priceStr || '0', 10);

  if (!name || !slug || !priceStr) {
    throw new Error('name/slug/price 필요');
  }
  if (!Number.isFinite(price) || price < 0 || price > 2147483647) {
    throw new Error('price는 0 ~ 2,147,483,647 사이의 정수여야 합니다.');
  }

  const description = String(formData.get('description') || '').trim();
  const imagesRaw = String(formData.get('images') || '').trim();      // 줄바꿈 구분
  const variantsRaw = String(formData.get('variants') || '').trim();  // 콤마 구분

  const imageArr =
    imagesRaw
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .map((url, i) => ({ url, sort: i }));

  const variantArr =
    variantsRaw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(name => ({ name, stock: 0, extra: 0 }));

  await prisma.product.create({
    data: {
      name,
      slug,
      price,
      description: description || null,
      images: { create: imageArr },
      variants: { create: variantArr.length ? variantArr : [{ name: 'Default', stock: 0, extra: 0 }] },
    },
  });

  revalidatePath('/admin/products');
}

// 삭제 (스키마에서 onDelete: Cascade 설정했으면 한 줄이면 OK)
async function deleteProduct(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  if (!id) throw new Error('id 필요');

  await prisma.product.delete({ where: { id } });
  revalidatePath('/admin/products');
}

export default async function AdminProducts() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: { images: true, variants: true },
  });

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* 생성 폼 */}
      <form action={createProduct} style={{ display: 'grid', gap: 8, border: '1px solid #eee', padding: 16, borderRadius: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>상품 등록</h2>

        <input name="name" placeholder="name" required />
        <input name="slug" placeholder="slug (영문/하이픈)" required />

        {/* 숫자만 입력 유도 (콤마/원 등 입력해도 서버에서 정규화됨) */}
        <input
          name="price"
          type="text"
          inputMode="numeric"
          placeholder="price (원)"
          title="숫자만 입력"
          required
        />

        <textarea name="description" placeholder="description(optional)" />
        <textarea
          name="images"
          placeholder={`이미지 URL(줄바꿈)\nhttps://picsum.photos/seed/a/800/1000\nhttps://picsum.photos/seed/b/800/1000`}
          rows={3}
        />
        <input name="variants" placeholder="옵션(콤마 구분) 예: S,M,L" />

        <button type="submit" style={{ padding: '8px 12px' }}>Create</button>
      </form>

      {/* 목록 */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>상품 목록</h2>
        <ul style={{ display: 'grid', gap: 8 }}>
          {products.map((p) => (
            <li key={p.id} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ opacity: 0.7 }}>{p.slug} · {p.price.toLocaleString()}원</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={`/admin/products/${p.id}`}>Edit</a>
                  <form action={deleteProduct}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" style={{ background: '#fee', border: '1px solid #f88', padding: '4px 8px' }}>
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
