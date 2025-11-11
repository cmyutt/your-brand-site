import { prisma } from "@/lib/prisma";
import Link from "next/link";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page(props: PageProps) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const statusParam = typeof sp.status === "string" ? sp.status : undefined;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { payment: true, items: { select: { id: true, name: true, qty: true } } },
  });

  if (!order) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">주문을 찾을 수 없어요.</h1>
        <Link className="underline mt-2 inline-block" href="/orders">주문 목록으로</Link>
      </div>
    );
  }

  const banner = (() => {
    const s = statusParam ?? order.status;
    if (s === "PAID") return { tone: "border-green-500", text: "결제가 완료되었습니다." };
    if (s === "CANCELED") return { tone: "border-red-500", text: "결제가 실패/취소되었습니다." };
    return { tone: "border-yellow-500", text: "결제 대기 중입니다." };
  })();

  return (
    <div className="p-6 space-y-6">
      <div className={`rounded-2xl border-2 p-4 ${banner.tone}`}>
        <div className="text-lg font-medium">{banner.text}</div>
        <div className="text-sm text-gray-600 mt-1">주문 상태: {order.status} {order.payment ? `(결제: ${order.payment.status})` : ""}</div>
      </div>

      <div className="rounded-2xl border p-4 space-y-2">
        <div className="text-sm text-gray-600">주문 ID</div>
        <div className="text-base">{order.id}</div>
        <div className="text-sm"><span className="text-gray-500">총액</span> {order.totalAmount.toLocaleString()} 원</div>
        <div className="text-sm"><span className="text-gray-500">아이템</span> {order.items.length} 개</div>
      </div>

      <div className="flex gap-3">
        <Link className="rounded-2xl px-4 py-2 border shadow-sm" href={`/orders/${order.id}/pay`}>다시 결제 시도</Link>
        <Link className="rounded-2xl px-4 py-2 border shadow-sm" href="/orders">주문 목록</Link>
      </div>
    </div>
  );
}
