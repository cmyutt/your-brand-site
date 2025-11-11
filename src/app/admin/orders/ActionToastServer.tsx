import ActionToast from "./ActionToast";

type SP = Record<string, string | string[] | undefined>;

function toStr(v: string | string[] | undefined, def = ""): string {
  if (Array.isArray(v)) return v[0] ?? def;
  return v ?? def;
}

/** searchParams를 읽어 토스트 메시지 구성 (서버컴포넌트) */
export default async function ActionToastServer({
  searchParams,
}: {
  searchParams: Promise<SP> | SP;
}) {
  const sp = await searchParams;
  const m = toStr(sp.m);         // 예: bulk-deleted | bulk-status
  const ok = Number(toStr(sp.ok, "0")) || 0;
  const fail = Number(toStr(sp.fail, "0")) || 0;
  const to = toStr(sp.to, "");   // 새 상태 (옵션)

  if (!m) return null;

  let message = "";
  let variant: "success" | "warning" | "error" | "info" = "info";

  if (m === "bulk-deleted") {
    message =
      fail > 0
        ? `선택 삭제 완료: 성공 ${ok}건 · 실패 ${fail}건`
        : `선택 삭제 완료: 총 ${ok}건`;
    variant = fail > 0 ? "warning" : "success";
  } else if (m === "bulk-status") {
    message =
      fail > 0
        ? `일괄 상태변경 완료: "${to}"로 성공 ${ok}건 · 실패 ${fail}건`
        : `일괄 상태변경 완료: "${to}"로 총 ${ok}건`;
    variant = fail > 0 ? "warning" : "success";
  } else {
    message = "처리가 완료되었습니다.";
    variant = "info";
  }

  return <ActionToast message={message} variant={variant} />;
}
