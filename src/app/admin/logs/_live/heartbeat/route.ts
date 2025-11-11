import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // 캐시 금지

export async function GET() {
  const latest = await prisma.adminLog.findFirst({
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  return new Response(
    JSON.stringify({
      lastId: latest?.id ?? null,
      lastCreatedAt: latest?.createdAt?.toISOString() ?? null,
    }),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
}
