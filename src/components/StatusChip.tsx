import { OrderStatus } from "@prisma/client";
import {
  Clock,
  CreditCard,
  PackageCheck,
  XCircle,
  RotateCcw,
} from "lucide-react";

type Props = {
  status: OrderStatus | string;
  className?: string;
};

const LABEL: Record<string, string> = {
  PENDING: "대기중",
  PAID: "결제완료",
  FULFILLED: "배송완료",
  CANCELED: "취소됨",
  REFUNDED: "환불됨",
};

export default function StatusChip({ status, className = "" }: Props) {
  const s = String(status).toUpperCase();
  const label = LABEL[s] ?? s;

  const { Icon, cls } = (() => {
    switch (s) {
      case "PENDING":
        return { Icon: Clock, cls: "bg-gray-100 text-gray-800 ring-gray-200" };
      case "PAID":
        return { Icon: CreditCard, cls: "bg-emerald-100 text-emerald-800 ring-emerald-200" };
      case "FULFILLED":
        return { Icon: PackageCheck, cls: "bg-blue-100 text-blue-800 ring-blue-200" };
      case "CANCELED":
        return { Icon: XCircle, cls: "bg-amber-100 text-amber-800 ring-amber-200" };
      case "REFUNDED":
        return { Icon: RotateCcw, cls: "bg-purple-100 text-purple-800 ring-purple-200" };
      default:
        return { Icon: Clock, cls: "bg-gray-100 text-gray-800 ring-gray-200" };
    }
  })();

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium ring-1",
        cls,
        className,
      ].join(" ")}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}
