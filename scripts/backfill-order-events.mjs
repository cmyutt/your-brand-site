// scripts/backfill-order-events.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    include: { events: { take: 1 } },
  });

  let created = 0;
  for (const o of orders) {
    if (o.events.length === 0) {
      await prisma.orderEvent.create({
        data: {
          orderId: o.id,
          type: "SNAPSHOT",
          from: null,
          to: o.status,
          note: "backfill snapshot",
          actor: "system",
        },
      });
      created++;
    }
  }
  console.log(`Backfill done. Created ${created} snapshot event(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
