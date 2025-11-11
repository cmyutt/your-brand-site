import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type OrderSummary = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  receiverName: string;
  itemCount: number;
};

const ORDER_SUMMARY_SELECT = {
  id: true,
  status: true,
  totalAmount: true,
  createdAt: true,
  receiverName: true,
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect;

type OrderSummaryRow = Prisma.OrderGetPayload<{ select: typeof ORDER_SUMMARY_SELECT }>;

export async function GET(_: Request, context: any) {
  const id = context?.params?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const userModel = (prisma as { user?: typeof prisma.user }).user;
  if (!userModel?.findUnique) {
    return NextResponse.json({ error: "User model is not available" }, { status: 500 });
  }

  const user = await userModel.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      phoneCountry: true,
      phone: true,
      country: true,
      birthdate: true,
      createdAt: true,
      lastLoginAt: true,
      emailVerifiedAt: true,
      marketingConsent: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const orders = await fetchUserOrders(user.email);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name ?? "",
    phoneCountry: user.phoneCountry ?? undefined,
    phone: user.phone ?? undefined,
    country: user.country ?? undefined,
    birthdate: user.birthdate ? user.birthdate.toISOString() : undefined,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : undefined,
    isVerified: !!user.emailVerifiedAt,
    marketingConsent: user.marketingConsent,
    orders,
  });
}

async function fetchUserOrders(email: string | null | undefined): Promise<OrderSummary[]> {
  if (!email) {
    return [];
  }

  const orderModel = (prisma as { order?: typeof prisma.order }).order;
  if (!orderModel?.findMany) {
    return [];
  }

  try {
    const rows = await orderModel.findMany({
      where: { customer: { email } },
      select: ORDER_SUMMARY_SELECT,
      orderBy: { createdAt: "desc" },
    });

    return rows.map(mapOrderSummary);
  } catch {
    return [];
  }
}

const mapOrderSummary = (order: OrderSummaryRow): OrderSummary => ({
  id: order.id,
  status: String(order.status ?? ""),
  totalAmount: Number(order.totalAmount ?? 0),
  createdAt: order.createdAt.toISOString(),
  receiverName: order.receiverName ?? "",
  itemCount: order._count.items,
});
