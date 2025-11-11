"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/opening", label: "Opening" },
];

export default function AdminNav() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav style={{ display: "flex", gap: 12 }}>
      {items.map((it) => {
        const active = isActive(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            style={{
              textDecoration: active ? "underline" : "none",
              fontWeight: active ? 700 : 400,
            }}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
