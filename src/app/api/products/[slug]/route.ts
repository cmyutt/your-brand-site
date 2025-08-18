// src/app/api/products/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Prisma를 쓰므로 node 런타임을 강제
export const runtime = 'nodejs';

type Params = { slug: string };

export async function GET(
  _req: NextRequest,
  // ✅ Next.js 15 타입 규칙: params는 Promise 타입으로 받는다
  { params }: { params: Promise<Params> }
) {
  const { slug } = await params;

  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images: true,
        variants: { orderBy: { name: 'asc' } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    return NextResponse.json(product, { status: 200 });
  } catch (err) {
    console.error('[GET /api/products/[slug]]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
