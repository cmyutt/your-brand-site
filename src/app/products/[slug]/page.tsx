// src/app/products/[slug]/page.tsx
import prisma from '@/lib/prisma';
export const runtime = 'nodejs';

type Props = { params: { slug: string } };

export default async function ProductDetail({ params }: Props) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: { images: true, variants: true },
  });

  if (!product) return <main style={{ padding: 24 }}><h1>상품을 찾을 수 없습니다.</h1></main>;

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: '0 auto', display:'grid', gap:24, gridTemplateColumns:'1fr 1fr' }}>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.images[0]?.url ?? 'https://picsum.photos/seed/placeholder/800/1000'}
          alt={product.name}
          style={{ width:'100%', borderRadius:12, border:'1px solid #eee' }}
        />
        <div style={{ display:'flex', gap:8, marginTop:8 }}>
          {product.images.slice(1).map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={img.id} src={img.url} alt={img.alt ?? ''} style={{ width:88, height:88, objectFit:'cover', borderRadius:8, border:'1px solid #eee' }} />
          ))}
        </div>
      </div>
      <div>
        <h1 style={{ fontSize:28, fontWeight:700 }}>{product.name}</h1>
        <div style={{ fontSize:18, marginTop:8 }}>{product.price.toLocaleString()}원</div>
        <p style={{ marginTop:12, lineHeight:1.6 }}>{product.description ?? '설명 없음'}</p>

        <div style={{ marginTop:16 }}>
          <div style={{ fontWeight:600, marginBottom:8 }}>옵션</div>
          <ul style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {product.variants.map((v) => (
              <li key={v.id} style={{ padding:'8px 12px', border:'1px solid #ddd', borderRadius:8 }}>
                {v.name}{v.extra ? ` (+${v.extra.toLocaleString()}원)` : ''}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
