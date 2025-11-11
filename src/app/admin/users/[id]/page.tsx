import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import UserDetail from "../UserDetail";

type PageParams = Promise<{ id: string }>;

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

export default async function AdminUserDetailPage({ params }: { params: PageParams }) {
  const { id } = await params;

  const userModel = (prisma as { user?: typeof prisma.user }).user;
  if (!userModel?.findUnique) {
    notFound();
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
    notFound();
  }

  const orders = await fetchUserOrders(user.email);

  const initialUser = {
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
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">계정 상세</h1>
        <Link
          href="/admin/users"
          className="rounded-md border border-gray-200 px-3 py-2 text-sm transition hover:bg-gray-50"
        >
          목록으로
        </Link>
      </div>

      {/* @ts-expect-error Client component */}
      <UserDetail userId={id} initialUser={initialUser} />
    </div>
  );
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
