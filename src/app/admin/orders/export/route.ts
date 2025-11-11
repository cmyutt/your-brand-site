// src/app/admin/orders/export/route.ts
import prisma from "@/lib/prisma";
import { OrderStatus, Prisma } from "@prisma/client";
import { getAdminActor } from "@/lib/actor";
import { recordAdminLog } from "@/lib/adminLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0; // ✅ 명시적으로 캐시 비활성화

/* ── helpers ─────────────────────────────────────────────────────── */
function csvEscape(v: unknown) {
  const s = v == null ? "" : String(v);
  const needs = /[",\n\r]/.test(s);
  const esc = s.replace(/"/g, '""');
  return needs ? `"${esc}"` : s;
}
function toKST(d: Date) {
  // KST는 DST 없음: 고정 +9시간
  const k = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${k.getUTCFullYear()}-${p(k.getUTCMonth() + 1)}-${p(k.getUTCDate())} ${p(
    k.getUTCHours()
  )}:${p(k.getUTCMinutes())}:${p(k.getUTCSeconds())}`;
}
function kStatus(s?: string | null) {
  switch (s) {
    case "PENDING": return "대기중";
    case "PAID": return "결제완료";
    case "FULFILLED": return "배송완료";
    case "CANCELED": return "취소됨";
    case "REFUNDED": return "환불됨";
    default: return s ?? "";
  }
}
function numOrUndef(v: string | null) {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? (n as number) : undefined;
}

/* ── 동적 컬럼 정의(화이트리스트) ─────────────────────────────────── */
const COLS = {
  orderId:        { header: "주문ID",               project: (o: any) => o.id },
  createdAtISO:   { header: "생성시간(ISO)",        project: (o: any) => o.createdAt?.toISOString?.() ?? "" },
  createdAtKST:   { header: "생성시간(KST)",        project: (o: any) => (o.createdAt ? toKST(o.createdAt) : "") },
  status:         { header: "상태",                 project: (o: any) => o.status ?? "" },
  statusKo:       { header: "상태(한글)",           project: (o: any) => kStatus(o.status) },
  customerName:   { header: "고객명",               project: (o: any) => o.customer?.name ?? "" },
  customerEmail:  { header: "고객이메일",           project: (o: any) => o.customer?.email ?? "" },
  itemsCount:     { header: "아이템수",             project: (o: any) => String(o.items?.length ?? 0) },
  totalAmount:    {
    header: "총액(원)",
    project: (o: any) => {
      const computed = (o.items ?? []).reduce((a: number, it: any) =>
        a + (Number(it.unitPrice ?? 0) * Number(it.qty ?? it.quantity ?? 0)), 0
      );
      return String(o.totalAmount ?? computed);
    },
  },
  lastStatusChangedKST: {
    header: "최근상태변경(KST)",
    project: (o: any) => (o.events?.[0]?.createdAt ? toKST(o.events[0].createdAt) : ""),
  },
  paymentInfo: {
    header: "결제정보",
    project: (o: any) => {
      const p = o.payment ?? null;
      const parts: string[] = [];
      if (p?.provider) parts.push(String(p.provider));
      if (p?.pg)       parts.push(String(p.pg));
      if (p?.status)   parts.push(String(p.status));
      return parts.join("/");
    },
  },
  itemsSummary: {
    header: "아이템 요약",
    project: (o: any) => {
      const items = o.items ?? [];
      if (!items.length) return "";
      return items
        .slice(0, 5)
        .map((it: any) => `${it.name ?? it.productName ?? ""} ×${it.qty ?? it.quantity ?? 0}`)
        .join(" · ");
    },
  },
} as const;

type ColKey = keyof typeof COLS;

function parseSelectedCols(sp: URLSearchParams): ColKey[] {
  const a = sp.getAll("cols");
  const b = (sp.get("cols") || "").split(",").map(s => s.trim()).filter(Boolean);
  const c = sp.getAll("cols[]");
  const merged = [...a, ...b, ...c];
  const def = Object.keys(COLS);
  const list = (merged.length ? merged : def).filter((k): k is ColKey => k in COLS);
  return Array.from(new Set(list)); // 중복 제거 + 순서 유지
}

function parseSelectedIds(sp: URLSearchParams): string[] {
  const a = sp.getAll("ids");
  const b = (sp.get("ids") || "").split(",").map(s => s.trim()).filter(Boolean);
  const c = sp.getAll("ids[]");
  return Array.from(new Set([...a, ...b, ...c])).filter(Boolean);
}

/* ── GET ─────────────────────────────────────────────────────────── */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const withBOM = searchParams.get("bom") === "1";
  const COL_KEYS = parseSelectedCols(searchParams);
  const IDS = parseSelectedIds(searchParams); // ✅ 선택된 주문 ID

  // 목록과 동일한 필터/정렬
  const statusParam = searchParams.get("status") || "";
  const q = (searchParams.get("q") || "").trim();
  const sort = (searchParams.get("sort") || "newest") as
    | "newest" | "oldest" | "status" | "amountAsc" | "amountDesc";
  const fromStr = searchParams.get("from") || "";
  const toStr = searchParams.get("to") || "";
  const minAmount = numOrUndef(searchParams.get("minAmount"));
  const maxAmount = numOrUndef(searchParams.get("maxAmount"));

  const createdAtRange: Prisma.DateTimeFilter | undefined = (() => {
    if (!fromStr && !toStr) return undefined;
    const gte = fromStr ? new Date(`${fromStr}T00:00:00.000Z`) : undefined;
    const lte = toStr ? new Date(`${toStr}T23:59:59.999Z`) : undefined;
    return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
  })();

  const amountFilter: Prisma.IntFilter | undefined =
    minAmount === undefined && maxAmount === undefined
      ? undefined
      : {
          ...(minAmount !== undefined ? { gte: minAmount } : {}),
          ...(maxAmount !== undefined ? { lte: maxAmount } : {}),
        };

  const where: Prisma.OrderWhereInput = {
    ...(IDS.length ? { id: { in: IDS } } : {}), // ✅ 선택 id 우선 필터
    ...(statusParam && Object.values(OrderStatus).includes(statusParam as OrderStatus)
      ? { status: statusParam as OrderStatus }
      : {}),
    ...(q
      ? {
          OR: [
            { id: { contains: q, mode: "insensitive" } },
            {
              customer: {
                OR: [
                  { email: { contains: q, mode: "insensitive" } },
                  { name:  { contains: q, mode: "insensitive" } },
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
      case "oldest": return { createdAt: "asc" };
      case "status": return { status: "asc" };
      case "amountAsc": return { totalAmount: "asc" };
      case "amountDesc": return { totalAmount: "desc" };
      case "newest":
      default: return { createdAt: "desc" };
    }
  })();

  // 파일명 (KST 날짜)
  const todayKST = toKST(new Date()).slice(0, 10).replace(/-/g, "");
  const filename = `orders_${todayKST}${IDS.length ? "_selected" : ""}.csv`;

  // 관리자 로그 (비차단)
  const actor = await getAdminActor();
  void recordAdminLog({
    targetType: "order",
    targetId: IDS.length ? IDS.join(",") : "*",
    action: "CSV_EXPORT",
    actor,
    note: `status=${statusParam || "-"}, q=${q || "-"}, from=${fromStr || "-"}, to=${toStr || "-"}, amount=[${minAmount ?? "-"},${maxAmount ?? "-"}], sort=${sort}; cols=${COL_KEYS.join("|")}; ids=${IDS.length}`,
    snapshot: {
      status: statusParam || null,
      q,
      from: fromStr || null,
      to: toStr || null,
      minAmount: minAmount ?? null,
      maxAmount: maxAmount ?? null,
      sort,
      cols: COL_KEYS,
      ids: IDS,
    },
  }).catch(() => {});

  // 스트리밍
  const encoder = new TextEncoder();
  const rawLimit = Number(searchParams.get("limit") ?? 1000);
  const take = Math.max(100, Math.min(5000, Number.isFinite(rawLimit) ? rawLimit : 1000)); // 안전 클램프
  let offset = 0;
  let first = true;

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (first) {
          first = false;
          if (withBOM) controller.enqueue(encoder.encode("\uFEFF"));

          // 1행: 조건 키
          controller.enqueue(encoder.encode(
            ["status","q","from","to","minAmount","maxAmount","sort","cols","ids"].join(",") + "\n"
          ));
          // 2행: 조건 값
          controller.enqueue(encoder.encode(
            [
              statusParam || "-",
              q || "-",
              fromStr || "-",
              toStr || "-",
              minAmount ?? "-",
              maxAmount ?? "-",
              sort,
              COL_KEYS.join(";"),
              IDS.join(";") || "-",
            ].map(csvEscape).join(",") + "\n"
          ));
          // 3행: 동적 헤더
          controller.enqueue(encoder.encode(
            (COL_KEYS as ColKey[]).map(k => csvEscape(COLS[k].header)).join(",") + "\n"
          ));
        }

        const rows = await prisma.order.findMany({
          where,
          orderBy: [orderBy, { id: "asc" }], // 안정 정렬
          skip: offset,
          take,
          include: {
            customer: { select: { name: true, email: true } },
            items:    { select: { name: true, qty: true, unitPrice: true } },
            events:   { orderBy: { createdAt: "desc" }, take: 1 },
            payment:  true,
          },
        });

        if (rows.length === 0) {
          controller.close();
          return;
        }

        let chunk = "";
        for (const o of rows as any[]) {
          const line = (COL_KEYS as ColKey[]).map(k => {
            try { return csvEscape(COLS[k].project(o)); } catch { return ""; }
          }).join(",");
          chunk += line + "\n";
        }

        offset += rows.length;
        controller.enqueue(encoder.encode(chunk));
      } catch {
        try { controller.close(); } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
