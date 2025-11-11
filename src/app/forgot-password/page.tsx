"use client";
import { useActionState, useEffect, useState } from "react";
import TopToast from "@/components/TopToast";
import { requestPasswordReset } from "@/app/(shop)/auth/actions";

export default function ForgotPasswordPage() {
  // @ts-ignore
  const [res, act] = useActionState(requestPasswordReset as any, null);
  const [trigger, setTrigger] = useState<any>(null);
  useEffect(() => { if (res) setTrigger(res); }, [res]);

  return (
    <div className="mx-auto max-w-sm p-6">
      <TopToast trigger={trigger} />
      <h1 className="mb-4 text-xl font-semibold">비밀번호 재설정</h1>
      <form action={act as any} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm">이메일</label>
          <input name="email" type="email" required className="w-full rounded-md border px-3 py-2" />
        </div>
        <button type="submit" className="w-full rounded-md bg-black px-3 py-2 text-white">재설정 링크 보내기</button>
      </form>
    </div>
  );
}

