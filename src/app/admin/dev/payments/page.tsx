import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export default async function Page() {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { order: { select: { id: true, status: true, createdAt: true, totalAmount: true } } },
  });

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Payments (dev)</h1>
      <div className="grid gap-3">
        {payments.map((p) => (
          <div key={p.id} className="rounded-2xl border p-4">
            <div className="text-sm text-gray-600">{p.id}</div>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
              <div><span className="text-gray-500">주문</span> {p.order?.id}</div>
              <div><span className="text-gray-500">주문합계</span> {p.order?.totalAmount?.toLocaleString()} KRW</div>
              <div><span className="text-gray-500">결제금액</span> {p.amount.toLocaleString()} {p.currency}</div>
              <div><span className="text-gray-500">PG</span> {p.provider}</div>
              <div><span className="text-gray-500">상태</span> {p.status}</div>
              <div><span className="text-gray-500">생성</span> {format(p.createdAt, "yyyy-MM-dd HH:mm")}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
