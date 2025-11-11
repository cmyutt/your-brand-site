import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const now = await prisma.$queryRaw`select now()`;
  console.log('DB ok:', now);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('DB error:', e);
    process.exit(1);
  });

