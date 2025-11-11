// CODPATCH: redirector — standardize redirect messages via withRedirectParams
import { redirect } from "next/navigation";
import { withRedirectParams, userOk, userFail, sysOk } from "./result";

/** 성공 메시지로 리다이렉트 (t=success) */
export function redirectOk(url: string, message?: string) {
  return redirect(withRedirectParams(url, userOk(message)));
}

/** 오류 메시지로 리다이렉트 (t=error) */
export function redirectError(url: string, message?: string) {
  return redirect(withRedirectParams(url, userFail(message)));
}

/** 정보 메시지로 리다이렉트 (t=info) */
export function redirectInfo(url: string, message?: string) {
  return redirect(withRedirectParams(url, sysOk(message)));
}

