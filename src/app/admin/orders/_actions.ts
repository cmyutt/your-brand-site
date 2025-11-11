"use server";

import { redirectOk } from "@/lib/redirector";
import { statusChangeMessage } from "@/lib/flashMessage";
import type { OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { assertAllowedTransition } from "@/lib/orderDomain";
import { getAdminActor } from "@/lib/actor";
import { notifyOrderEvent, notifyAdmin } from "@/lib/notify";
import { bus } from "@/lib/bus";
import { recordNote } from "@/lib/orderEvents";

function revalidateAdminAndStore(orderId?: string) {
  revalidatePath("/admin/orders");
  if (orderId) revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/");
  revalidatePath("/orders");
}

function stockDeltaDirection(oldS: OrderStatus, newS: OrderStatus): -1 | 0 | 1 {
  const consume = new Set<OrderStatus>(["PAID", "FULFILLED"] as OrderStatus[]);
  const fromConsume = consume.has(oldS);
  const toConsume = consume.has(newS);
  if (!fromConsume && toConsume) return -1;
  if (fromConsume && !toConsume) return 1;
  return 0;
}

export async function setOrderStatus(id: string, to: OrderStatus, note?: string | null) {
  if (!id) throw new Error("id required");
  if (!("PENDING|PAID|FULFILLED|CANCELED|REFUNDED".split("|") as any).includes(to)) {
    throw new Error("invalid status");
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { select: { variantId: true, qty: true, unitPrice: true, name: true } } },
  });
  if (!order) throw new Error("order not found");

  assertAllowedTransition(order.status as OrderStatus, to);

  if (order.status === to) {
    revalidateAdminAndStore(id);
    bus.publish("orders:update", { id });
    return;
  }

  const dir = stockDeltaDirection(order.status as OrderStatus, to);
  const actor = (await getAdminActor()) ?? "admin";

  await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({ where: { id, status: order.status }, data: { status: to } });
    if (updated.count !== 1) throw new Error("concurrent update detected");

    if (dir !== 0 && order.items.length > 0) {
      const variantQty = new Map<string, number>();
      for (const it of order.items) {
        if (!it.variantId) continue;
        variantQty.set(it.variantId, (variantQty.get(it.variantId) ?? 0) + it.qty);
      }
      for (const [vid, qty] of variantQty) {
        if (dir < 0) {
          const ok = await tx.variant.updateMany({ where: { id: vid, stock: { gte: qty } }, data: { stock: { decrement: qty } } });
          if (ok.count !== 1) throw new Error("insufficient stock");
        } else {
          await tx.variant.update({ where: { id: vid }, data: { stock: { increment: qty } } });
        }
      }
    }

    await tx.orderEvent.create({
      data: { orderId: id, type: "STATUS_CHANGED", from: order.status, to, note: note ?? null, actor },
    });

    try {
      await tx.adminLog.create({
        data: { targetType: "order", targetId: id, action: "ORDER_STATUS_CHANGED", actor, note: note ?? null, snapshot: { from: order.status, to } },
      });
    } catch {}
  }, { timeout: 15000 });

  void notifyOrderEvent({ orderId: id, type: "STATUS_CHANGED", from: order.status, to, note: note ?? undefined, actor }).catch(() => {});
  revalidateAdminAndStore(id);
  bus.publish("orders:update", { id });
}

export async function setOrderStatusDirect(id: string, to: OrderStatus) {
  await setOrderStatus(id, to);
}

export async function transitionOrderStatus(formData: FormData) {
  const id = String(formData.get("orderId") || "");
  const to = String(formData.get("to") || "") as OrderStatus;
  const note = (formData.get("note") as string) || null;
  if (!id || !to) return;
  await setOrderStatus(id, to, note);
  redirectOk("/admin/orders", statusChangeMessage(to));
}

export async function addOrderNote(formData: FormData) {
  const id = String(formData.get("orderId") || "");
  const note = String(formData.get("note") || "");
  if (!id || !note.trim()) return;
  const actor = (await getAdminActor()) ?? "admin";
  await recordNote({ orderId: id, note, actor });
  void notifyOrderEvent({ orderId: id, type: "NOTE", note, actor }).catch(() => {});
  revalidateAdminAndStore(id);
  bus.publish("orders:update", { id });
}

export async function deleteOrder(formData: FormData): Promise<void> {
  const id = String(formData.get("orderId") || "");
  if (!id) throw new Error("orderId required");
  try { await deleteOrderById(id); } catch (e) { console.error("[deleteOrder] failed:", e); }
  finally { revalidateAdminAndStore(id); bus.publish("orders:update", { id }); }
}

export async function deleteOrderDirect(id: string): Promise<void> {
  if (!id) throw new Error("orderId required");
  try { await deleteOrderById(id); } catch (e) { console.error("[deleteOrderDirect] failed:", e); }
  finally { revalidateAdminAndStore(id); bus.publish("orders:update", { id }); redirectOk("/admin/orders", "삭제되었습니다"); }
}

async function deleteOrderById(id: string) {
  const actor = (await getAdminActor()) ?? "admin";
  const existing = await prisma.order.findUnique({ where: { id }, include: { items: { select: { variantId: true, qty: true, unitPrice: true, name: true } } } });
  if (!existing) return;
  const shouldRestock = existing.status === "PAID" || existing.status === "FULFILLED";
  await prisma.$transaction(async (tx) => {
    if (shouldRestock) {
      for (const it of existing.items) {
        if (!it.variantId) continue;
        await tx.variant.update({ where: { id: it.variantId }, data: { stock: { increment: it.qty } } });
      }
    }
    try { await tx.orderEvent.deleteMany({ where: { orderId: id } }); } catch {}
    try { await tx.payment.deleteMany({ where: { orderId: id } }); } catch {}
    await tx.orderItem.deleteMany({ where: { orderId: id } });
    await tx.order.delete({ where: { id } });
  }, { timeout: 15000 });

  const short = id.slice(0, 8);
  const total = (existing as any).totalAmount ?? existing.items.reduce((a, it) => a + it.unitPrice * it.qty, 0);
  const fmt = new Intl.NumberFormat("ko-KR");
  const msg = `주문 삭제\n번호: #${short}\n상태: ${existing.status}\n품목수: ${existing.items.length}\n총액: ${fmt.format(total)}\n처리자: ${actor}`;
  void notifyAdmin(msg).catch(() => {});
}

