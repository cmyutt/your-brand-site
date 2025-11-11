// CODPATCH: /account — protected page example
import { getSession } from "@/lib/auth/session";
import LogoutButton from "./LogoutButton";
import Link from "next/link";

export default async function AccountPage() {
  const s = await getSession();
  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-2 text-xl font-semibold">마이페이지</h1>
      <div className="text-gray-700">안녕하세요, <b>{s?.email ?? "손님"}</b> 님</div>
      <div className="mt-4 flex items-center gap-3">
        <LogoutButton />
        <Link href="/" className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
          상품 목록으로
        </Link>
      </div>
    </div>
  );
}
