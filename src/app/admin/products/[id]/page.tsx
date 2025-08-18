// src/app/admin/products/[id]/page.tsx
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const runtime = 'nodejs';

// 숫자 파싱 유틸 (콤마 허용)
function parseIntSafe(v: FormDataEntryValue | null, def = 0) {
  const n = Number(String(v ?? '').replace(/[^\d-]/g, ''));
  return Number.isFinite(n) ? n : def;
}

/* ----------------------------- 서버 액션 ----------------------------- */

// 상품 기본정보 수정
async function updateProduct(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  const name = String(formData.get('name') || '').trim();
  const slug = String(formData.get('slug') || '').trim();
  const price = parseIntSafe(formData.get('price'), 0);
  const description = String(formData.get('description') || '').trim();
  const published = String(formData.get('published') || '') === 'true';

  if (!id || !name || !slug) throw new Error('id/name/slug 필요');

  await prisma.product.update({
    where: { id },
    data: {
      name,
      slug,
      price,
      description: description || null,
      published,
    },
  });

  revalidatePath(`/admin/products/${id}`);
}

// 이미지 추가
async function addImage(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  const url = String(formData.get('url') || '').trim();
  if (!id || !url) throw new Error('id/url 필요');

  const info = await prisma.product.findUnique({
    where: { id },
    select: { _count: { select: { images: true } } },
  });
  const sort = info?._count.images ?? 0;

  await prisma.product.update({
    where: { id },
    data: { images: { create: { url, sort } } },
  });

  revalidatePath(`/admin/products/${id}`);
}

// 이미지 삭제
async function deleteImage(formData: FormData) {
  'use server';
  const productId = String(formData.get('productId') || '');
  const imageId = String(formData.get('imageId') || '');
  if (!productId || !imageId) throw new Error('productId/imageId 필요');

  await prisma.product.update({
    where: { id: productId },
    data: { images: { delete: { id: imageId } } },
  });

  revalidatePath(`/admin/products/${productId}`);
}

// 옵션 추가
async function addVariant(formData: FormData) {
  'use server';
  const productId = String(formData.get('productId') || '');
  const name = String(formData.get('name') || '').trim() || 'Default';
  const stock = parseIntSafe(formData.get('stock'), 0);
  const extra = parseIntSafe(formData.get('extra'), 0);
  if (!productId) throw new Error('productId 필요');

  await prisma.product.update({
    where: { id: productId },
    data: { variants: { create: { name, stock, extra } } },
  });

  revalidatePath(`/admin/products/${productId}`);
}

// 옵션 수정
async function updateVariant(formData: FormData) {
  'use server';
  const productId = String(formData.get('productId') || '');
  const id = String(formData.get('id') || '');
  const name = String(formData.get('name') || '').trim();
  const stock = parseIntSafe(formData.get('stock'), 0);
  const extra = parseIntSafe(formData.get('extra'), 0);
  if (!productId || !id) throw new Error('productId/id 필요');

  await prisma.variant.update({
    where: { id },
    data: { name, stock, extra },
  });

  revalidatePath(`/admin/products/${productId}`);
}

// 옵션 삭제
async function deleteVariant(formData: FormData) {
  'use server';
  const productId = String(formData.get('productId') || '');
  const id = String(formData.get('id') || '');
  if (!productId || !id) throw new Error('productId/id 필요');

  await prisma.product.update({
    where: { id: productId },
    data: { variants: { delete: { id } } },
  });

  revalidatePath(`/admin/products/${productId}`);
}

/* ----------------------------- 페이지 ----------------------------- */

export default async function EditProductPage({
  // ✅ Next 15: params는 Promise
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sort: 'asc' } },
      variants: { orderBy: { name: 'asc' } },
    },
  });

  if (!product) {
    redirect('/admin/products');
  }

  return (
    <div style={{ maxWidth: 960, margin: '24px auto', display: 'grid', gap: 24 }}>
      {/* 내부 이동은 Link 사용 */}
      <Link href="/admin/products">← 목록으로</Link>
      <h1>상품 편집</h1>

      {/* 기본 정보 */}
      <form action={updateProduct} style={{ display: 'grid', gap: 8, border: '1px solid #eee', padding: 16, borderRadius: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>기본 정보</h2>
        <input type="hidden" name="id" value={product.id} />
        <input name="name" defaultValue={product.name} placeholder="name" required />
        <input name="slug" defaultValue={product.slug} placeholder="slug (영문/하이픈)" required />
        <input name="price" defaultValue={product.price} inputMode="numeric" placeholder="price (원, 숫자만/콤마 허용)" />
        <textarea name="description" defaultValue={product.description ?? ''} placeholder="description(optional)" />
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>Published</span>
          <select name="published" defaultValue={product.published ? 'true' : 'false'}>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </label>
        <div>
          <button type="submit">Save 기본정보</button>
        </div>
      </form>

      {/* 이미지 */}
      <section style={{ border: '1px solid #eee', padding: 16, borderRadius: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>이미지</h2>

        <ul style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
          {product.images.map((img) => (
            <li key={img.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <a href={img.url} target="_blank" rel="noreferrer">{img.url}</a>
              <small style={{ opacity: 0.6 }}>· sort {img.sort}</small>
              <form action={deleteImage}>
                <input type="hidden" name="imageId" value={img.id} />
                <input type="hidden" name="productId" value={product.id} />
                <button type="submit" style={{ background: '#fee', border: '1px solid #f88', padding: '4px 8px' }}>삭제</button>
              </form>
            </li>
          ))}
          {product.images.length === 0 && <li style={{ opacity: 0.7 }}>이미지 없음</li>}
        </ul>

        <form action={addImage} style={{ display: 'flex', gap: 8 }}>
          <input type="hidden" name="id" value={product.id} />
          <input name="url" placeholder="이미지 URL" style={{ flex: 1 }} />
          <button type="submit">이미지 추가</button>
        </form>
      </section>

      {/* 옵션(Variants) */}
      <section style={{ border: '1px solid #eee', padding: 16, borderRadius: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>옵션</h2>

        <ul style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
          {product.variants.map((v) => (
            <li key={v.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
              <form action={updateVariant} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="id" value={v.id} />
                <input name="name" defaultValue={v.name} placeholder="name" />
                <input name="stock" defaultValue={v.stock} inputMode="numeric" style={{ width: 100 }} placeholder="stock" />
                <input name="extra" defaultValue={v.extra} inputMode="numeric" style={{ width: 100 }} placeholder="extra(원)" />
                <button type="submit">Save</button>
              </form>
              <form action={deleteVariant}>
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="id" value={v.id} />
                <button type="submit" style={{ background: '#fee', border: '1px solid #f88', padding: '4px 8px' }}>삭제</button>
              </form>
            </li>
          ))}
          {product.variants.length === 0 && <li style={{ opacity: 0.7 }}>옵션 없음</li>}
        </ul>

        <form action={addVariant} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="hidden" name="productId" value={product.id} />
          <input name="name" placeholder="name (예: S)" />
          <input name="stock" inputMode="numeric" placeholder="stock" style={{ width: 100 }} />
          <input name="extra" inputMode="numeric" placeholder="extra(원)" style={{ width: 120 }} />
          <button type="submit">옵션 추가</button>
        </form>
      </section>
    </div>
  );
}
