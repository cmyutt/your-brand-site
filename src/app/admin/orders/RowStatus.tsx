"use client";
import StatusChip from "@/components/StatusChip";
import { useRowPatch } from "./RowPatchContext";

type Props = { orderId: string; initialStatus: string };

export default function RowStatus({ orderId, initialStatus }: Props) {
  const { getRowPatch } = useRowPatch();
  const patch = getRowPatch(orderId);
  const status = (patch?.status ?? initialStatus) as string;
  return <StatusChip status={status} className="ml-1" />;
}

