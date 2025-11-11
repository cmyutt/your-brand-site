import { prisma } from "@/lib/prisma";
import { initiatePayment } from "./actions";
import Link from "next/link";

type PageProps = {
  params: Promise<{ id: string }>; // Next 15 표준: Promise로 받고 await
};

export default async function Page(props: PageProps) {
  const { id } = await props.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { select: { id: true, name: true, unitPrice: true, qty: true, subtotal: true } },
      customer: { select: { email: true, name: true } },
      payment: { select: { id: true, status: true, amount: true } },
    },
  });

  if (!order) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">주문을 찾을 수 없어요.</h1>
        <Link className="underline mt-2 inline-block" href="/orders">주문 목록으로</Link>
      </div>
    );
  }

  const disabled = order.status !== "PENDING";

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">결제하기</h1>

      <div className="rounded-2xl border p-4 space-y-2">
        <div className="text-sm text-gray-600">주문 ID</div>
        <div className="text-base">{order.id}</div>

        <div className="grid gap-1 text-sm pt-2">
          <div><span className="text-gray-500">고객</span> {order.customer?.email ?? "-"} {order.customer?.name ? `(${order.customer.name})` : ""}</div>
          <div><span className="text-gray-500">상태</span> {order.status}</div>
          <div><span className="text-gray-500">총액</span> {order.totalAmount.toLocaleString()} 원</div>
          {order.payment && (
            <div><span className="text-gray-500">기존 결제</span> #{order.payment.id} / {order.payment.status}</div>
          )}
        </div>

        <div className="pt-4">
          <form action={async () => { "use server"; await initiatePayment(order.id); }}>
            <button
              type="submit"
              className="rounded-2xl px-4 py-2 border shadow-sm disabled:opacity-50"
              disabled={disabled}
            >
              {disabled ? "결제 불가 (상태 확인)" : "결제하기"}
            </button>
          </form>
        </div>

        <div className="pt-2">
          <Link className="underline text-sm" href={`/orders/${order.id}/result`}>결과 페이지 보기</Link>
        </div>
      </div>
    </div>
  );
}
