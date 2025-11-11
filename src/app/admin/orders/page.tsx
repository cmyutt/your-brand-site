// src/app/admin/orders/page.tsx
import Link from "next/link";
import prisma from "@/lib/prisma";
import { OrderStatus, Prisma } from "@prisma/client";
import DeleteOrderButton from "./DeleteOrderButton";
import FiltersBar from "./FiltersBar";
import { bulkDeleteOrders } from "./_bulkActions";
// transition handled via StatusButtons inline actions
// import RefreshOnSubmit from "@/components/RefreshOnSubmit";
import ExportCsvForm from "./ExportCsvForm";
import FormLiveHint from "@/components/FormLiveHint";

import StatusChip from "@/components/StatusChip";
import RowStatus from "./RowStatus";
import OrdersKeyboardNav from "./OrdersKeyboardNav";
import SelectionStickyBar from "./SelectionStickyBar";
import BulkStatusFormServer from "./BulkStatusFormServer";
import OrdersLiveClient from "./OrdersLiveClient";
import StatusButtons from "./StatusButtons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type SP = Record<string, string | string[] | undefined>;

function tStatus(s: OrderStatus) {
  switch (s) {
    case "PENDING": return "대기중";
    case "PAID": return "결제완료";
    case "FULFILLED": return "배송완료";
    case "CANCELED": return "취소됨";
    case "REFUNDED": return "환불됨";
    default: return s;
  }
}

function summarizeLastEvent(e?: {
  type: string;
  from: OrderStatus | null;
  to: OrderStatus | null;
  note: string | null;
}) {
  if (!e) return "이력 없음";
  if (e.type === "STATUS_CHANGED")
    return `상태 변경 (${tStatus(e.from as OrderStatus)} → ${tStatus(e.to as OrderStatus)})`;
  if (e.type === "NOTE") return `메모: ${e.note ?? ""}`;
  return e.type;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  // 접근 가드
  const jar = await cookies();
  const isAdmin = jar.get("admin")?.value === "1";
  if (!isAdmin) {
    redirect("/admin/login?next=/admin/orders");
  }

  const sp = await searchParams;

  const page = parseInt((typeof sp?.page === "string" ? sp.page : "1") ?? "1", 10) || 1;
  const perRaw = parseInt((typeof sp?.per === "string" ? sp.per : "10") ?? "10", 10) || 10;
  const per = Math.min(50, Math.max(5, perRaw));

  const s =
    typeof sp?.status === "string"
      ? ((sp.status as any) as OrderStatus | "")
      : "";
  const q = (typeof sp?.q === "string" ? sp.q.trim() : "") || "";
  const sort = (typeof sp?.sort === "string" ? sp.sort : "newest") as
    | "newest" | "oldest" | "status" | "amountAsc" | "amountDesc";
  const fromStr = typeof sp?.from === "string" ? sp.from : "";
  const toStr = typeof sp?.to === "string" ? sp.to : "";
  const minAmount = Number.isFinite(Number(sp?.minAmount)) ? Number(sp?.minAmount) : NaN;
  const maxAmount = Number.isFinite(Number(sp?.maxAmount)) ? Number(sp?.maxAmount) : NaN;

  const createdAtRange: Prisma.DateTimeFilter | undefined = (() => {
    if (!fromStr && !toStr) return undefined;
    const gte = fromStr ? new Date(`${fromStr}T00:00:00.000Z`) : undefined;
    const lte = toStr ? new Date(`${toStr}T23:59:59.999Z`) : undefined;
    return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
  })();

  const amountFilter: Prisma.IntFilter | undefined = (() => {
    const gte = Number.isFinite(minAmount) ? (minAmount as number) : undefined;
    const lte = Number.isFinite(maxAmount) ? (maxAmount as number) : undefined;
    if (gte === undefined && lte === undefined) return undefined;
    return { ...(gte !== undefined ? { gte } : {}), ...(lte !== undefined ? { lte } : {}) };
  })();

  const where: Prisma.OrderWhereInput = {
    ...(s && Object.values(OrderStatus).includes(s as OrderStatus) ? { status: s as OrderStatus } : {}),
    ...(q
      ? {
          OR: [
            { id: { contains: q, mode: "insensitive" } },
            {
              customer: {
                OR: [
                  { email: { contains: q, mode: "insensitive" } },
                  { name: { contains: q, mode: "insensitive" } },
                ],
              },
            },
          ],
        }
      : {}),
    ...(createdAtRange ? { createdAt: createdAtRange } : {}),
    ...(amountFilter ? { totalAmount: amountFilter } : {}),
  };

  const orderBy: Prisma.OrderOrderByWithRelationInput = (() => {
    switch (sort) {
      case "oldest":     return { createdAt: "asc" };
      case "status":     return { status: "asc" };
      case "amountAsc":  return { totalAmount: "asc" };
      case "amountDesc": return { totalAmount: "desc" };
      case "newest":
      default:           return { createdAt: "desc" };
    }
  })();

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { name: true, email: true } },
        items:    { select: { unitPrice: true, qty: true } },
        _count:   { select: { items: true } },
        events:   { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy,
      skip: (page - 1) * per,
      take: per,
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / per));

  const qs = (params: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    if (s) u.set("status", s);
    if (per) u.set("per", String(per));
    if (q) u.set("q", q);
    if (sort) u.set("sort", sort);
    if (fromStr) u.set("from", fromStr);
    if (toStr) u.set("to", toStr);
    if (Number.isFinite(minAmount)) u.set("minAmount", String(minAmount));
    if (Number.isFinite(maxAmount)) u.set("maxAmount", String(maxAmount));
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") u.set(k, String(v));
    });
    return `?${u.toString()}`;
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* ✅ 실시간 갱신(SSE) 구독: orders:update 수신 시 router.refresh() */}
      <OrdersLiveClient topics={["orders:update"]} refreshDebounceMs={800} />

      {/* 상단 선택 스티키 바 (선택되면 노출) */}
      <SelectionStickyBar deleteFormId="bulkDeleteForm" />

      <h1 className="text-2xl font-semibold">주문 관리</h1>

      {/* 필터 바 */}
      <div className="rounded-2xl ring-1 ring-gray-200 shadow-sm bg-white p-4">
        <FiltersBar
          statuses={[
            { value: "PENDING", label: "대기중" },
            { value: "PAID", label: "결제완료" },
            { value: "FULFILLED", label: "배송완료" },
            { value: "CANCELED", label: "취소됨" },
            { value: "REFUNDED", label: "환불됨" },
          ]}
          perOptions={[10, 20, 50]}
        />
      </div>

      {/* CSV + 삭제/상태변경 서버 폼 (선택 스티키 바가 이 폼들을 사용) */}
      <div className="rounded-2xl ring-1 ring-gray-200 shadow-sm bg-white p-4">
        <ExportCsvForm searchParams={Promise.resolve(sp)} />
        <form id="bulkDeleteForm" action={bulkDeleteOrders}>
          <FormLiveHint />
        </form>
        <BulkStatusFormServer />
      </div>

      {/* 상단 요약 */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-600">
          총 {total.toLocaleString()}건
          {q ? ` · 검색어: "${q}"` : ""}
          {fromStr ? ` · 시작: ${fromStr}` : ""}
          {toStr ? ` · 종료: ${toStr}` : ""}
          {Number.isFinite(minAmount) ? ` · 최소금액: ${Number(minAmount).toLocaleString()}원` : ""}
          {Number.isFinite(maxAmount) ? ` · 최대금액: ${Number(maxAmount).toLocaleString()}원` : ""}
        </div>
      </div>

      {/* 목록 */}
      <ul className="grid gap-3">
        {orders.map((o) => {
          const computed = o.items.reduce((a, it) => a + it.unitPrice * it.qty, 0);
          const totalWon = (o as any).totalAmount ?? computed;
          const last = o.events?.[0];

          return (
            <li
              key={o.id}
              className="group rounded-2xl ring-1 ring-gray-200 shadow-sm bg-white p-4 space-y-3 focus-within:ring-blue-300 outline-none"
              tabIndex={-1}
              data-order-row="1"
            >
              {/* 헤더 라인 */}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="checkbox"
                  name="selectOrder"
                  data-order-id={o.id}
                  data-items={o._count.items}
                  data-total={totalWon}
                  aria-label="선택"
                  className="h-4 w-4 accent-black"
                />
                <strong className="font-semibold">#{o.id.slice(0, 8)}</strong>
                <span className="text-gray-600">{new Date(o.createdAt).toLocaleString()}</span>

                {/* 상태칩: 행 패치 반영 */}
                <RowStatus orderId={o.id} initialStatus={o.status} />
              </div>

              {/* 고객 라인 */}
              <div className="text-gray-800">
                {o.customer?.name || "guest"}
                {o.customer?.email ? " · " + o.customer.email : ""}
              </div>

              {/* 금액/요약 */}
              <div className="text-gray-800">
                아이템 {o._count.items}개 · 총액 {totalWon.toLocaleString()}원
              </div>
              <div className="text-xs text-gray-600">{summarizeLastEvent(last as any)}</div>

              {/* 액션들 */}
              <div className="flex flex-wrap items-center gap-2 opacity-70 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                {/* 행 전체 클릭 대신 명시적 링크 제공 */}
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                  title="상세 보기"
                >
                  상세
                </Link>

                <StatusButtons
                  orderId={o.id}
                  current={o.status}
                  totalQty={o.items.reduce((n, it) => n + it.qty, 0)}
                />

                <DeleteOrderButton orderId={o.id} />
              </div>
            </li>
          );
        })}
      </ul>

      {/* 페이지네이션 */}
      <nav className="flex items-center justify-center gap-2">
        <Link href={qs({ page: Math.max(1, page - 1) })} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
          ← 이전
        </Link>
        <span className="text-sm text-gray-600">{page} / {pages}</span>
        <Link href={qs({ page: Math.min(pages, page + 1) })} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
          다음 →
        </Link>
      </nav>

      {/* 키보드 쇼트컷 활성화 */}
      <OrdersKeyboardNav />
    </div>
  );
}
