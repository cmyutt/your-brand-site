import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 필요시 캐싱 전략 조정
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: any) {
  const slug = params?.slug as string | undefined;

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
