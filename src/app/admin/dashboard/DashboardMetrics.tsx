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
      <MetricCard
        title="AOV(평균 주문금액)"
        value={`${aov.toLocaleString("ko-KR")}원`}
        hint="선택 기간 동안 주문 1건당 평균 결제 금액"
      />
      <MetricCard
        title="평균 리드타임"
        value={`${lead}일`}
        hint="주문부터 배송 완료까지 평균 소요 일수"
      />
      <MetricCard
        title="Top 상품"
        value={
          <ul className="text-sm">
            {top.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{t.name}</span>
                <span className="text-gray-500">×{t.qty}</span>
              </li>
            ))}
          </ul>
        }
      />
    </section>
  );
}
