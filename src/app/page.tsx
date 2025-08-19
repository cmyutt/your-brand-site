/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const revalidate = 0; // 항상 최신

type ProductWithImages = {
  id: string;
  slug: string;
  name: string;
  price: number;
  images: { url: string }[];
};

export default async function Home() {
  const products: ProductWithImages[] = await prisma.product.findMany({
    where: { published: true },                // ✅ 공개된 것만
    orderBy: { createdAt: 'desc' },
    include: {
      images: {
        select: { url: true },
        orderBy: { sort: 'asc' },
        take: 1,                               // 대표 이미지 1장
      },
    },
  });

  console.log('Home render products count:', products.length);

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Products</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.slug}`}
            style={{ border: '1px solid #eee', borderRadius: 12, padding: 12, textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{ aspectRatio: '4/5', overflow: 'hidden', borderRadius: 8, background: '#fafafa', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {p.images[0]?.url ? (
                <img src={p.images[0].url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : (
                <span>no image</span>
              )}
            </div>
            <div style={{ marginTop: 8, fontWeight: 600 }}>{p.name}</div>
            <div style={{ opacity: 0.7 }}>{p.price.toLocaleString()}원</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
