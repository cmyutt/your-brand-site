import { prisma } from "@/lib/prisma";
import Link from "next/link";
import UsersRow from "./users/UsersRow";
import LiveRefresher from "@/app/admin/dashboard/LiveRefresher";
import { cn } from "@/lib/cn";
import { buttonPrimaryClass, cardBaseClass } from "@/lib/ui";

const PAGE_SIZE = 20;

const VERIFICATION_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "verified", label: "Verified" },
  { value: "unverified", label: "Not verified" },
] as const;

const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Newest signup" },
  { value: "createdAt:asc", label: "Oldest signup" },
  { value: "email:asc", label: "Email A-Z" },
  { value: "email:desc", label: "Email Z-A" },
  { value: "lastLoginAt:desc", label: "Latest login" },
  { value: "lastLoginAt:asc", label: "Oldest login" },
] as const;

type SearchParams = Promise<Record<string, string>>;

type VerificationFilter = (typeof VERIFICATION_FILTERS)[number]["value"];
type SortValue = (typeof SORT_OPTIONS)[number]["value"];

const formatDateTime = (value?: Date | null) =>
  value
    ? new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "-";

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim();
  const verification = (sp.v ?? "all") as VerificationFilter;
  const sortValue = (sp.sort ?? "createdAt:desc") as SortValue;
  const page = Math.max(1, Number(sp.page ?? "1"));

  const where: Record<string, unknown> = {};
  if (query) {
    where.email = { contains: query, mode: "insensitive" };
  }
  if (verification === "verified") {
    where.emailVerifiedAt = { not: null };
  } else if (verification === "unverified") {
    where.emailVerifiedAt = null;
  }

  const [sortKey, direction] = sortValue.split(":");
  const orderBy: Record<string, "asc" | "desc"> = {
    [sortKey]: direction === "asc" ? "asc" : "desc",
  };

  const [users, total] = await Promise.all([
    (prisma as any).user.findMany({
      where,
      orderBy,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        emailVerifiedAt: true,
      },
    }),
    (prisma as any).user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6 p-6">
      <LiveRefresher topic="admin:users" refreshDebounceMs={500} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-gray-900">Account management</h1>
        <p className="text-sm text-gray-500">
          {total.toLocaleString()} result(s) · page {page}/{totalPages}
        </p>
      </div>

      <form className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_max-content] md:items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Search email</label>
          <input
            name="q"
            defaultValue={query}
            placeholder="example@your.co"
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black/5"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Verification</label>
          <select
            name="v"
            defaultValue={verification}
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black/5"
          >
            {VERIFICATION_FILTERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Sort by</label>
          <select
            name="sort"
            defaultValue={sortValue}
            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black/5"
          >
            {SORT_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className={cn(buttonPrimaryClass, "h-10 w-full justify-center px-5 shadow md:w-auto md:self-end")}
        >
          Apply
        </button>
      </form>

      <div className={cardBaseClass}>
        <div className="overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-left">Email</th>
                <th className="whitespace-nowrap px-4 py-3 text-left">Role</th>
                <th className="whitespace-nowrap px-4 py-3 text-left">Signup date</th>
                <th className="whitespace-nowrap px-4 py-3 text-left">Last login</th>
                <th className="whitespace-nowrap px-4 py-3 text-left">Verified</th>
                <th className="whitespace-nowrap px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">
                    No users match your filters.
                  </td>
                </tr>
              ) : (
                users.map((user: any) => (
                  <UsersRow
                    key={user.id}
                    user={{
                      id: user.id,
                      email: user.email,
                      role: user.role ?? "USER",
                      createdAt: formatDateTime(user.createdAt),
                      lastLoginAt: formatDateTime(user.lastLoginAt),
                      verified: !!user.emailVerifiedAt,
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => {
          const href = `?q=${encodeURIComponent(query)}&v=${verification}&sort=${sortValue}&page=${pageNumber}`;
          const active = pageNumber === page;
          return (
            <Link
              key={pageNumber}
              href={href}
              className={`inline-flex h-9 min-w-[36px] items-center justify-center rounded-lg px-3 text-sm font-medium ring-1 transition ${
                active ? "bg-black text-white ring-black" : "text-gray-700 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              {pageNumber}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
