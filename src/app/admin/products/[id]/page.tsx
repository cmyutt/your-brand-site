import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';

export const runtime = 'nodejs';

type Variant = {
  id: string;
  name: string;
  stock: number | null;
  extra: number | null;
};

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: params.id },
    include: { variants: { orderBy: { name: 'asc' } }, images: true },
  });

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>옵션</h2>

      <ul style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        {product.variants.map((v: Variant) => (
          <li
            key={v.id}
            style={{ display: 'flex', gap: 8, alignItems: 'center' }}
          >
            <form action="/admin/products/update-variant" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="id" value={v.id} />
              <input name="name" placeholder="name" defaultValue={v.name || ''} />
              <input
                name="stock"
                inputMode="numeric"
                placeholder="stock"
                defaultValue={v.stock ?? 0}
                style={{ width: 100 }}
              />
              <input
                name="extra"
                inputMode="numeric"
                placeholder="extra(원)"
                defaultValue={v.extra ?? 0}
                style={{ width: 120 }}
              />
              <button type="submit">Save</button>
            </form>

            <form action="/admin/products/delete-variant">
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="id" value={v.id} />
              <button
                type="submit"
                style={{
                  background: '#fee',
                  border: '1px solid #f88',
                  padding: '4px 8px',
                }}
              >
                삭제
              </button>
            </form>
          </li>
        ))}
        {product.variants.length === 0 && (
          <li style={{ opacity: 0.7 }}>옵션 없음</li>
        )}
      </ul>

      {/* 새 옵션 추가 */}
      <form
        action="/admin/products/create-variant"
        style={{ display: 'flex', gap: 8, alignItems: 'center' }}
      >
        <input type="hidden" name="productId" value={product.id} />
        <input name="name" placeholder="name (예: S)" />
        <input
          name="stock"
          inputMode="numeric"
          placeholder="stock"
          defaultValue={0}
          style={{ width: 100 }}
        />
        <input
          name="extra"
          inputMode="numeric"
          placeholder="extra(원)"
          defaultValue={0}
          style={{ width: 120 }}
        />
        <button type="submit">옵션 추가</button>
      </form>
    </section>
  );
}
