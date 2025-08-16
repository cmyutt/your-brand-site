// src/app/admin/products/[id]/page.tsx
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
export const runtime = 'nodejs';

// 수정 저장
async function updateProduct(formData: FormData) {
  'use server';

  const id = String(formData.get('id') || '');
  const name = String(formData.get('name') || '').trim();
  const slug = String(formData.get('slug') || '').trim();

  // 가격 정규화 + 범위 검증
  const priceStr = String(formData.get('price') || '').replace(/[^\d]/g, '');
  const price = parseInt(priceStr || '0', 10);
  if (!id) throw new Error('id 필요');
  if (!name || !slug || !priceStr) throw new Error('name/slug/price 필요');
  if (!Number.isFinite(price) || price < 0 || price > 2147483647) {
    throw new Error('price는 0 ~ 2,147,483,647 사이의 정수여야 합니다.');
  }

  const description = String(formData.get('description') || '').trim();
  const imagesRaw = String(formData.get('images') || '').trim();
  const variantsRaw = String(formData.get('variants') || '').trim();

  // 간단히: 기존 이미지/옵션 삭제 후 재생성
  await prisma.productImage.deleteMany({ where: { productId: id } });
  await prisma.variant.deleteMany({ where: { productId: id } });

  const imageArr = imagesRaw
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .map((url, i) => ({ url, sort: i }));

  const variantArr = variantsRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(name => ({ name, stock: 0, extra: 0 }));

  await prisma.product.update({
    where: { id },
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
  redirect('/admin/products');
}

// 삭제 (onDelete: Cascade 전제)
async function deleteHere(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  if (!id) throw new Error('id 필요');

  await prisma.product.delete({ where: { id } });
  revalidatePath('/admin/products');
  redirect('/admin/products');
}

export default async function EditPage({ params }: { params: { id: string } }) {
  const p = await prisma.product.findUnique({
    where: { id: params.id },
    include: { images: true, variants: true },
  });
  if (!p) return notFound();

  return (
    <div style={{ maxWidth: 960, margin: '24px auto', padding: 16, display: 'grid', gap: 12 }}>
      <a href="/admin/products" style={{ display: 'inline-block', marginBottom: 12 }}>← Back</a>

      {/* 한 개의 form만 사용. Delete는 버튼의 formAction으로 실행 */}
      <form action={updateProduct} style={{ display: 'grid', gap: 8, border: '1px solid #eee', padding: 16, borderRadius: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>상품 수정</h2>

        <input type="hidden" name="id" defaultValue={p.id} />

        <input name="name" defaultValue={p.name} required />
        <input name="slug" defaultValue={p.slug} required />

        <input
          name="price"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          defaultValue={p.price}
          title="숫자만 입력"
          required
        />

        <textarea name="description" defaultValue={p.description ?? ''} />
        <textarea
          name="images"
          defaultValue={p.images.sort((a, b) => a.sort - b.sort).map(i => i.url).join('\n')}
          rows={4}
        />
        <input name="variants" defaultValue={p.variants.map(v => v.name).join(',')} />

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit">Save</button>
          {/* 중첩 form 대신 formAction으로 서버 액션 지정 */}
          <button type="submit" formAction={deleteHere} style={{ background: '#fee', border: '1px solid #f88', padding: '4px 8px' }}>
            Delete
          </button>
        </div>
      </form>
    </div>
  );
}
