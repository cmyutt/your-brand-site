import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { OrderStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import RefreshOnSubmit from "@/components/RefreshOnSubmit";

import Timeline from "./_components/Timeline";
import AddNoteForm from "./_components/AddNoteForm";
import { transitionOrderStatus, deleteOrderDirect } from "./_actions";

// ✅ 상세에도 SSE 구독 추가
import OrdersLiveClient from "../OrdersLiveClient";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** 한글 상태 라벨 */
function kStatus(s: OrderStatus | string | null | undefined) {
  const map: Record<string, string> = {
    PENDING: "대기",
    PAID: "결제완료",
    FULFILLED: "배송완료",
    CANCELED: "취소",
    REFUNDED: "환불",
  };
  return s ? map[s] ?? s : "—";
}

/* 전이 규칙(클라 표시용: 서버와 동일) */
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  PENDING:   ["PAID","FULFILLED"],     // 취소/환불 불가
  PAID:      ["FULFILLED","CANCELED","REFUNDED"],
  FULFILLED: ["REFUNDED"],
  CANCELED:  ["PENDING"],
  REFUNDED:  ["PENDING"],
};
const ALL: OrderStatus[] = ["PENDING","PAID","FULFILLED","CANCELED","REFUNDED"];

// ✅ 서버와 동일한 “재고 소비 상태” 정의
const CONSUME = new Set<OrderStatus>(["PAID", "FULFILLED"]);

export default async function AdminOrderDetailPage(props: PageProps) {
  const { id } = await props.params;
  await props.searchParams;

  // 접근 가드
  const jar = await cookies();
  const isAdmin = jar.get("admin")?.value === "1";
  if (!isAdmin) {
    redirect(`/admin/login?next=${encodeURIComponent(`/admin/orders/${id}`)}`);
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, email: true } },
      items: {
        // ❗ Prisma 규칙상 select와 include 동시 사용 금지 → include만 사용
        include: {
          product: { select: { name: true, price: true } },
          variant: { select: { id: true, name: true } },
        },
      },
      events: { orderBy: { createdAt: "desc" } },
      payment: true,
    },
  });
  if (!order) notFound();

  const totalWon = order.items.reduce(
    (a, it) => a + ((it as any).subtotal ?? it.unitPrice * it.qty),
    0
  );

  const events = order.events.map((e) => ({
    id: e.id,
    type: (e.type as "STATUS_CHANGED" | "NOTE" | "WEBHOOK") ?? "NOTE",
    from: e.from ?? null,
    to: e.to ?? null,
    note: e.note ?? null,
    createdAt: e.createdAt,
    actor: e.actor ?? null,
    diff: (e as any).diff ?? null,
  }));

  const isTerminal = order.status === "CANCELED" || order.status === "REFUNDED";

  // ✅ 이 주문의 “재고 관리 대상(variant 존재)” 총 수량
  const consumableQty = order.items.reduce(
    (acc, it) => acc + (it.variant?.id ? it.qty : 0),
    0
  );

  // ✅ from→to에 따른 재고 delta (서버 액션 규칙과 동일)
  const deltaFor = (to: OrderStatus) => {
    const fromConsume = CONSUME.has(order.status as OrderStatus);
    const toConsume = CONSUME.has(to);
    if (!fromConsume && toConsume) return -consumableQty;
    if (fromConsume && !toConsume) return +consumableQty;
    return 0;
    // 소비↔소비이거나 동일 상태면 변화 없음
  };

  const formatDelta = (d: number) => (d === 0 ? "±0" : (d > 0 ? `+${d}` : String(d)));

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* ✅ SSE 구독: 다른 탭/사용자 변경사항 실시간 반영 */}
      <OrdersLiveClient topic="orders:update" refreshDebounceMs={300} />

      {/* 상단 바 */}
      <div className="flex items-center justify-between">
        <Link href="/admin/orders" className="text-sm text-gray-600 hover:text-gray-900">
          ← 주문 목록
        </Link>

        <form>
          <button
            formAction={deleteOrderDirect.bind(null, order.id)}
            data-confirm={`주문 #${order.id.slice(0, 8)} 을(를) 삭제할까요?\n삭제 후 복구할 수 없습니다.`}
            className="inline-flex items-center rounded-2xl px-3 py-2 text-sm font-medium ring-1 ring-red-300 text-red-700 hover:bg-red-50"
          >
            주문 삭제
          </button>
        </form>
      </div>

      {/* 요약 카드 */}
      <header className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="ring-1 ring-gray-200 rounded-2xl shadow-sm bg-white p-5">
          <h2 className="text-sm font-medium text-gray-700">주문</h2>
          <div className="mt-2 text-xl font-semibold">#{order.id.slice(0, 8)}</div>
          <div className="mt-1 text-sm text-gray-500">생성: {formatKST(order.createdAt)}</div>
          <div className="mt-1 text-sm text-gray-500">
            {order.customer?.name || "게스트"}
            {order.customer?.email ? ` · ${order.customer.email}` : ""}
          </div>
        </div>

        <div className="ring-1 ring-gray-200 rounded-2xl shadow-sm bg-white p-5">
          <h3 className="text-sm font-medium text-gray-700">상태</h3>
          <div className="mt-2 text-lg font-semibold">{kStatus(order.status)}</div>
          {isTerminal && (
            <div className="mt-2 text-xs inline-flex items-center gap-1 rounded px-2 py-1 ring-1 ring-amber-200 bg-amber-50 text-amber-800">
              종결 상태 • 환불↔취소 전환 불가, <strong className="ml-1">대기</strong>로만 되돌릴 수 있어요
            </div>
          )}
        </div>

        <div className="ring-1 ring-gray-200 rounded-2xl shadow-sm bg-white p-5">
          <h3 className="text-sm font-medium text-gray-700">결제/금액</h3>
          <div className="mt-2 text-lg font-semibold">
            ₩ {Number(totalWon).toLocaleString("ko-KR")}
          </div>
        </div>
      </header>

      {/* 아이템 */}
      <section className="ring-1 ring-gray-200 rounded-2xl shadow-sm bg-white p-5">
        <h2 className="text-base font-semibold">아이템</h2>
        <ul className="mt-4 space-y-3">
          {order.items.map((it) => {
            const line = (it as any).subtotal ?? it.unitPrice * it.qty;
            return (
              <li
                key={it.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-2 rounded-xl ring-1 ring-gray-100 p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-gray-900">{it.product.name}</strong>
                    {it.variant?.name && (
                      <span className="text-gray-500">· {it.variant.name}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {Number(it.unitPrice).toLocaleString("ko-KR")}원 × {it.qty}
                  </div>
                </div>
                <div className="text-right font-semibold">
                  {Number(line).toLocaleString("ko-KR")}원
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 text-right text-lg font-bold">
          합계 {Number(totalWon).toLocaleString("ko-KR")}원
        </div>
      </section>

      {/* 상태 전환 / 메모 */}
      <section className="ring-1 ring-gray-200 rounded-2xl shadow-sm bg-white p-5 space-y-3">
        <h2 className="text-base font-semibold">상태 전환 / 메모</h2>

        {/* 드롭다운: 불가 전이는 disabled + delta 힌트 표시 */}
        <form className="flex flex-wrap items-center gap-2">
          <RefreshOnSubmit />
          <input type="hidden" name="orderId" value={order.id} />
          <select
            name="to"
            defaultValue=""
            className="h-9 rounded-xl ring-1 ring-gray-200 bg-white px-2 text-sm text-gray-900"
            title="상태 변경 시 재고 변화량이 함께 표시됩니다"
          >
            <option value="" disabled>상태 변경…</option>
            {ALL.map((st) => {
              const disabled =
                st === (order.status as OrderStatus) ||
                !(ALLOWED[order.status as OrderStatus] ?? []).includes(st);
              const d = deltaFor(st);
              const label = `${kStatus(st)}${
                st === order.status
                  ? " (현재)"
                  : disabled
                  ? " (불가)"
                  : ` (${d > 0 ? "+" : d === 0 ? "±" : ""}${d})`
              }`;
              return (
                <option key={st} value={st} disabled={disabled} title={`재고 변화: ${d}`}>
                  {label}
                </option>
              );
            })}
          </select>
          <input
            name="note"
            placeholder="사유/메모 (선택)"
            className="h-9 rounded-xl ring-1 ring-gray-200 bg-white px-3 text-sm w-64"
          />
          <button
            formAction={transitionOrderStatus}
            className="h-9 rounded-2xl px-3 text-sm font-medium ring-1 ring-gray-300 hover:bg-gray-50"
            title="선택한 상태로 변경"
          >
            변경
          </button>
        </form>

        <AddNoteForm orderId={order.id} />
      </section>

      {/* 타임라인 */}
      <section className="ring-1 ring-gray-200 rounded-2xl shadow-sm bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">타임라인</h2>
        </div>
        <div className="mt-4">
          <Timeline events={events} />
        </div>
      </section>
    </div>
  );
}

function formatKST(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
