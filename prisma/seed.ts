// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 재실행 대비 초기화 (관계 역순)
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();

  const woolCoat = await prisma.product.create({
    data: {
      name: 'Wool Coat',
      slug: 'wool-coat',
      description: 'Classic wool coat for winter',
      price: 200000,
      images: {
        create: [
          { url: 'https://picsum.photos/seed/coat1/800/1000' },
          { url: 'https://picsum.photos/seed/coat2/800/1000' },
        ],
      },
      variants: {
        create: [
          { name: 'M', stock: 10, extra: 0 },
          { name: 'L', stock: 5, extra: 10000 },
        ],
      },
    },
  });

  console.log('Seeded product:', woolCoat.name);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
