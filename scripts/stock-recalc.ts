// CODPATCH: stock recalc v1 — analyze order status history and compute stock deltas (dry-run by default)
// Usage examples:
//   tsx scripts/stock-recalc.ts --from=2025-01-01 --to=2025-12-31
//   tsx scripts/stock-recalc.ts --order=ord_123
//   tsx scripts/stock-recalc.ts --from=2025-08-01 --to=2025-08-31 --apply
//
// Notes:
// - v1은 "분석/리포트"에 집중합니다. (--apply 경로는 훅/도메인 규칙 확인 후 안전하게 채울 것)
// - 프로젝트 가이드 기준, 상태 변경 시 재고 Δ(±N)는 recordStatusChange 로직이 계산/기록됩니다.
//   여기서는 과거 이벤트를 재생성하지 않고, 이벤트 시퀀스를 재연산하여 "예상 Δ 합"을 출력합니다.

import prisma from "@/lib/prisma";
import { recordStatusChange } from "@/lib/orderEvents"; // --apply 경로에서만 사용 (v1에서는 호출 안 함)
import { createInterface } from "node:readline";

type Opts = { order?: string; from?: string; to?: string; apply?: boolean };

type OrderLike = {
  id: string;
  status: string;
  createdAt: Date;
  items?: { id: string; qty: number }[];
  events?: { id: string; createdAt: Date; fromStatus: string | null; toStatus: string; note?: string | null }[];
};

// 프로젝트 도메인 규칙: "소비 상태 집합" (해당 상태에 들어가면 재고 차감, 벗어나면 복원)
const CONSUME_STATES = new Set<string>(["PAID", "FULFILLED"]);

// 상태 전이에서 재고 방향을 계산: non-consume -> consume : -1, consume -> non-consume : +1, 그 외 0
function stockDeltaDirection(fromStatus: string | null | undefined, toStatus: string): -1 | 0 | 1 {
  const a = fromStatus ? CONSUME_STATES.has(fromStatus) : false;
  const b = CONSUME_STATES.has(toStatus);
  if (!a && b) return -1;
  if (a && !b) return 1;
  return 0;
}

// 주문 아이템 수량 합산
function totalQty(items: { qty: number }[] | undefined): number {
  if (!items || items.length === 0) return 0;
  return items.reduce((n, it) => n + (Number(it?.qty) || 0), 0);
}

// 인자 파싱
function parseArgs(argv: string[]): Opts {
  const args = argv.slice(2).join(" ");
  const get = (k: string) => args.match(new RegExp(`--${k}=([^\\s]+)`))?.[1];
  return {
    order: get("order"),
    from: get("from"),
    to: get("to"),
    apply: /--apply/.test(args),
  };
}

// DB에서 주문 + 아이템 + 이벤트 가져오기 (스키마 명칭은 프로젝트에 맞게 조정 필요)
async function fetchOrders(opts: Opts): Promise<OrderLike[]> {
  // 스키마 가정:
  // - prisma.order
  // - order.items[] { qty }
  // - order.events[] { fromStatus, toStatus, createdAt, note }
  // 필요 시 모델/필드명을 여기에 맞춰 수정하세요.
  const where: any = {};
  if (opts.order) where.id = opts.order;
  if (opts.from || opts.to) {
    where.createdAt = {};
    if (opts.from) where.createdAt.gte = new Date(opts.from);
    if (opts.to) where.createdAt.lte = new Date(opts.to);
  }

  try {
    const rows = await (prisma as any).order.findMany({
      where,
      include: {
        items: { select: { id: true, qty: true } },
        events: { select: { id: true, createdAt: true, fromStatus: true, toStatus: true, note: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return rows as OrderLike[];
  } catch (e) {
    console.error("[stock-recalc] prisma.order.findMany 실패 — 스키마 필드명을 점검하세요:", e);
    return [];
  }
}

// 이벤트 시퀀스를 재생성하여 "예상 재고 Δ" 계산
function computeOrderDelta(order: OrderLike) {
  const qty = totalQty(order.items);
  let sum = 0;
  const lines: string[] = [];
  const evts = (order.events || []).sort((a, b) => +a.createdAt - +b.createdAt);

  for (const ev of evts) {
    const dir = stockDeltaDirection(ev.fromStatus, ev.toStatus);
    const d = dir * qty;
    if (d !== 0) {
      sum += d;
      lines.push(
        `${ev.createdAt.toISOString()} | ${order.id} | ${ev.fromStatus ?? "-"} -> ${ev.toStatus} | Δ ${d} | note: ${ev.note ?? ""}`
      );
    }
  }
  return { qty, delta: sum, lines };
}

async function main() {
  const opts = parseArgs(process.argv);
  if (!opts.order && !opts.from && !opts.to) {
    console.log("Usage: tsx scripts/stock-recalc.ts [--order=<id>] [--from=YYYY-MM-DD --to=YYYY-MM-DD] [--apply]");
    process.exit(0);
  }

  console.log(`[stock-recalc] options: ${JSON.stringify(opts)}`);

  const orders = await fetchOrders(opts);
  if (!orders.length) {
    console.log("[stock-recalc] 대상 주문이 없습니다.");
    return;
  }

  let grand = 0;
  for (const ord of orders) {
    const { qty, delta, lines } = computeOrderDelta(ord);
    grand += delta;
    console.log(`\n# Order ${ord.id} — items=${qty}, computed Δ=${delta}`);
    for (const line of lines) console.log(line);
  }
  console.log(`\n== Grand Total Δ = ${grand}`);

  if (opts.apply) {
    // 안전장치: v1에서는 실제 적용을 막습니다. (도메인 규칙/테이블 명세 확정 후 열기)
    // 적용 로직 예시 (참고용, 주석 해제 전 반드시 도메인/락 전략 검토):
    // 1) product/variant 재고 테이블에 grand(또는 per-order/per-variant) 반영
    // 2) adminLog에 조정 내역 기록
    // 3) 필요한 경우 recordStatusChange를 호출해 타임라인 표준화
    console.warn("\n[stock-recalc] --apply 는 v1에서 비활성화되었습니다. dry-run 결과를 검토 후 적용 경로를 확정하세요.");
  }
}

main()
  .catch((e) => {
    console.error("[stock-recalc] 오류:", e);
    process.exit(1);
  })
  .finally(async () => {
    try { await prisma.$disconnect(); } catch {}
  });

// (선택) 대량 결과를 파일로 저장하고 싶다면, 다음 유틸을 사용하세요.
// async function askEnter(msg = "계속하려면 Enter") {
//   const rl = createInterface({ input: process.stdin, output: process.stdout });
//   return new Promise<void>((res) => rl.question(msg, () => { rl.close(); res(); }));
// }

