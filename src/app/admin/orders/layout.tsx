import type { ReactNode } from "react";
// CODPATCH: orders layout — providers import
import OrdersClientProviders from "./OrdersClientProviders";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrdersLayout({ children }: { children: ReactNode }) {
  const jar = await cookies();
  const authed = jar.get("admin")?.value === "1";
  if (!authed) {
    redirect("/admin/login?next=/admin/orders");
  }
  return <>
    {/* CODPATCH: orders layout — row patch providers */}
    {/* @ts-expect-error Client Providers inside Server layout */}
    <OrdersClientProviders>
      {children}
    </OrdersClientProviders>
  </>;
}
