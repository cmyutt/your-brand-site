"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { signIn } from "@/app/(shop)/auth/actions";

type StartAuthFn = typeof import("@/app/(shop)/auth/actions").startAuth;
type RequestPasswordResetFn = typeof import("@/app/(shop)/auth/actions").requestPasswordReset;

type LookupResult = Awaited<ReturnType<StartAuthFn>> | null;
type ResetResult = Awaited<ReturnType<RequestPasswordResetFn>> | null;
type SignInResult = Awaited<ReturnType<typeof signIn>> | null;

type Stage = "email" | "password" | "signup";

const PANEL_TRANSITION_MS = 200;

const lookupHandler = async (_prev: LookupResult, formData: FormData): Promise<LookupResult> => {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  formData.set("email", email);
  const { startAuth } = await import("@/app/(shop)/auth/actions");
  return startAuth(null as Parameters<StartAuthFn>[0], formData);
};

const resetHandler = async (_prev: ResetResult, formData: FormData): Promise<ResetResult> => {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    return { kind: "fail", message: "이메일을 입력해 주세요." } as Awaited<ReturnType<RequestPasswordResetFn>>;
  }
  formData.set("email", email);
  const { requestPasswordReset } = await import("@/app/(shop)/auth/actions");
  return requestPasswordReset(null as Parameters<RequestPasswordResetFn>[0], formData);
};

export default function AuthPanel() {
  const [panelVisible, setPanelVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [stage, setStage] = useState<Stage>("email");
  const [panelMessage, setPanelMessage] = useState<string | null>(null);

  const passwordRef = useRef<HTMLInputElement | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lookupResult, lookupAction, lookupPending] = useActionState<LookupResult, FormData>(lookupHandler, null);
  const [loginResult, loginAction, loginPending] = useActionState<SignInResult, FormData>(signIn as any, null);
  const [resetResult, resetAction, resetPending] = useActionState<ResetResult, FormData>(resetHandler, null);

  useEffect(() => {
    if (!lookupResult) return;

    if (typeof lookupResult === "object" && lookupResult !== null) {
      const result = lookupResult as any;

      if (typeof result.redirect === "string") {
        if (result.redirect.startsWith("/login")) {
          setStage("password");
        } else if (result.redirect.startsWith("/signup")) {
          setStage("signup");
        }
        setPanelMessage(null);
        showPanel();
        return;
      }

      if (typeof result.kind === "string") {
        if (result.kind === "ok") {
          setPanelMessage(null);
        } else {
          const message =
            typeof result.message === "string"
              ? result.message
              : "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
          setPanelMessage(message);
        }
      }
    }
  }, [lookupResult]);

  useEffect(() => {
    if (!loginResult) return;

    if (typeof loginResult === "object" && loginResult !== null) {
      const result = loginResult as any;

      if (typeof result.kind === "string") {
        if (result.kind === "ok") {
          setPanelMessage(null);
          closePanel();
          return;
        }

        const message =
          typeof result.message === "string"
            ? result.message
            : "로그인에 실패했어요. 정보를 확인하고 다시 시도해 주세요.";
        setPanelMessage(message);
      }
    }
  }, [loginResult]);

  useEffect(() => {
    if (!resetResult) return;

    if (typeof resetResult === "object" && resetResult !== null) {
      const result = resetResult as any;

      if (typeof result.kind === "string") {
        if (result.kind === "ok") {
          setPanelMessage(null);
        } else {
          const message =
            typeof result.message === "string"
              ? result.message
              : "비밀번호 재설정 요청에 실패했어요. 잠시 후 다시 시도해 주세요.";
          setPanelMessage(message);
        }
      }
    }
  }, [resetResult]);

  useEffect(() => {
    if (open && stage === "password") {
      const timer = setTimeout(() => passwordRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, stage]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const disabledLookup = lookupPending || !emailInput.trim();
  const disabledLogin = loginPending;
  const disabledReset = resetPending || !emailInput.trim();

  const continueLabel = useMemo(() => (lookupPending ? "확인 중..." : "계속"), [lookupPending]);
  const showPassword = stage === "password";
  const submitDisabled = showPassword ? disabledLogin : disabledLookup;
  const submitLabel = showPassword ? (loginPending ? "로그인 중..." : "로그인") : continueLabel;

  const handleEmailChange = (value: string) => {
    setEmailInput(value);
    setStage("email");
    setPanelMessage(null);
  };

  const showPanel = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    setPanelMessage(null);

    const shouldAnimate = !panelVisible || !open;

    if (!panelVisible) {
      setPanelVisible(true);
    }

    if (shouldAnimate) {
      setOpen(false);
      requestAnimationFrame(() => setOpen(true));
    } else {
      setOpen(true);
    }
  };

  const closePanel = () => {
    setOpen(false);
    setPanelMessage(null);
    hideTimerRef.current = setTimeout(() => {
      setPanelVisible(false);
      setStage("email");
      hideTimerRef.current = null;
    }, PANEL_TRANSITION_MS);
  };

  const currentEmail = emailInput.trim().toLowerCase();

  return (
    <>
      {panelVisible ? (
        <button
          type="button"
          aria-label="배경 닫기"
          onClick={closePanel}
          className={`fixed inset-0 z-40 bg-transparent transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}

      <div className="relative z-50">
        {!panelVisible ? (
          <button
            type="button"
            onClick={() => {
              showPanel();
            }}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition hover:bg-gray-50"
          >
            로그인 / 계정 생성
          </button>
        ) : null}

        {panelVisible ? (
          <div
            className={`absolute right-0 z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] origin-center rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl ring-1 ring-black/5 transition-transform duration-200 ease-in-out sm:p-5 ${
              open ? "pointer-events-auto scale-100" : "pointer-events-none scale-95"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">이메일로 계속하기</h2>
                <p className="mt-1 text-sm text-gray-500">이메일을 확인해 로그인 또는 회원가입 단계를 안내해 드립니다.</p>
              </div>
              <button
                type="button"
                onClick={closePanel}
                aria-label="패널 닫기"
                className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <span aria-hidden="true">X</span>
              </button>
            </div>

            {panelMessage ? (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{panelMessage}</p>
            ) : null}

            <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="p-4">
                <form
                  action={(formData: FormData) => {
                    if (stage === "password") {
                      formData.set("email", currentEmail);
                      setPanelMessage(null);
                      return loginAction(formData);
                    }

                    const email = String(formData.get("email") ?? "").trim().toLowerCase();
                    formData.set("email", email);
                    setPanelMessage(null);
                    setEmailInput(email);
                    setStage("email");
                    showPanel();
                    return lookupAction(formData);
                  }}
                  className="flex flex-col"
                >
                  <label className="block text-sm font-medium text-gray-700" htmlFor="panel-email">
                    이메일
                  </label>
                  <input
                    id="panel-email"
                    name="email"
                    type="email"
                    value={emailInput}
                    onChange={(event) => handleEmailChange(event.target.value)}
                    required
                    autoComplete="email"
                    className={`mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black ${
                      lookupPending ? "bg-gray-50" : "bg-white"
                    }`}
                    disabled={lookupPending || loginPending}
                  />
                  <div
                    className={`overflow-hidden transition-[margin,max-height,opacity] duration-300 ${
                      showPassword ? "mt-4 max-h-32 opacity-100" : "mt-0 max-h-0 opacity-0"
                    }`}
                    aria-hidden={!showPassword}
                  >
                    {showPassword ? (
                      <div className="grid gap-2">
                        <label className="block text-sm font-medium text-gray-700" htmlFor="panel-password">
                          비밀번호
                        </label>
                        <input
                          ref={passwordRef}
                          id="panel-password"
                          name="password"
                          type="password"
                          required
                          autoComplete="current-password"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                          disabled={loginPending}
                        />
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="submit"
                    disabled={submitDisabled}
                    className={`w-full rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white transition-[margin,background-color] duration-300 hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60 ${
                      showPassword ? "mt-4" : "mt-3"
                    }`}
                  >
                    {submitLabel}
                  </button>
                </form>

                {showPassword ? (
                  <form
                    action={(formData: FormData) => {
                      formData.set("email", currentEmail);
                      setPanelMessage(null);
                      return resetAction(formData);
                    }}
                    className="mt-3"
                  >
                    <input type="hidden" name="email" value={currentEmail} />
                    <button
                      type="submit"
                      disabled={disabledReset}
                      className="text-xs font-medium text-gray-600 underline underline-offset-4 transition hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      비밀번호를 잊으셨나요?
                    </button>
                  </form>
                ) : null}
              </div>

              <div
                className={`overflow-hidden border-t border-gray-100 transition-[max-height] duration-300 ${
                  stage === "signup" ? "max-h-[220px]" : "max-h-0"
                }`}
                aria-hidden={stage !== "signup"}
              >
                {stage === "signup" ? (
                  <div className="px-4 pb-4 pt-3 text-sm text-gray-700">
                    <p className="font-medium text-gray-900">등록된 계정을 찾을 수 없어요.</p>
                    <p className="mt-2 text-xs text-gray-600">입력한 이메일로 새 계정을 만들려면 아래 버튼을 눌러 주세요.</p>
                    <a
                      href={`/signup?email=${encodeURIComponent(currentEmail)}`}
                      className="mt-4 inline-flex w-full justify-center rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-900"
                    >
                      회원가입으로 이동
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
