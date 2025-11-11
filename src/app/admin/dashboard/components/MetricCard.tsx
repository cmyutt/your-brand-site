import type { ReactNode } from "react";

type MetricCardProps = {
  title: string;
  value: ReactNode;
  hint?: string;
};

export default function MetricCard({ title, value, hint }: MetricCardProps) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-400">{hint}</div> : null}
    </div>
  );
}
