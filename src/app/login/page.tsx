"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/app/(shop)/auth/actions";

type StartAuthFn = typeof import("@/app/(shop)/auth/actions").startAuth;
type RequestPasswordResetFn = typeof import("@/app/(shop)/auth/actions").requestPasswordReset;

type LookupResult = Awaited<ReturnType<StartAuthFn>> | null;
type ResetResult = Awaited<ReturnType<RequestPasswordResetFn>> | null;
type SignInResult = Awaited<ReturnType<typeof signIn>> | null;

type Stage = "email" | "password" | "missing";

type LookupHandler = (prevState: LookupResult, formData: FormData) => Promise<LookupResult>;
type ResetHandler = (prevState: ResetResult, formData: FormData) => Promise<ResetResult>;

enum LookupStateKind {
  Password = "password",
  Missing = "missing",
}

const lookupHandler: LookupHandler = async (_prev, formData) => {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  formData.set("email", email);
  const { startAuth } = await import("@/app/(shop)/auth/actions");
  return startAuth(null as Parameters<StartAuthFn>[0], formData);
};

const resetHandler: ResetHandler = async (_prev, formData) => {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    return { kind: "fail", message: "이메일을 입력해 주세요." } as Awaited<ReturnType<RequestPasswordResetFn>>;
  }
  formData.set("email", email);
  const { requestPasswordReset } = await import("@/app/(shop)/auth/actions");
  return requestPasswordReset(null as Parameters<RequestPasswordResetFn>[0], formData);
};

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";
  const presetEmail = (sp.get("email") || "").toLowerCase();

  const [emailInput, setEmailInput] = useState(presetEmail);
  const [stage, setStage] = useState<Stage>(presetEmail ? LookupStateKind.Password : "email");
  const [feedback, setFeedback] = useState<SignInResult | ResetResult | null>(null);

  const passwordRef = useRef<HTMLInputElement | null>(null);

  const [lookupResult, lookupAction, lookupPending] = useActionState<LookupResult, FormData>(lookupHandler, null);
  const [loginResult, loginAction, loginPending] = useActionState<SignInResult, FormData>(signIn as any, null);
  const [resetResult, resetAction, resetPending] = useActionState<ResetResult, FormData>(resetHandler, null);

  useEffect(() => {
    if (!lookupResult) return;
    if (typeof lookupResult === "object" && lookupResult !== null) {
      if ("redirect" in lookupResult && typeof lookupResult.redirect === "string") {
        if (lookupResult.redirect.startsWith("/login")) {
          setStage(LookupStateKind.Password);
          setFeedback(null);
        } else if (lookupResult.redirect.startsWith("/signup")) {
          setStage(LookupStateKind.Missing);
          setFeedback(null);
        }
        return;
      }
      if ("kind" in lookupResult) {
        setFeedback(lookupResult as any);
      }
    }
  }, [lookupResult]);

  useEffect(() => {
    if (!loginResult) return;
    setFeedback(loginResult);
    if ((loginResult as any).kind === "ok") {
      router.replace(next);
    }
  }, [loginResult, router, next]);

  useEffect(() => {
    if (!resetResult) return;
    setFeedback(resetResult);
  }, [resetResult]);

  useEffect(() => {
    if (stage === LookupStateKind.Password) {
      const timer = setTimeout(() => passwordRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [stage]);

  const disabledLookup = lookupPending || !emailInput.trim();
  const disabledLogin = loginPending;
  const disabledReset = resetPending || !emailInput.trim();

  const showPassword = stage === LookupStateKind.Password;
  const showMissing = stage === LookupStateKind.Missing;

  const continueLabel = lookupPending ? "확인 중..." : "계속";
  const loginLabel = loginPending ? "로그인 중..." : "로그인";
  const submitLabel = showPassword ? loginLabel : continueLabel;

  const submitDisabled = showPassword ? disabledLogin : disabledLookup;

  const handleEmailChange = (value: string) => {
    setEmailInput(value);
    setStage("email");
    setFeedback(null);
    if (passwordRef.current) {
      passwordRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="mx-auto w-full max-w-md rounded-none border border-gray-200 bg-white p-10 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">로그인</h1>
        <p className="mt-2 text-sm text-gray-600">
          이메일을 입력하면 계정을 확인하고, 존재하는 계정이라면 비밀번호 입력창이 나타납니다.
        </p>
        {feedback && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              feedback.kind === "ok"
                ? "border-gray-200 bg-gray-50 text-gray-800"
                : "border-gray-200 bg-white text-gray-800"
            }`}
            role="status"
            aria-live="polite"
          >
            {feedback.message}
          </div>
        )}

        <form
          action={(formData: FormData) => {
            const email = String(formData.get("email") ?? "").trim().toLowerCase();
            setFeedback(null);
            setEmailInput(email);
            formData.set("email", email);
            if (showPassword) {
              return loginAction(formData);
            }
            setStage("email");
            return lookupAction(formData);
          }}
          className="mt-6"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={emailInput}
              onChange={(event) => handleEmailChange(event.target.value)}
              required
              className="w-full rounded-none border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/20"
              placeholder="name@example.com"
              autoComplete="email"
            />
          </div>

          <div
            className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
              showPassword ? "mt-4 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
            }`}
            aria-hidden={!showPassword}
          >
            <div className="overflow-hidden">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                  비밀번호
                </label>
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type="password"
                  disabled={!showPassword}
                  required={showPassword}
                  className="w-full rounded-none border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/20 disabled:cursor-not-allowed"
                  autoComplete="current-password"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitDisabled}
            className="mt-4 w-full rounded-none bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </form>

        <div
          className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
            showPassword ? "mt-3 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <form
              action={(formData: FormData) => {
                formData.set("email", emailInput);
                return resetAction(formData);
              }}
              className="text-sm"
            >
              <input type="hidden" name="email" value={emailInput} />
              <button
                type="submit"
                disabled={disabledReset}
                className="text-sm font-medium text-gray-700 underline underline-offset-4 transition hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                비밀번호를 잊으셨나요?
              </button>
            </form>
          </div>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ${
            showMissing ? "max-h-72 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="mt-6 rounded-none border border-gray-200 bg-white p-5 text-sm text-gray-800">
            <p className="font-medium">계정을 찾을 수 없습니다.</p>
            <p className="mt-2 text-xs text-gray-600">
              입력한 이메일로 새 계정을 만들려면 아래 버튼을 눌러 회원가입을 진행해 주세요.
            </p>
            <a
              href={`/signup?email=${encodeURIComponent(emailInput)}`}
              className="mt-4 inline-flex w-full justify-center rounded-none bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-900"
            >
              회원가입으로 이동
            </a>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-gray-600">
          아직 회원이 아니신가요?{" "}
          <a className="font-semibold text-gray-900 underline" href={`/signup?email=${encodeURIComponent(emailInput)}`}>
            회원가입
          </a>
        </p>
      </div>
    </div>
  );
}
