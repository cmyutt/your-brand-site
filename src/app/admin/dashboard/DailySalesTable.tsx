"use client";

type DayPoint = { date: string; amount: number; count: number };

type Props = {
  daily: DayPoint[];
  /** 주문목록 링크 구성에 사용할 매출 산정 대상 상태값들 */
  revenueStatuses: string[];
};

export default function DailySalesTable({ daily, revenueStatuses }: Props) {
  const fmt = (n: number) => n.toLocaleString();

  const dayLink = (dateStr: string) => {
    const u = new URLSearchParams();
    u.set("from", dateStr);
    u.set("to", dateStr);
    u.set("status", revenueStatuses.join(","));
    return `/admin/orders?${u.toString()}`;
  };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: "6px 4px" }}>날짜</th>
          <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: "6px 4px" }}>주문수</th>
          <th style={{ textAlign: "right", borderBottom: "1px solid #eee", padding: "6px 4px" }}>매출</th>
        </tr>
      </thead>
      <tbody>
        {daily.map(({ date, amount, count }) => (
          <tr
            key={date}
            onClick={() => (location.href = dayLink(date))}
            title={`${date} 주문 보기`}
            style={{ cursor: "pointer" }}
          >
            <td style={{ padding: "6px 4px" }}>{date}</td>
            <td style={{ padding: "6px 4px", textAlign: "right" }}>{fmt(count)}건</td>
            <td style={{ padding: "6px 4px", textAlign: "right" }}>{fmt(amount)}원</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
