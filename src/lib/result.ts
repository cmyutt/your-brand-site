// CODPATCH: result helpers — unified outcome & redirect messaging
export type ResultKind = "userOk" | "userFail" | "sysOk" | "sysFail";
export type Result<T = unknown> = { kind: ResultKind; data?: T; message?: string };

export const userOk = <T = unknown>(message?: string, data?: T): Result<T> =>
  ({ kind: "userOk", message, data });
export const userFail = <T = unknown>(message?: string, data?: T): Result<T> =>
  ({ kind: "userFail", message, data });
export const sysOk = <T = unknown>(message?: string, data?: T): Result<T> =>
  ({ kind: "sysOk", message, data });
export const sysFail = <T = unknown>(message?: string, data?: T): Result<T> =>
  ({ kind: "sysFail", message, data });

/**
 * Redirect URL에 표준 메시지 쿼리스트링을 붙인다.
 * ex) /admin/orders → /admin/orders?m=Saved&t=success
 */
export function withRedirectParams(url: string, r: Result) {
  const u = new URL(url, "http://localhost"); // base는 무시됨
  if (r.message) u.searchParams.set("m", r.message);
  const t =
    r.kind === "userOk" ? "success" :
    r.kind === "userFail" ? "error" :
    "info";
  u.searchParams.set("t", t);
  return `${u.pathname}?${u.searchParams.toString()}`;
}

