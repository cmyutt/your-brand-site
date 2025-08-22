import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { orderId } = body as { orderId?: string };

  if (!orderId) {
    return NextResponse.json({ ok: false, error: "orderId required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { select: { unitPrice: true, qty: true } } },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
  }

  const itemsTotal = order.items.reduce((sum, it) => {
    const price = Number.isInteger(it.unitPrice) ? it.unitPrice : 0;
    const qty = Number.isInteger(it.qty) ? it.qty : 0;
    return sum + price * qty;
  }, 0);

  if (!Number.isInteger(order.totalAmount) || order.totalAmount <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid order.totalAmount" }, { status: 400 });
  }

  if (itemsTotal !== order.totalAmount) {
    return NextResponse.json(
      { ok: false, error: "Mismatch between itemsTotal and order.totalAmount", itemsTotal, totalAmount: order.totalAmount },
      { status: 400 }
    );
  }

  let payment = await prisma.payment.findUnique({ where: { orderId: order.id } });
  if (!payment) {
    payment = await prisma.payment.create({
      data: { orderId: order.id, amount: order.totalAmount, provider: "mock", status: "INIT" },
    });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  const approveUrl = `${base}/api/payments/mock/approve?paymentId=${payment.id}`;
  const failUrl = `${base}/api/payments/mock/fail?paymentId=${payment.id}`;

  return NextResponse.json({ ok: true, paymentId: payment.id, amount: payment.amount, approveUrl, failUrl });
}
