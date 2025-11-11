// src/app/admin/orders/ExportCsvForm.tsx
import type { ReactNode } from "react";
import ExportCsvToggle from "./ExportCsvToggle";
import CsvExportButton from "./CsvExportButton"; // ✅ 버튼은 클라 컴포넌트로 분리

const ALL_COLS = [
  { key: "orderId",               label: "주문ID" },
  { key: "createdAtISO",          label: "생성시간(ISO)" },
  { key: "createdAtKST",          label: "생성시간(KST)" },
  { key: "status",                label: "상태" },
  { key: "statusKo",              label: "상태(한글)" },
  { key: "customerName",          label: "고객명" },
  { key: "customerEmail",         label: "고객이메일" },
  { key: "itemsCount",            label: "아이템수" },
  { key: "totalAmount",           label: "총액(원)" },
  { key: "lastStatusChangedKST",  label: "최근상태변경(KST)" },
  { key: "paymentInfo",           label: "결제정보" },
  { key: "itemsSummary",          label: "아이템 요약" },
] as const;

// ✅ 기본 전체 체크
const DEFAULT_COLS = ALL_COLS.map((c) => c.key) as ReadonlyArray<string>;

function keepFilterHiddenInputs(sp: URLSearchParams) {
  const hidden: ReactNode[] = [];
  for (const [k, v] of sp.entries()) {
    // 이전 내보내기 선택이 다시 섞이지 않도록 cols 파라미터류는 제외
    if (k === "cols" || k === "cols[]") continue;
    hidden.push(<input key={`${k}:${v}`} type="hidden" name={k} value={v} />);
  }
  return hidden;
}

export default async function ExportCsvForm({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const spObj = await searchParams;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(spObj)) {
    if (Array.isArray(v)) v.forEach((vv) => sp.append(k, String(vv)));
    else if (v != null) sp.set(k, String(v));
  }

  return (
    <form action="/admin/orders/export" method="GET" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">CSV 컬럼 선택</div>
        <ExportCsvToggle />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {ALL_COLS.map((c) => {
          const checked = (DEFAULT_COLS as readonly string[]).includes(c.key);
          return (
            <label key={c.key} className="inline-flex items-center gap-2">
              <input type="checkbox" name="cols" value={c.key} defaultChecked={checked} />
              <span className="text-sm">{c.label}</span>
            </label>
          );
        })}
      </div>

      {/* 목록의 현재 필터를 그대로 전달 (선택 컬럼 파라미터는 제외) */}
      {keepFilterHiddenInputs(sp)}

      {/* Excel 한글/줄바꿈 안전 (BOM) */}
      <input type="hidden" name="bom" value="1" />

      <div className="flex items-center gap-2 pt-1">
        {/* ✅ onClick은 클라 컴포넌트인 CsvExportButton이 담당 */}
        <CsvExportButton>선택 컬럼으로 CSV 내보내기</CsvExportButton>

        {/* (옵션) 전체 기본 컬럼 다운로드 링크 */}
        <a
          href={`/admin/orders/export?${sp.toString()}&bom=1`}
          className="text-xs underline opacity-70"
          target="_blank"
          rel="noopener"
          title="기본(전체) 컬럼, Excel BOM 포함"
        >
          기본 컬럼(Excel 호환) 다운로드
        </a>
      </div>
    </form>
  );
}
