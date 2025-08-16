// src/app/admin/products/page.tsx
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
export const runtime = 'nodejs';

// 유틸: 숫자 정규화
function parsePrice(input: FormDataEntryValue | null) {
  const s = String(input ?? '').replace(/[^\d]/g, '');
  const n = parseInt(s || '0', 10);
  if (!Number.isFinite(n) || n < 0 || n > 2147483647) throw new Error('price는 0~2,147,483,647');
  return n;
}

/* ----------------------- 서버 액션 ----------------------- */

// 생성
async function createProduct(formData: FormData) {
  'use server';
  const name = String(formData.get('name') || '').trim();
  const slug = String(formData.get('slug') || '').trim();
  const price = parsePrice(formData.get('price'));
  const description = String(formData.get('description') || '').trim();
  const imagesRaw = String(formData.get('images') || '').trim();
  const variantsRaw = String(formData.get('variants') || '').trim();
  if (!name || !slug) throw new Error('name/slug 필요');

  const imageArr = imagesRaw.split('\n').map(s=>s.trim()).filter(Boolean).map((url,i)=>({ url, sort:i }));
  const variantArr = variantsRaw.split(',').map(s=>s.trim()).filter(Boolean).map(name=>({ name, stock:0, extra:0 }));

  await prisma.product.create({
    data: {
      name, slug, price, description: description || null,
      images: { create: imageArr },
      variants: { create: variantArr.length ? variantArr : [{ name:'Default', stock:0, extra:0 }] },
      published: true,
    },
  });
  revalidatePath('/admin/products');
}

// 삭제
async function deleteProduct(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  if (!id) throw new Error('id 필요');
  await prisma.product.delete({ where: { id } }); // onDelete: Cascade 전제
  revalidatePath('/admin/products');
}

// 인라인 가격 수정
async function updatePrice(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  const price = parsePrice(formData.get('price'));
  if (!id) throw new Error('id 필요');
  await prisma.product.update({ where: { id }, data: { price } });
  revalidatePath('/admin/products');
}

// 인라인 옵션 재고 수정 (첫 옵션만 예시)
async function updateFirstVariantStock(formData: FormData) {
  'use server';
  const productId = String(formData.get('productId') || '');
  const stockStr = String(formData.get('stock') || '').replace(/[^\d-]/g, '');
  const stock = parseInt(stockStr || '0', 10);
  if (!productId || !Number.isFinite(stock)) throw new Error('입력 확인');

  const v = await prisma.variant.findFirst({ where: { productId }, orderBy: { name: 'asc' } });
  if (!v) throw new Error('Variant 없음');
  await prisma.variant.update({ where: { id: v.id }, data: { stock } });

  revalidatePath('/admin/products');
}

// publish 토글
async function togglePublish(formData: FormData) {
  'use server';
  const id = String(formData.get('id') || '');
  const next = String(formData.get('next') || '') === 'true';
  if (!id) throw new Error('id 필요');
  await prisma.product.update({ where: { id }, data: { published: next } });
  revalidatePath('/admin/products');
}

/* ----------------------- 페이지 ----------------------- */

type SearchParams = { q?: string; page?: string; per?: string; only?: 'published'|'unpublished' };

export default async function AdminProducts({ searchParams }: { searchParams: SearchParams }) {
  const q = (searchParams.q ?? '').trim();
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const per = Math.min(50, Math.max(5, parseInt(searchParams.per ?? '10', 10) || 10));
  const only = searchParams.only;

  const where = {
    AND: [
      q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }] } : {},
      only === 'published' ? { published: true } : {},
      only === 'unpublished' ? { published: false } : {},
    ],
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { images: true, variants: { orderBy: { name: 'asc' } } },
      skip: (page - 1) * per,
      take: per,
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / per));

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* 검색/필터 */}
      <SearchBar />

      {/* 생성 폼 */}
      <form action={createProduct} style={{ display:'grid', gap:8, border:'1px solid #eee', padding:16, borderRadius:12 }}>
        <h2 style={{ fontSize:18, fontWeight:700 }}>상품 등록</h2>

        <input name="name" placeholder="name" required />
        <input name="slug" placeholder="slug (영문/하이픈)" required />

        <input name="price" type="text" inputMode="numeric" placeholder="price (원) — 199,000도 가능" title="숫자 또는 숫자+쉼표" required />

        <textarea name="description" placeholder="description(optional)" />
        <textarea name="images" placeholder={`이미지 URL(줄바꿈)\nhttps://picsum.photos/seed/a/800/1000`} rows={3} />
        <input name="variants" placeholder="옵션(콤마 구분) 예: S,M,L" />

        <button type="submit">Create</button>
      </form>

      {/* 목록 */}
      <div>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
          <h2 style={{ fontSize:18, fontWeight:700 }}>상품 목록 ({total})</h2>
          <small style={{opacity:0.7}}>{page}/{pages} pages · per {per}</small>
        </div>

        <ul style={{ display:'grid', gap:8 }}>
          {products.map(p => (
            <li key={p.id} style={{ border:'1px solid #eee', borderRadius:12, padding:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:12, alignItems:'center' }}>
                {/* left */}
                <div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <strong>{p.name}</strong>
                    <span style={{opacity:0.7}}>{p.slug}</span>
                    <span style={{opacity:0.7}}>· {p.published ? 'Published' : 'Draft'}</span>
                  </div>
                  <div style={{ opacity:0.7, marginTop:4 }}>
                    {p.images[0]?.url ? <a href={p.images[0].url} target="_blank">대표이미지</a> : '이미지 없음'} · 옵션 {p.variants.length}개
                  </div>
                </div>

                {/* right: actions */}
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <a href={`/admin/products/${p.id}`}>Edit</a>

                  {/* 인라인 가격 수정 */}
                  <form action={updatePrice} style={{ display:'flex', gap:4 }}>
                    <input type="hidden" name="id" value={p.id} />
                    <input name="price" defaultValue={p.price} inputMode="numeric" style={{width:100}} />
                    <button type="submit">Save ₩</button>
                  </form>

                  {/* 첫 옵션 재고 인라인 수정 (예시) */}
                  <form action={updateFirstVariantStock} style={{ display:'flex', gap:4 }}>
                    <input type="hidden" name="productId" value={p.id} />
                    <input name="stock" placeholder="stock" defaultValue={p.variants[0]?.stock ?? 0} inputMode="numeric" style={{width:80}} />
                    <button type="submit">Save 재고</button>
                  </form>

                  {/* publish 토글 */}
                  <form action={togglePublish}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="next" value={(!p.published).toString()} />
                    <button type="submit" style={{ padding:'4px 8px' }}>
                      {p.published ? 'Unpublish' : 'Publish'}
                    </button>
                  </form>

                  {/* 삭제 */}
                  <form action={deleteProduct}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" style={{ background:'#fee', border:'1px solid #f88', padding:'4px 8px' }}>
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* 페이지네이션 */}
        <Pagination total={total} page={page} per={per} />
      </div>
    </div>
  );
}

/* ----------------------- 클라이언트 컴포넌트 (검색/페이지 UI) ----------------------- */

function buildQS(q: Record<string,string|number|undefined>) {
  const u = new URLSearchParams();
  Object.entries(q).forEach(([k,v]) => {
    if (v !== undefined && v !== '') u.set(k, String(v));
  });
  return `?${u.toString()}`;
}

function Pagination({ total, page, per }: { total: number; page: number; per: number }) {
  const pages = Math.max(1, Math.ceil(total/per));
  const prev = Math.max(1, page-1);
  const next = Math.min(pages, page+1);
  return (
    <nav style={{ display:'flex', gap:8, marginTop:12 }}>
      <a href={buildQS({ page: prev, per })}>← Prev</a>
      <span style={{opacity:0.7}}>Page {page} / {pages}</span>
      <a href={buildQS({ page: next, per })}>Next →</a>
    </nav>
  );
}

function SearchBar() {
  return (
    <form action={(formData) => {
      'use server';
      const q = String(formData.get('q') || '');
      const only = String(formData.get('only') || '');
      const per = String(formData.get('per') || '');
      const qs = new URLSearchParams();
      if (q) qs.set('q', q);
      if (only) qs.set('only', only as any);
      if (per) qs.set('per', per);
      redirect(`/admin/products?${qs.toString()}`);
    }} style={{ display:'flex', gap:8 }}>
      <input name="q" placeholder="검색어 (name/slug)" />
      <select name="only" defaultValue="">
        <option value="">전체</option>
        <option value="published">Published만</option>
        <option value="unpublished">Draft만</option>
      </select>
      <select name="per" defaultValue="10">
        <option value="10">10개</option>
        <option value="20">20개</option>
        <option value="50">50개</option>
      </select>
      <button type="submit">검색</button>
    </form>
  );
}
