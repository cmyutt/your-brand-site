"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import TopToast from "@/components/TopToast";
import SubmitButton from "@/components/SubmitButton";
import { deleteUserInline } from "../inlineActions";

interface UserRowData {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt: string;
  verified: boolean;
}

export default function UsersRow({ user }: { user: UserRowData }) {
  // @ts-ignore
  const [deleteResult, deleteAction] = useActionState(deleteUserInline as any, null);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    if (deleteResult && (deleteResult as any).kind === "ok") {
      setDeleted(true);
    }
  }, [deleteResult]);

  if (deleted) return null;

  const handleDeleteSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!confirm("정말로 삭제하시겠어요? 작업은 되돌릴 수 없습니다.")) {
      event.preventDefault();
    }
  };

  const verificationLabel = user.verified ? "인증됨" : "미인증";
  const verificationTone = user.verified
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-amber-50 text-amber-700 ring-amber-200";

  return (
    <tr className="text-sm text-gray-800">
      <td className="whitespace-nowrap px-4 py-3 align-middle">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(user.email)}
            title="이메일 복사"
            className="rounded-md border border-gray-200 px-2 py-0.5 text-xs text-gray-600 transition hover:bg-gray-50"
          >
            복사
          </button>
          <span className="font-medium text-gray-900">{user.email}</span>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-middle text-gray-600">{user.role}</td>
      <td className="whitespace-nowrap px-4 py-3 align-middle text-gray-600">{user.createdAt}</td>
      <td className="whitespace-nowrap px-4 py-3 align-middle text-gray-600">{user.lastLoginAt}</td>
      <td className="whitespace-nowrap px-4 py-3 align-middle">
        <span className={`rounded-full px-2.5 py-0.5 text-xs ring-1 ${verificationTone}`}>
          {verificationLabel}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-middle">
        <TopToast trigger={deleteResult as any} />
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/users/${user.id}`}
            className="inline-flex items-center rounded-lg px-3 py-1 text-sm font-medium text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-50"
          >
            상세
          </Link>
          <form action={deleteAction as any} onSubmit={handleDeleteSubmit}>
            <input type="hidden" name="id" value={user.id} />
            <SubmitButton className="inline-flex items-center rounded-lg px-3 py-1 text-sm font-medium text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-50">
              삭제
            </SubmitButton>
          </form>
        </div>
      </td>
    </tr>
  );
}
