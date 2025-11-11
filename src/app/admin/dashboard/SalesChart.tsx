"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type DailyPoint = {
  date: string;
  amount: number;   // 매출
  count: number;    // 주문 수
  aov?: number;     // 평균 주문금액(옵션)
  aovEma?: number;  // EMA(3) AOV (옵션)
};

type Props = {
  data: DailyPoint[];
  height?: number;
};

export default function SalesChart({ data, height = 320 }: Props) {
  const fmtNum = (v: number) => Number(v).toLocaleString();
  const tooltipFormatter = (value: number, name: string) => {
    if (name === "amount" || name === "aovEma" || name === "aov") {
      return [`${fmtNum(value)}원`, name === "amount" ? "매출" : name === "aovEma" ? "AOV(EMA3)" : "AOV"];
    }
    if (name === "count") return [`${fmtNum(value)}건`, "주문수"];
    return [fmtNum(value), name];
  };

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />

          {/* 왼쪽: 주문수 */}
          <YAxis
            yAxisId="left"
            width={60}
            tickFormatter={(v: number) => fmtNum(v)}
          />

          {/* 오른쪽: 금액(매출/AOV) */}
          <YAxis
            yAxisId="right"
            orientation="right"
            width={80}
            tickFormatter={(v: number) => fmtNum(v)}
          />

          <Tooltip formatter={tooltipFormatter as any} />
          <Legend />

          {/* 막대: 주문수 */}
          <Bar
            yAxisId="left"
            dataKey="count"
            name="주문수"
            barSize={18}
            radius={[4, 4, 0, 0]}
          />

          {/* 라인: 매출 */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="amount"
            name="매출"
            strokeWidth={2}
            dot={false}
          />

          {/* 라인: AOV EMA(3) (있을 때만) */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="aovEma"
            name="AOV(EMA3)"
            strokeWidth={2}
            dot={false}
            strokeDasharray="4 4"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
