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

  const topSummary =
    top.length > 0
      ? top.map((t) => `${t.name} x${t.qty}`).join(" · ")
      : "No data";

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <MetricCard
        title="Average Order Value"
        value={`${aov.toLocaleString("ko-KR")} KRW`}
        hint="Average revenue per order in the selected range"
      />
      <MetricCard
        title="Average Lead Time"
        value={`${lead} days`}
        hint="Average days from order to fulfillment"
      />
      <MetricCard title="Top Products" value={topSummary} hint="Top sellers in the selected range" />
    </section>
  );
}
