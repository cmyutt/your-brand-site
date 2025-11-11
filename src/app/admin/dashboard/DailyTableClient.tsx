"use client";

import Link from "next/link";

export type DailyRow = {
  date: string;       // YYYY-MM-DD (KST)
  count: number;      // 주문수
  amount: number;     // 매출 합계
  href: string;       // 해당 날짜로 필터된 주문목록 링크
};

export default function DailyTableClient({ rows }: { rows: DailyRow[] }) {
  const fmt = (n: number) => n.toLocaleString();

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: "6px 4px" }}>
            날짜
          </th>
          <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: "6px 4px" }}>
            주문수
          </th>
          <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: "6px 4px" }}>
            매출
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ date, count, amount, href }) => (
          <tr key={date}>
            <td style={{ padding: "6px 4px" }}>
              <Link href={href} title={`${date} 주문 보기`} style={{ textDecoration: "underline" }}>
                {date}
              </Link>
            </td>
            <td style={{ padding: "6px 4px", textAlign: "right" }}>{fmt(count)}건</td>
            <td style={{ padding: "6px 4px", textAlign: "right" }}>{fmt(amount)}원</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
