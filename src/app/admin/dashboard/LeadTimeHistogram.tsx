"use client";

import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  ReferenceLine,
} from "recharts";

type Props = {
  title: string;
  hours: number[]; // 표본 (시간 단위)
  p50: number;
  p90: number;
};

// 간단히 0~48h 까지는 2h bin, 그 이상은 12h 단위로 묶기
function buildBins(values: number[]) {
  const bins: { label: string; mid: number; count: number }[] = [];
  const push = (label: string, mid: number) => bins.push({ label, mid, count: 0 });

  for (let h = 0; h < 48; h += 2) {
    push(`${h}~${h + 2}`, h + 1);
  }
  for (let h = 48; h < 168; h += 12) {
    push(`${h}~${h + 12}`, h + 6);
  }
  push("168h+", 180);

  for (const v of values) {
    if (v < 0) continue;
    if (v >= 168) {
      bins[bins.length - 1].count++;
    } else if (v < 48) {
      const idx = Math.floor(v / 2);
      bins[idx].count++;
    } else {
      const idx = 24 + Math.floor((v - 48) / 12);
      bins[idx].count++;
    }
  }
  return bins;
}

export default function LeadTimeHistogram({ title, hours, p50, p90 }: Props) {
  const data = buildBins(hours);
  const total = hours.length || 1;

  const fmtNum = (n: number) => n.toLocaleString();
  const fmtHour = (h: number) =>
    h < 48 ? `${h}h` : h < 168 ? `${Math.round(h)}h` : "168h+";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>{title}</h3>
        <span style={{ fontSize: 12, color: "#6B7280" }}>표본 {fmtNum(hours.length)}건</span>
        <span
          title="중간값(P50)"
          style={{
            marginLeft: "auto",
            fontSize: 12,
            background: "#EEF2FF",
            border: "1px solid #C7D2FE",
            color: "#3730A3",
            padding: "2px 6px",
            borderRadius: 999,
            whiteSpace: "nowrap",
          }}
        >
          P50: {fmtHour(p50)}
        </span>
        <span
          title="상위 10%(P90)"
          style={{
            fontSize: 12,
            background: "#FFFBEB",
            border: "1px solid #FDE68A",
            color: "#92400E",
            padding: "2px 6px",
            borderRadius: 999,
            whiteSpace: "nowrap",
          }}
        >
          P90: {fmtHour(p90)}
        </span>
      </div>

      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis width={60} tickFormatter={(v: number) => fmtNum(v)} />
            <Tooltip
              formatter={(v: number) => [`${fmtNum(v)}건`, "개수"] as [string, string]}
              labelFormatter={(l) => `구간: ${l}`}
            />
            <Bar dataKey="count" name="개수" />
            {/* P50/P90 가이드 라인 (mid를 써서 대략적 위치 표시) */}
            <ReferenceLine x={data.find(d => p50 >= d.mid && p50 < (d.mid + (d.label.endsWith("+") ? 999 : (d.label.includes("~") ? Number(d.label.split("~")[1]) - d.mid : 0))))?.label} stroke="#6366F1" />
            <ReferenceLine x={data.find(d => p90 >= d.mid && p90 < (d.mid + (d.label.endsWith("+") ? 999 : (d.label.includes("~") ? Number(d.label.split("~")[1]) - d.mid : 0))))?.label} stroke="#F59E0B" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
