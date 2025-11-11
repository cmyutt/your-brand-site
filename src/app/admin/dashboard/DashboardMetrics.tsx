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
        title="Average Order Value"
        value={`${aov.toLocaleString("ko-KR")} KRW`}
        hint="Average revenue per order in the selected range"
      />
      <MetricCard
        title="Average Lead Time"
        value={`${lead} days`}
        hint="Average days from order to fulfillment"
      />
      <MetricCard
        title="Top Products"
        value={
          <ul className="text-sm">
            {top.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{t.name}</span>
                <span className="text-gray-500">x{t.qty}</span>
              </li>
            ))}
          </ul>
        }
      />
    </section>
  );
}
