import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 선택: ISR/캐싱 전략을 명시하고 싶다면 사용
export const dynamic = 'force-dynamic'; // 또는 'force-static' / 'auto'

export async function GET(
  _req: Request,
  context: { params: { slug: string } }
) {
  const { slug } = context.params;

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
