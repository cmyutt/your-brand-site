import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: { images: true, variants: true },
  });
  return NextResponse.json(products);
}
