// Server component: Dashboard Metrics (AOV / Lead time / Top products)
import { aovBetween, leadTimeBetween, topProductsBetween } from "@/lib/metrics";
import MetricCard from "./components/MetricCard";

type Props = {
  from?: string;
  to?: string;
};

function parseDateRange(from?: string, to?: string): { start?: Date; end?: Date } {
  const start = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
  const end = to ? new Date(`${to}T23:59:59.999Z`) : undefined;
  return { start, end };
}

export default async function DashboardMetrics({ from, to }: Props) {
  const { start, end } = parseDateRange(from, to);

  const [aov, lead, top] = await Promise.all([
    aovBetween(start, end),
    leadTimeBetween(start, end),
    topProductsBetween(start, end, 5),
  ]);

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <MetricCard title="AOV(평균 주문금액)" value={`${aov.toLocaleString("ko-KR")}원`} hint="기간 필터 기준" />
      <MetricCard title="평균 리드타임" value={`${lead}일`} hint="주문→배송완료" />
      <MetricCard
        title="Top 상품"
        value={
          <ul className="text-sm">
            {top.map((t) => (
              <li key={t.id}>
                {t.name} <span className="text-gray-500">×{t.qty}</span>
              </li>
            ))}
          </ul>
        }
      />
    </section>
  );
}
