import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 필요시 캐싱 전략 조정
export const dynamic = 'force-dynamic';

/**
 * Next 15 표준 시그니처:
 * (req: Request, context: { params: { ... } })
 *  - 두 번째 인자에 커스텀 타입 별칭 금지 (이전 빌드 에러 원인)
 *  - any 사용 금지 (현재 빌드 에러 원인)
 */
export async function GET(_req: Request, context: { params: { slug: string } }) {
  const slug = context.params.slug;

  if (!slug) {
    return NextResponse.json({ error: 'missing slug' }, { status: 400 });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images: true,
        variants: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (err) {
    console.error('GET /api/products/[slug] error:', err);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
