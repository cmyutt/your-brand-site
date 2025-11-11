import prisma from "@/lib/prisma";
import type { OrderStatus } from "@prisma/client";
import { calcStockDelta } from "./stockDelta";

/** 상태 변경 이벤트 기록만 수행 (Slack 없음) */
export async function recordStatusChange(input: {
  orderId: string;
  from: OrderStatus;
  to: OrderStatus;
  note?: string | null;
  actor?: string | null;
  items?: { qty: number }[]; // 재고 delta 계산용 (옵션)
}) {
  const { orderId, from, to, note, actor, items } = input;

  // items가 주어지면 재고 delta를 반영한 노트를 자동 생성
  let finalNote: string | null = null;
  if (items && items.length > 0) {
    const delta = calcStockDelta(from, to, items);
    const parts = [
      `${from} → ${to}`,
      ...(delta !== 0 ? [`재고 ${delta > 0 ? `+${delta}` : delta}`] : []),
      ...(note ? [note] : []),
    ];
    finalNote = parts.join(" · ");
  } else {
    finalNote = note ?? null;
  }

  return prisma.orderEvent.create({
    data: {
      orderId,
      type: "STATUS_CHANGED",
      from,
      to,
      note: finalNote,
      actor: actor ?? null,
    },
  });
}

/** 메모 이벤트 기록만 수행 (Slack 없음) */
export async function recordNote(input: {
  orderId: string;
  note: string;
  actor?: string | null;
}) {
  const { orderId, note, actor } = input;
  if (!note.trim()) return null;
  return prisma.orderEvent.create({
    data: {
      orderId,
      type: "NOTE",
      note,
      actor: actor ?? null,
    },
  });
}

/** 웹훅 이벤트 기록 (타임라인에 WEBHOOK으로 남김) */
export async function recordPaymentWebhook(input: {
  orderId: string;
  note?: string | null;      // 예: "iamport:payment.captured"
  actor?: string | null;     // 기본 "webhook"
  payload?: unknown;         // 원본 페이로드(선택)
}) {
  const { orderId, note, actor, payload } = input;

  // note 없으면 payload를 안전하게 요약(최대 4000자)
  let detail = note ?? null;
  if (!detail && payload != null) {
    try {
      detail = JSON.stringify(payload).slice(0, 4000);
    } catch {
      detail = String(payload).slice(0, 4000);
    }
  }

  return prisma.orderEvent.create({
    data: {
      orderId,
      type: "WEBHOOK",
      note: detail,
      actor: actor ?? "webhook",
    },
  });
}
