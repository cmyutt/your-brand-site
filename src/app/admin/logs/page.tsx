import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { buildAdminLogQuery, buildPageParam } from "@/lib/adminLogQuery";
import LogsLiveClient from "./LogsLiveClient";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { tOrderStatus } from "@/lib/labels";
import StatusChip from "@/components/StatusChip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function actionBadgeClass(action: string) {
  const a = action.toUpperCase();
  if (a.includes("DELETE") || a.includes("CANCEL")) return "bg-red-100 text-red-700";
  if (a.includes("CREATE") || a.includes("ADD")) return "bg-emerald-100 text-emerald-700";
  if (a.includes("UPDATE") || a.includes("CHANGE")) return "bg-amber-100 text-amber-800";
  return "bg-blue-100 text-blue-700";
}

/** 액션 한글 변환(저장은 영문 유지, 화면만 번역) */
function tAction(a: string) {
  switch (a) {
    case "ORDER_DELETED": return "주문 삭제";
    case "ORDER_STATUS_CHANGED": return "주문 상태 변경";
    case "ORDER_NOTE_ADDED": return "메모 추가";
    case "ORDER_BULK_STATUS_CHANGED": return "일괄 상태 변경";
    case "CSV_EXPORT": return "CSV 내보내기";
    default: return a;
  }
}

type Sp = Record<string, string | string[] | undefined>;

export default async function Page({ searchParams }: { searchParams: Promise<Sp> }) {
  // ✅ 페이지 접근 가드
  const jar = await cookies();
  const authed = jar.get("admin")?.value === "1";
  if (!authed) redirect("/admin/login?next=/admin/logs");

  const sp = await searchParams;
  const { where, orderBy, skip, take } = buildAdminLogQuery(sp);
  // 중복(감사용) 로그 제외: targetType=audit 이거나 action=ORDER_STATUS_CHANGE 인 항목 숨김
  const extraWhere: Prisma.AdminLogWhereInput = {
    NOT: {
      OR: [
        { targetType: "audit" },
        { action: "ORDER_STATUS_CHANGE" },
      ],
    },
  };

  const [logs, total] = await Promise.all([
    prisma.adminLog.findMany({
      where: { AND: [where, extraWhere] },
      orderBy,
      skip,
      take,
      select: { id: true, createdAt: true, actor: true, action: true, targetType: true, targetId: true, note: true, snapshot: true },
    }),
    prisma.adminLog.count({ where: { AND: [where, extraWhere] } }),
  ]);

  const page = Number.isFinite(Number(sp.page)) ? Number(sp.page) : 1;
  const per = Number.isFinite(Number(sp.per)) ? Number(sp.per) : 20;
  const totalPages = Math.max(1, Math.ceil(total / per));

  const getOne = (k: keyof Sp) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v ?? "";
  };
  const getMany = (k: keyof Sp) => {
    const v = sp[k];
    return Array.isArray(v) ? v : v ? String(v).split(",").map((s) => s.trim()).filter(Boolean) : [];
  };
  const currentQS = new URLSearchParams();
  (["from","to","actor","action","targetType","targetId","q","order","per"] as const).forEach((k) => {
    const vals = getMany(k);
    vals.forEach((val) => currentQS.append(k, val));
  });

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* ✅ 같은 브라우저/탭에서 발생한 이벤트를 듣고 자동 refresh */}
      <LogsLiveClient />

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">관리 로그</h1>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>총 <b>{total.toLocaleString()}</b>건 · 페이지 <b>{page}</b>/<b>{totalPages}</b></span>
          <Link
            href={`/admin/logs/export?${currentQS.toString()}`}
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 hover:bg-gray-50"
          >
            📤 Export CSV
          </Link>
        </div>
      </div>

      {/* 필터 */}
      <form method="GET" className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl ring-1 ring-gray-200 shadow-sm bg-white">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">From</label>
          <input type="date" name="from" defaultValue={String(getOne("from"))} className="rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">To</label>
          <input type="date" name="to" defaultValue={String(getOne("to"))} className="rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Actor</label>
          <input name="actor" placeholder="admin" defaultValue={String(getOne("actor"))} className="rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Action (comma)</label>
          <input name="action" placeholder="ORDER_DELETED,ORDER_CANCELLED" defaultValue={getMany("action").join(",")} className="rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Target Type (comma)</label>
          <input name="targetType" placeholder="order,product" defaultValue={getMany("targetType").join(",")} className="rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-600">Target ID (contains)</label>
          <input name="targetId" placeholder="order#xxxx" defaultValue={String(getOne("targetId"))} className="rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs text-gray-600">Keyword (actor/targetId)</label>
          <input name="q" placeholder="admin 또는 일부 ID" defaultValue={String(getOne("q"))} className="rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-3 gap-3 md:col-span-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600">Order</label>
            <select name="order" defaultValue={String(getOne("order") || "new")} className="rounded-lg border px-3 py-2 text-sm">
              <option value="new">최신순</option>
              <option value="old">오래된순</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600">Per</label>
            <select name="per" defaultValue={String(getOne("per") || "20")} className="rounded-lg border px-3 py-2 text-sm">
              {[20, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90">
              적용
            </button>
          </div>
        </div>
      </form>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-2xl ring-1 ring-gray-200 shadow-sm bg-white">
        <table className="min-w-full text-sm">
          <colgroup>
            <col className="w-[180px]" />
            <col className="w-[140px]" />
            <col className="w-[180px]" />
            <col />
          </colgroup>
        <thead className="bg-gray-50 sticky top-0 text-left">
            <tr className="border-b border-gray-200">
              <th className="px-4 py-2">시간</th>
              <th className="px-4 py-2">Actor</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-2 whitespace-nowrap font-mono text-xs text-gray-700">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2">{log.actor}</td>
                <td className="px-4 py-2">
                  {log.action === "ORDER_STATUS_CHANGED" ? (
                    <StatusChip status={String((log as any).snapshot?.to ?? "")} />
                  ) : (
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${actionBadgeClass(log.action)}`}>
                      {tAction(log.action)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-gray-700">
                  <span title={`${log.targetType}#${log.targetId}`} className="inline-block max-w-[520px] truncate align-middle">
                    {log.targetType}#{log.targetId}
                  </span>
                  {log.action === "ORDER_STATUS_CHANGED" && (
                    <span className="ml-2 align-middle font-sans text-[11px] text-gray-600">상태 변경</span>
                  )}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500">결과 없음</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {page > 1 && (
          <Link href={`?${buildPageParam(sp, page - 1).toString()}`} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
            ← Prev
          </Link>
        )}
        {(() => {
          const windowSize = 9;
          const start = Math.max(1, page - Math.floor(windowSize / 2));
          const end = Math.min(totalPages, start + windowSize - 1);
          const items: React.JSX.Element[] = [];
          for (let p = start; p <= end; p++) {
            const qs = buildPageParam(sp, p);
            items.push(
              <Link key={p} href={`?${qs.toString()}`}
                className={`rounded-lg border px-3 py-1.5 text-sm ${p === page ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"}`}>
                {p}
              </Link>
            );
          }
          return items;
        })()}
        {page < totalPages && (
          <Link href={`?${buildPageParam(sp, page + 1).toString()}`} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
            Next →
          </Link>
        )}
      </div>
    </div>
  );
}
