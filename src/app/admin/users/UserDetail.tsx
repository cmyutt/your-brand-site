// CODPATCH: 사용자 상세 클라이언트 뷰
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface UserDetailProps {
  userId: string;
  initialUser?: UserInfo | null;
}

interface UserOrderSummary {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  receiverName: string;
  itemCount: number;
}

interface UserInfo {
  id: string;
  email: string;
  name: string;
  phoneCountry?: string;
  phone?: string;
  country?: string;
  birthdate?: string;
  createdAt: string;
  lastLoginAt?: string;
  isVerified: boolean;
  marketingConsent: boolean;
  orders: UserOrderSummary[];
}

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString("ko-KR") : "-");
const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString("ko-KR") : "-");
const formatCurrency = (value: number) => value.toLocaleString("ko-KR");

const STATUS_LABELS: Record<string, string> = {
  PENDING: "대기중",
  PAID: "결제 완료",
  FULFILLED: "배송 완료",
  CANCELED: "취소 됨",
  REFUNDED: "환불 완료",
};

const STATUS_TONES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  FULFILLED: "bg-blue-50 text-blue-700 ring-blue-200",
  CANCELED: "bg-gray-100 text-gray-600 ring-gray-200",
  REFUNDED: "bg-rose-50 text-rose-700 ring-rose-200",
};

const statusLabel = (status: string) => STATUS_LABELS[status] ?? status;
const statusTone = (status: string) => STATUS_TONES[status] ?? "bg-gray-100 text-gray-600 ring-gray-200";

const toIsoString = (value: unknown): string | undefined => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) return value;
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  return undefined;
};

const normalizeOrder = (raw: unknown): UserOrderSummary => {
  const order = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {});
  const createdAt = toIsoString(order.createdAt) ?? "";
  return {
    id: order.id ? String(order.id) : "",
    status: order.status ? String(order.status) : "",
    totalAmount: typeof order.totalAmount === "number" ? order.totalAmount : Number(order.totalAmount ?? 0),
    createdAt,
    receiverName: typeof order.receiverName === "string" ? order.receiverName : "",
    itemCount: typeof order.itemCount === "number" ? order.itemCount : Number(order.itemCount ?? 0),
  };
};

const normalizeUser = (payload: unknown): UserInfo => {
  const record = (payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {});
  const createdAt = toIsoString(record.createdAt) ?? new Date().toISOString();
  const birthdate = toIsoString(record.birthdate);
  const lastLoginAt = toIsoString(record.lastLoginAt);
  const ordersRaw = (record as { orders?: unknown }).orders;

  return {
    id: record.id ? String(record.id) : "",
    email: record.email ? String(record.email) : "",
    name: typeof record.name === "string" ? record.name : "",
    phoneCountry: typeof record.phoneCountry === "string" ? record.phoneCountry : undefined,
    phone: typeof record.phone === "string" ? record.phone : undefined,
    country: typeof record.country === "string" ? record.country : undefined,
    birthdate,
    createdAt,
    lastLoginAt,
    isVerified: Boolean((record as { isVerified?: unknown }).isVerified ?? (record as { emailVerifiedAt?: unknown }).emailVerifiedAt),
    marketingConsent: Boolean((record as { marketingConsent?: unknown }).marketingConsent),
    orders: Array.isArray(ordersRaw) ? ordersRaw.map(normalizeOrder) : [],
  };
};

export default function UserDetail({ userId, initialUser }: UserDetailProps) {
  const [user, setUser] = useState<UserInfo | null>(() => (initialUser ? normalizeUser(initialUser) : null));
  const [loading, setLoading] = useState(!initialUser);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`/api/admin/users/${userId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        setUser(normalizeUser(data));
        setError(null);
      } catch {
        if (!initialUser) setUser(null);
        setError("사용자 정보를 가져오는 데 실패했어요.");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [userId, initialUser]);

  if (loading && !user) return <div className="text-sm text-gray-500">불러오는 중...</div>;
  if (!user) return <div className="text-sm text-gray-500">{error ?? "사용자 정보를 찾을 수 없어요."}</div>;

  const phoneText = user.phone ? `${user.phoneCountry ?? ""} ${user.phone}`.trim() : "-";
  const orders = user.orders ?? [];
  const orderCount = orders.length;

  const details: Array<{ label: string; value: string }> = [
    { label: "이메일", value: user.email },
    { label: "이름", value: user.name || "-" },
    { label: "전화번호", value: phoneText || "-" },
    { label: "국가", value: user.country ?? "-" },
    { label: "가입일", value: formatDateTime(user.createdAt) },
    { label: "최근 로그인", value: formatDateTime(user.lastLoginAt) },
    { label: "생년월일", value: formatDate(user.birthdate) },
    { label: "마케팅 동의", value: user.marketingConsent ? "동의" : "미동의" },
    { label: "이메일 인증", value: user.isVerified ? "완료" : "미완료" },
    { label: "사용자 ID", value: user.id },
  ];

  return (
    <section className="space-y-8">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-gray-900">계정 상세 정보</h2>
        <p className="text-sm text-gray-500">이 계정의 프로필과 상태를 확인할 수 있습니다.</p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <dl className="grid gap-x-6 gap-y-4 p-6 text-sm sm:grid-cols-2">
          {details.map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1 border-b border-dashed border-gray-100 pb-3 last:border-b-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
              <dd className="text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">주문 목록</h3>
            <p className="text-sm text-gray-500">이메일 기준으로 연결된 주문 {orderCount}건을 확인할 수 있습니다.</p>
          </div>
          {orderCount > 0 && (
            <Link
              href={`/admin/orders?q=${encodeURIComponent(user.email)}`}
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50"
            >
              주문 페이지로 이동
            </Link>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {orderCount === 0 ? (
            <div className="p-6 text-sm text-gray-500">아직 주문 내역이 없습니다.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {orders.map((order) => (
                <li key={order.id} className="flex flex-wrap items-start justify-between gap-4 px-6 py-4 text-sm">
                  <div className="space-y-1">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-base font-semibold text-gray-900 hover:text-black hover:underline"
                    >
                      #{order.id.slice(0, 8)}
                    </Link>
                    <div className="text-xs text-gray-500">{formatDateTime(order.createdAt)}</div>
                    <div className="text-xs text-gray-500">
                      {order.receiverName ? `${order.receiverName} · ` : ""}
                      {order.itemCount.toLocaleString()}개 품목
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusTone(order.status)}`}>
                      {statusLabel(order.status)}
                    </span>
                    <div className="text-base font-semibold text-gray-900">₩{formatCurrency(order.totalAmount)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </section>
  );
}
