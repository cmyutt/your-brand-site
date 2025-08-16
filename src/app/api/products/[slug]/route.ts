import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

type Params = { params: { slug: string } };
export async function GET(_req: Request, { params }: Params) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: { images: true, variants: true },
  });
  if (!product) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return NextResponse.json(product);
}
