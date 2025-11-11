// src/app/admin/orders/FiltersBar.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

type Opt = { value: string; label: string };

export default function FiltersBar({
  statuses,
  perOptions,
}: {
  statuses: Opt[];
  perOptions: number[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // ── 현재 값 읽기
  const status = sp.get("status") ?? "";
  const q = sp.get("q") ?? "";
  const sort = sp.get("sort") ?? "newest";
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const per = sp.get("per") ?? String(perOptions?.[0] ?? 10);

  // ── 로컬 상태(컨트롤드 인풋)
  const [loc, setLoc] = useState({
    status,
    q,
    sort,
    from,
    to,
    per,
  });

  const set = (patch: Partial<typeof loc>) => setLoc((v) => ({ ...v, ...patch }));

  // ── QS 병합 유틸
  const buildQS = useCallback(
    (patch: Partial<typeof loc>) => {
      const u = new URLSearchParams(sp.toString());
      const next = { ...loc, ...patch };
      Object.entries(next).forEach(([k, v]) => {
        if (!v) u.delete(k);
        else u.set(k, String(v));
      });
      u.delete("page"); // 필터 바꾸면 페이지 초기화
      return u.toString();
    },
    [sp, loc]
  );

  const apply = useCallback(
    (patch?: Partial<typeof loc>) => {
      const qs = buildQS(patch ?? {});
      router.replace(`${pathname}?${qs}`, { scroll: false });
    },
    [buildQS, pathname, router]
  );

  const clearDates = () => {
    apply({ from: "", to: "" });
    set({ from: "", to: "" });
  };

  // ── yyyy-mm-dd 헬퍼
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  // 퀵 버튼 날짜 계산
  const todayStr = useMemo(() => fmt(new Date()), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return fmt(d);
  }, []);
  const last7FromStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6); // 오늘 포함 7일
    return fmt(d);
  }, []);
  const last7ToStr = todayStr;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="grid grid-cols-1 gap-3 md:grid-cols-12"
    >
      {/* 검색어 */}
      <input
        className="md:col-span-4 rounded-xl border px-3 py-2 text-sm"
        placeholder="주문 ID / 이메일 / 이름"
        value={loc.q}
        onChange={(e) => set({ q: e.target.value })}
        name="q"
      />

      {/* 상태 */}
      <select
        className="md:col-span-2 rounded-xl border px-3 py-2 text-sm"
        value={loc.status}
        onChange={(e) => set({ status: e.target.value })}
        name="status"
      >
        <option value="">전체 상태</option>
        {statuses.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {/* 정렬 */}
      <select
        className="md:col-span-2 rounded-xl border px-3 py-2 text-sm"
        value={loc.sort}
        onChange={(e) => set({ sort: e.target.value })}
        name="sort"
      >
        <option value="newest">최신순</option>
        <option value="oldest">오래된순</option>
        <option value="status">상태</option>
        <option value="amountAsc">금액↑</option>
        <option value="amountDesc">금액↓</option>
      </select>

      {/* Per */}
      <select
        className="md:col-span-2 rounded-xl border px-3 py-2 text-sm"
        value={loc.per}
        onChange={(e) => set({ per: e.target.value })}
        name="per"
      >
        {perOptions.map((n) => (
          <option key={n} value={n}>
            {n}개
          </option>
        ))}
      </select>

      {/* 적용 버튼 */}
      <button
        type="submit"
        className="md:col-span-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
      >
        적용
      </button>

      {/* 날짜 범위 */}
      <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-3 flex items-center gap-2">
          <span className="text-sm text-gray-600">시작일</span>
          <input
            type="date"
            className="flex-1 rounded-xl border px-3 py-2 text-sm"
            value={loc.from}
            onChange={(e) => set({ from: e.target.value })}
            name="from"
          />
        </div>
        <div className="md:col-span-3 flex items-center gap-2">
          <span className="text-sm text-gray-600">종료일</span>
          <input
            type="date"
            className="flex-1 rounded-xl border px-3 py-2 text-sm"
            value={loc.to}
            onChange={(e) => set({ to: e.target.value })}
            name="to"
          />
        </div>

        {/* 퀵 버튼들 */}
        <div className="md:col-span-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              set({ from: todayStr, to: todayStr });
              apply({ from: todayStr, to: todayStr });
            }}
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
            title="오늘"
          >
            오늘
          </button>
          <button
            type="button"
            onClick={() => {
              set({ from: yesterdayStr, to: yesterdayStr });
              apply({ from: yesterdayStr, to: yesterdayStr });
            }}
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
            title="어제"
          >
            어제
          </button>
          <button
            type="button"
            onClick={() => {
              set({ from: last7FromStr, to: last7ToStr });
              apply({ from: last7FromStr, to: last7ToStr });
            }}
            className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
            title="최근 7일 (오늘 포함)"
          >
            최근 7일
          </button>

          <button
            type="button"
            onClick={clearDates}
            className="ml-2 rounded-xl border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            title="날짜 지우기"
          >
            지우기
          </button>
        </div>
      </div>
    </form>
  );
}
