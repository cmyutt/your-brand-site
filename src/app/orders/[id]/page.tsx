import { prisma } from "@/lib/prisma";
import Link from "next/link";
import StatusBadge from "./StatusBadge";

type PageProps = {
  params: Promise<{ id: string }>; // Next 15: Promise로 받고 await
};

export default async function Page(props: PageProps) {
  const { id } = await props.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { select: { id: true, name: true, qty: true, unitPrice: true, subtotal: true } },
      customer: { select: { email: true, name: true } },
      payment: { select: { id: true, status: true, amount: true, currency: true } },
    },
  });

  if (!order) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">주문을 찾을 수 없어요.</h1>
        <Link className="underline mt-2 inline-block" href="/products">상품 목록으로</Link>
      </div>
    );
  }

  // 아이템의 합계(소계) 계산
  const subtotal = order.items.reduce(
    (s, it) => s + (it.subtotal ?? it.unitPrice * it.qty),
    0
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">주문 상세</h1>
        {/* 실시간 상태 배지 (5초 폴링) */}
        <StatusBadge orderId={order.id} initialStatus={order.status} />
      </div>

      <div className="rounded-2xl border p-4 grid gap-2 text-sm">
        <div>
          <span className="text-gray-500">주문 ID</span> {order.id}
        </div>
        <div>
          <span className="text-gray-500">고객</span>{" "}
          {order.customer?.email ?? "-"}{" "}
          {order.customer?.name ? `(${order.customer.name})` : ""}
        </div>
        <div>
          <span className="text-gray-500">총액</span> {subtotal.toLocaleString()} 원
        </div>
        {!!order.payment && (
          <div>
            <span className="text-gray-500">결제</span>{" "}
            #{order.payment.id} / {order.payment.status} /{" "}
            {order.payment.amount.toLocaleString()} {order.payment.currency}
          </div>
        )}
      </div>

      <div className="rounded-2xl border p-4">
        <h2 className="font-medium mb-2">아이템</h2>
        <div className="grid gap-2">
          {order.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between text-sm">
              <div>
                {it.name ?? ""} × {it.qty}
              </div>
              <div>
                {(it.subtotal ?? it.unitPrice * it.qty).toLocaleString()} 원
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between font-medium">
          <div>소계</div>
          <div>{subtotal.toLocaleString()} 원</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link className="rounded-2xl px-4 py-2 border shadow-sm" href={`/orders/${order.id}/pay`}>
          결제하기
        </Link>
        <Link className="rounded-2xl px-4 py-2 border shadow-sm" href={`/orders/${order.id}/result`}>
          결제 결과 보기
        </Link>
        <Link className="rounded-2xl px-4 py-2 border shadow-sm" href="/">
          홈
        </Link>
      </div>
    </div>
  );
}
