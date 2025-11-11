"use client";
import { useActionState, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import TopToast from "@/components/TopToast";
import { resetPassword } from "@/app/(shop)/auth/actions";

export default function ResetPasswordPage() {
  const sp = useSearchParams(); const router = useRouter();
  const token = sp.get("token") || "";
  // @ts-ignore
  const [res, act] = useActionState(resetPassword as any, null);
  const [trigger, setTrigger] = useState<any>(null);
  useEffect(() => { if (res) { setTrigger(res); if ((res as any).kind === "ok") router.replace("/login"); } }, [res, router]);

  return (
    <div className="mx-auto max-w-sm p-6">
      <TopToast trigger={trigger} />
      <h1 className="mb-4 text-xl font-semibold">새 비밀번호 설정</h1>
      <form action={act as any} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <div>
          <label className="mb-1 block text-sm">새 비밀번호</label>
          <input name="password" type="password" required className="w-full rounded-md border px-3 py-2" />
        </div>
        <button type="submit" className="w-full rounded-md bg-black px-3 py-2 text-white">변경하기</button>
      </form>
    </div>
  );
}

