"use client";
// CODPATCH: LogoutButton — signOut inline
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopToast from "@/components/TopToast";
import { signOut } from "@/app/(shop)/auth/actions";

export default function LogoutButton() {
  const router = useRouter();
  // @ts-ignore
  const [res, act] = useActionState(signOut as any, null);
  const [trigger, setTrigger] = useState<any>(null);
  useEffect(() => {
    if (!res) return;
    setTrigger(res);
    if ((res as any).kind === "ok") router.replace("/");
  }, [res, router]);

  return (
    <>
      <TopToast trigger={trigger} />
      <form action={act as any} className="inline">
        <button type="submit" className="rounded-md border px-3 py-2">로그아웃</button>
      </form>
    </>
  );
}

