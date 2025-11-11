"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopToast from "@/components/TopToast";
import styles from "./requiredInput.module.css";
import type {
  sendSignupCode as SendSignupCodeFn,
  signUpWithCode as SignUpWithCodeFn,
  verifySignupCode as VerifySignupCodeFn,
} from "@/app/(shop)/auth/actions";

type ActionResult = Awaited<ReturnType<SendSignupCodeFn>>;
type AccentTone = "idle" | "typing" | "error" | "success";

type Handler = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

const sendCodeHandler: Handler = async (_, formData) => {
  const { sendSignupCode } = await import("@/app/(shop)/auth/actions");
  return sendSignupCode(null as Parameters<SendSignupCodeFn>[0], formData);
};

const completeSignupHandler: Handler = async (_, formData) => {
  const { signUpWithCode } = await import("@/app/(shop)/auth/actions");
  return signUpWithCode(null as Parameters<SignUpWithCodeFn>[0], formData);
};

const phoneCodes = [
  { value: "KR +82", label: "KR +82" },
  { value: "US +1", label: "US +1" },
  { value: "JP +81", label: "JP +81" },
  { value: "CN +86", label: "CN +86" },
];

const countryOptions = [
  { value: "Korea", label: "대한민국" },
  { value: "United States", label: "미국" },
  { value: "Japan", label: "일본" },
  { value: "China", label: "중국" },
  { value: "United Kingdom", label: "영국" },
];

function formatCooldown(seconds: number) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function normalizeBirthdate(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  if (digits.length === 6) {
    const year = Number(digits.slice(0, 2));
    const month = digits.slice(2, 4);
    const day = digits.slice(4, 6);
    const currentYear = new Date().getFullYear() % 100;
    const century = year > currentYear ? 1900 : 2000;
    return `${century + year}-${month}-${day}`;
  }
  return "";
}

const passwordInvalidPattern = /[^A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g;

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(initialEmail);
  const [toast, setToast] = useState<ActionResult | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSentRef = useRef(false);
  const prevEmailRef = useRef(initialEmail);

  const [birthRaw, setBirthRaw] = useState("");
  const [birthFormatted, setBirthFormatted] = useState("");
  const [birthFocused, setBirthFocused] = useState(false);

  const [codeValue, setCodeValue] = useState("");
  const [codeStatus, setCodeStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [codeMessage, setCodeMessage] = useState("");
  const [codeTone, setCodeTone] = useState<AccentTone>("idle");
  const [familyTone, setFamilyTone] = useState<AccentTone>("idle");
  const [givenTone, setGivenTone] = useState<AccentTone>("idle");
  const [passwordTone, setPasswordTone] = useState<AccentTone>("idle");
  const [codePulse, setCodePulse] = useState(0);
  const [familyPulse, setFamilyPulse] = useState(0);
  const [givenPulse, setGivenPulse] = useState(0);
  const [passwordPulse, setPasswordPulse] = useState(0);
  const [showPolicyPopup, setShowPolicyPopup] = useState(false);
  const privacyConsentRef = useRef<HTMLInputElement | null>(null);

  const [sendResult, sendAction, sendPending] = useActionState<ActionResult | null>(sendCodeHandler, null);
  const [signupResult, signupAction, signupPending] = useActionState<ActionResult | null>(completeSignupHandler, null);
  const [isResending, startResendTransition] = useTransition();
  const [isVerifyingCode, startVerifyTransition] = useTransition();

  const finalBirthValue = normalizeBirthdate(birthRaw) || birthFormatted;
  const updateTone = (
    currentTone: AccentTone,
    setToneFn: Dispatch<SetStateAction<AccentTone>>,
    setPulseFn: Dispatch<SetStateAction<number>>,
    tone: AccentTone,
  ) => {
    if (currentTone === tone) return;
    setToneFn(tone);
    setPulseFn((prev) => prev + 1);
  };
  const setCodeToneState = (tone: AccentTone) => updateTone(codeTone, setCodeTone, setCodePulse, tone);
  const setFamilyToneState = (tone: AccentTone) => updateTone(familyTone, setFamilyTone, setFamilyPulse, tone);
  const setGivenToneState = (tone: AccentTone) => updateTone(givenTone, setGivenTone, setGivenPulse, tone);
  const setPasswordToneState = (tone: AccentTone) => updateTone(passwordTone, setPasswordTone, setPasswordPulse, tone);
  const composeWrapperClass = (tone: AccentTone, pulse: number) => {
    const classes = [styles.requiredInputWrapper];
    const useAltAnimation = pulse % 2 === 1;
    if (tone === "success") {
      classes.push(
        styles.requiredInputSuccess,
        useAltAnimation ? styles.animateSuccessAlt : styles.animateSuccess,
      );
    } else {
      classes.push(styles.requiredInputHighlight);
      if (tone === "error") {
        classes.push(useAltAnimation ? styles.animateErrorAlt : styles.animateError);
      }
    }
    if (tone === "typing") classes.push(styles.requiredInputTyping);
    return classes.join(" ");
  };
  const composeToneBorderClass = (tone: AccentTone) => {
    if (tone === "success") return styles.requiredInputSuccessBorder;
    if (tone === "typing") return styles.requiredInputTypingBorder;
    if (tone === "error") return styles.requiredInputErrorBorder;
    return styles.requiredInputHighlightBorder;
  };
  const codeWrapperClass = useMemo(
    () => `${composeWrapperClass(codeTone, codePulse)} ${composeToneBorderClass(codeTone)}`,
    [codeTone, codePulse],
  );
  const familyWrapperClass = useMemo(
    () => `${composeWrapperClass(familyTone, familyPulse)} ${composeToneBorderClass(familyTone)}`,
    [familyTone, familyPulse],
  );
  const givenWrapperClass = useMemo(
    () => `${composeWrapperClass(givenTone, givenPulse)} ${composeToneBorderClass(givenTone)}`,
    [givenTone, givenPulse],
  );
  const passwordWrapperClass = useMemo(
    () => `${composeWrapperClass(passwordTone, passwordPulse)} ${composeToneBorderClass(passwordTone)}`,
    [passwordTone, passwordPulse],
  );

  useEffect(() => {
    if (!email || autoSentRef.current) return;
    autoSentRef.current = true;
    const fd = new FormData();
    fd.set("email", email);
    startResendTransition(() => sendAction(fd));
  }, [email, sendAction, startResendTransition]);

  useEffect(() => {
    if (prevEmailRef.current !== email) {
      setCodeValue("");
      setCodeStatus("idle");
      setCodeMessage("");
      setCodeToneState("idle");
      setCooldown(0);
      autoSentRef.current = false;
      prevEmailRef.current = email;
    }
  }, [email]);

  useEffect(() => {
    if (!sendResult) return;
    const toastPayload =
      sendResult.kind === "ok"
        ? { ...sendResult, message: `이메일 인증 코드를 ${email}로 전송했어요.` }
        : sendResult;
    setToast(toastPayload);
    setCodeToneState(sendResult.kind === "ok" ? "typing" : "error");
    if (sendResult.kind !== "ok") return;

    setCooldown(180);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [sendResult]);

  useEffect(() => {
    if (!signupResult) return;
    setToast(signupResult);
    if (signupResult.kind === "ok") router.replace("/");
  }, [signupResult, router]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const disabledSend = !email || cooldown > 0 || sendPending || isResending;
  const disabledSignup = signupPending;

  const handleQuickResend = () => {
    if (disabledSend) return;
    const fd = new FormData();
    fd.set("email", email);
    setToast(null);
    setCodeValue("");
    setCodeStatus("idle");
    setCodeMessage("");
    setCodeToneState("idle");
    startResendTransition(() => sendAction(fd));
  };

  const resendTitle = useMemo(() => {
    if (disabledSend && cooldown > 0) return `남은 시간 ${formatCooldown(cooldown)}`;
    return "인증 코드 재전송";
  }, [disabledSend, cooldown]);

  const birthDisplay = birthFocused ? birthRaw : birthFormatted || birthRaw;

  const handleBirthChange = (value: string) => {
    const filtered = value.replace(/[^0-9./-]/g, "").slice(0, 11);
    const digits = filtered.replace(/\D/g, "").slice(0, 8);
    let composed = "";
    let digitIndex = 0;
    for (const ch of filtered) {
      if (/\d/.test(ch)) {
        if (digitIndex < digits.length) composed += digits[digitIndex++];
      } else {
        composed += ch;
      }
    }
    setBirthRaw(composed);
  };

  const handleBirthBlur = () => {
    setBirthFocused(false);
    const normalized = normalizeBirthdate(birthRaw);
    if (normalized) {
      setBirthFormatted(normalized);
    } else {
      setBirthFormatted("");
    }
  };

  const birthHiddenValue = finalBirthValue;

  const verifyCode = async (currentEmail: string, code: string) => {
    const fd = new FormData();
    fd.set("email", currentEmail);
    fd.set("code", code);
    const { verifySignupCode } = await import("@/app/(shop)/auth/actions");
    return verifySignupCode(null as Parameters<VerifySignupCodeFn>[0], fd);
  };

  const handleCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCodeValue(digits);

    if (!digits) {
      setCodeStatus("idle");
      setCodeMessage("");
      setCodeToneState("idle");
      return;
    }

    if (digits.length < 6) {
      if (codeStatus !== "idle") {
        setCodeStatus("idle");
        setCodeMessage("");
      }
      setCodeToneState("typing");
      return;
    }

    if (!email) return;

    setCodeStatus("idle");
    setCodeToneState("typing");
    startVerifyTransition(async () => {
      setCodeMessage("");
      try {
        const res = await verifyCode(email, digits);
        if (res.kind === "ok") {
          setCodeStatus("valid");
          setCodeMessage(res.message || "인증 코드가 확인되었습니다.");
          setCodeToneState("success");
        } else {
          setCodeStatus("invalid");
          setCodeMessage(res.message || "인증 코드를 다시 확인해 주세요.");
          setCodeToneState("error");
        }
      } catch (error) {
        setCodeStatus("invalid");
        setCodeMessage("인증 코드를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
        setCodeToneState("error");
      }
    });
  };

  const handlePasswordChange = (value: string) => {
    const sanitized = value.replace(passwordInvalidPattern, "");
    setPassword(sanitized);
    if (!sanitized) {
      setPasswordToneState("idle");
    } else if (sanitized.length >= 8) {
      setPasswordToneState("success");
    } else {
      setPasswordToneState("typing");
    }
  };

  return (
    <div className="min-h-screen bg-white py-12">
      <TopToast trigger={toast} />
      <div className="mx-auto w-full max-w-lg px-5">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">계정 만들기</h1>
          <p className="text-sm leading-6 text-gray-600">
            계정을 만들면 온라인과 매장에서 모두 개인화된 서비스를 이용할 수 있어요. 인증 코드를 입력하고 필수 정보를 작성하면 가입이 완료됩니다.
          </p>
        </header>

        <section className="mt-6 text-sm text-gray-700">
          <div className="flex flex-col gap-2 border border-gray-300 bg-white px-4 py-3">
            <span className="text-xs uppercase tracking-wide text-gray-500">인증 코드가 전송된 이메일</span>
            {editingEmail ? (
              <div className="flex items-center gap-2">
                <input
                  id="email-inline-editor"
                  value={emailDraft}
                  onChange={(event) => setEmailDraft(event.target.value)}
                  className="flex-1 border border-gray-400 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-0"
                />
                <button
                  type="button"
                  className="text-sm font-medium text-gray-900"
                  onClick={() => {
                    const trimmed = emailDraft.trim().toLowerCase();
                    if (!trimmed || trimmed === email) {
                      setEditingEmail(false);
                      setEmailDraft(email);
                      return;
                    }
                    setEmail(trimmed);
                    setEditingEmail(false);
                    setCodeValue("");
                    setCodeStatus("idle");
                    setCodeMessage("");
                    setCodeToneState("idle");
                    setCooldown(0);
                    autoSentRef.current = false;
                  }}
                >
                  저장
                </button>
                <button
                  type="button"
                  className="text-sm text-gray-500"
                  onClick={() => {
                    setEditingEmail(false);
                    setEmailDraft(email);
                  }}
                >
                  취소
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-gray-900">{email || "—"}</span>
                <button
                  type="button"
                  className="text-sm font-medium text-gray-900 underline"
                  onClick={() => {
                    setEditingEmail(true);
                    setTimeout(() => {
                      const el = document.getElementById("email-inline-editor");
                      if (el) (el as HTMLInputElement).focus();
                    }, 0);
                  }}
                >
                  이메일 변경
                </button>
              </div>
            )}
          </div>
        </section>

        <form
          action={(formData: FormData) => {
            setToast(null);
            formData.set("email", email);
            const family = String(formData.get("familyName") ?? "").trim();
            const given = String(formData.get("givenName") ?? "").trim();
            const full = [family, given].filter(Boolean).join(" ");
            if (full) formData.set("name", full);
            else formData.delete("name");
            if (birthHiddenValue) formData.set("birthdate", birthHiddenValue);
            return signupAction(formData);
          }}
          className="mt-8 space-y-4 text-sm text-gray-900"
        >
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="name" />
          <input type="hidden" name="birthdate" value={birthHiddenValue} />

          <div className="space-y-1.5">
            <label className="font-medium" htmlFor="code">
              인증 코드
            </label>
            <div className={`${codeWrapperClass} relative`} aria-readonly={codeStatus === "valid"}>
              <span aria-hidden className={styles.requiredInputEdge} />
              <input
                id="code"
                name="code"
                value={codeValue}
                onChange={(event) => handleCodeChange(event.target.value)}
                onBlur={() => {
                  if (!codeValue) {
                    setCodeToneState("error");
                  } else if (codeStatus === "valid") {
                    setCodeToneState("success");
                  } else if (codeStatus === "invalid") {
                    setCodeToneState("error");
                  }
                }}
                placeholder="코드는 10분 후 만료됩니다"
                required
                maxLength={6}
                readOnly={codeStatus === "valid"}
                inputMode="numeric"
                className={`w-full border py-3 pl-4 pr-4 text-sm outline-none focus:ring-0 ${
                  codeStatus === "valid"
                    ? "border-gray-300 bg-gray-100 text-gray-600 cursor-default"
                    : codeStatus === "invalid"
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-400 focus:border-black"
                } ${codeStatus === "valid" ? "select-none" : ""}`}
              />
              <button
                type="button"
                onClick={handleQuickResend}
                disabled={disabledSend}
                title={resendTitle}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-600 transition hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-300"
              >
                {cooldown > 0 ? formatCooldown(cooldown) : "재전송"}
              </button>
            </div>
            {codeStatus === "valid" ? (
              <p className="text-xs text-gray-500">{codeMessage || "인증 코드가 확인되었습니다."}</p>
            ) : codeStatus === "invalid" ? (
              <p className="text-xs text-red-600">{codeMessage || "인증 코드를 다시 확인해 주세요."}</p>
            ) : isVerifyingCode ? (
              <p className="text-xs text-gray-500">인증 코드를 확인하고 있습니다…</p>
            ) : (
              <p className="text-xs text-gray-500">코드는 발송 후 3분이 지나면 만료됩니다. 시간이 지나면 재전송을 눌러 주세요.</p>
            )}
          </div>

          <div className="grid gap-3 grid-cols-2">
            <div className="space-y-1.5">
              <label className="font-medium" htmlFor="familyName">
                성
              </label>
              <div className={`${familyWrapperClass} relative`} aria-readonly={familyTone === "success"}>
                <span aria-hidden className={styles.requiredInputEdge} />
                <input
                  id="familyName"
                  name="familyName"
                  required
                  onFocus={() => {
                    if (familyTone !== "success") setFamilyToneState("typing");
                  }}
                  onInput={(event) => {
                    const value = event.currentTarget.value;
                    if (familyTone === "success" && value) return;
                    setFamilyToneState(value ? "typing" : "idle");
                  }}
                  onBlur={(event) => {
                    const trimmed = event.currentTarget.value.trim();
                    setFamilyToneState(trimmed ? "success" : "error");
                  }}
                  className="w-full border border-gray-400 px-4 py-3 pl-4 text-sm outline-none focus:border-black focus:ring-0"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="font-medium" htmlFor="givenName">
                이름
              </label>
              <div className={`${givenWrapperClass} relative`} aria-readonly={givenTone === "success"}>
                <span aria-hidden className={styles.requiredInputEdge} />
                <input
                  id="givenName"
                  name="givenName"
                  required
                  onFocus={() => {
                    if (givenTone !== "success") setGivenToneState("typing");
                  }}
                  onInput={(event) => {
                    const value = event.currentTarget.value;
                    if (givenTone === "success" && value) return;
                    setGivenToneState(value ? "typing" : "idle");
                  }}
                  onBlur={(event) => {
                    const trimmed = event.currentTarget.value.trim();
                    setGivenToneState(trimmed ? "success" : "error");
                  }}
                  className="w-full border border-gray-400 px-4 py-3 pl-4 text-sm outline-none focus:border-black focus:ring-0"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-medium" htmlFor="phone">
              전화번호 (선택)
            </label>
            <div className="flex items-stretch border border-gray-400">
              <select
                name="phoneCountry"
                defaultValue={phoneCodes[0].value}
                className="border-r border-gray-300 bg-transparent px-3 text-sm outline-none focus:border-black focus:ring-0"
              >
                {phoneCodes.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                id="phone"
                name="phone"
                className="flex-1 border-0 px-4 py-3 text-sm outline-none focus:border-black focus:ring-0"
                placeholder="숫자만 입력"
                inputMode="tel"
              />
            </div>
            <p className="text-xs text-gray-500">전화번호를 남겨 주시면 주문 관련 안내 등 맞춤형 서비스를 제공할 수 있어요.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="font-medium" htmlFor="country">
                거주 국가
              </label>
              <select
                id="country"
                name="country"
                defaultValue="Korea"
                className="w-full border border-gray-400 px-4 py-3 text-sm outline-none focus:border-black focus:ring-0"
              >
                {countryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="font-medium" htmlFor="birthdate-display">
                생년월일
              </label>
              <input
                id="birthdate-display"
                value={birthDisplay}
                onChange={(event) => handleBirthChange(event.target.value)}
                onFocus={() => setBirthFocused(true)}
                onBlur={handleBirthBlur}
                className="w-full border border-gray-400 px-4 py-3 text-sm outline-none focus:border-black focus:ring-0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-medium" htmlFor="password">
              비밀번호
            </label>
            <div className={`${passwordWrapperClass} relative`} aria-readonly={passwordTone === "success"}>
              <span aria-hidden className={styles.requiredInputEdge} />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(event) => handlePasswordChange(event.target.value)}
                onFocus={() => {
                  if (passwordTone !== "success") setPasswordToneState("typing");
                }}
                onBlur={(event) => {
                  const current = event.currentTarget.value;
                  if (!current) {
                    setPasswordToneState("error");
                  } else if (current.length >= 8) {
                    setPasswordToneState("success");
                  } else {
                    setPasswordToneState("error");
                  }
                }}
                className="w-full border border-gray-400 px-4 py-3 pl-4 text-sm outline-none focus:border-black focus:ring-0"
                placeholder="비밀번호는 8-16자여야 합니다."
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-600"
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
              >
                {showPassword ? "숨김" : "표시"}
              </button>
            </div>
            <p className="text-xs text-gray-500">영문과 숫자, 특수문자를 조합해 최소 8자, 최대 16자로 설정하는 것을 추천합니다.</p>
          </div>

          <section className="space-y-3 text-sm text-gray-700">
            <h2 className="font-semibold text-gray-900">필수 약관</h2>
            <label
              className="flex items-start gap-3"
              onClick={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest("input")) return;
                if (target.closest("[data-policy-link]")) return;
                event.preventDefault();
                event.stopPropagation();
                if (!privacyConsentRef.current) return;
                privacyConsentRef.current.checked = true;
              }}
            >
              <input
                ref={privacyConsentRef}
                type="checkbox"
                name="privacyConsent"
                required
                className="mt-1"
              />
              <span className="cursor-pointer select-none">
                <strong>[필수] 개인정보 수집 및 이용 동의</strong>
                <br />
                <span className="text-xs text-gray-500">
                  <span
                    data-policy-link
                    className="font-semibold text-gray-900 underline cursor-pointer"
                    style={{ textUnderlineOffset: "4px" }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (!privacyConsentRef.current?.checked) {
                        privacyConsentRef.current.checked = true;
                      }
                      setShowPolicyPopup(true);
                    }}
                  >
                    개인정보 처리방침
                  </span>
                  을 확인했고 맞춤형 서비스를 위해 정보 수집·사용에 동의합니다.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" name="transferConsent" required className="mt-1" />
              <span>
                개인정보 국외 이전 동의 (필수)
                <br />
                <span className="text-xs text-gray-500">해외 서버 저장과 처리를 포함한 국외 이전에 동의합니다.</span>
              </span>
            </label>
          </section>

          <p className="font-semibold text-gray-900">광고성 정보를 발송하지 않습니다.</p>
          <p className="text-xs leading-5 text-gray-500">
            회원가입을 진행하면 만 16세 이상이며 개인정보 처리방침과 이용약관을 이해하고 동의했음을 확인합니다. 가입 후에도 계정 설정에서 정보와 수신 동의를 변경할 수 있습니다.
          </p>

          <button
            type="submit"
            disabled={disabledSignup}
            className="w-full bg-black py-3 text-sm font-semibold tracking-wide text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {disabledSignup ? "처리 중..." : "회원가입"}
          </button>
        </form>

        {showPolicyPopup && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setShowPolicyPopup(false)}
          >
            <div
              className="relative mx-4 w-full max-w-sm max-h-[80vh] overflow-y-auto rounded bg-white p-4 shadow-lg sm:max-w-2xl sm:p-10"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowPolicyPopup(false)}
                className="absolute right-4 top-3 text-2xl font-semibold text-gray-600 hover:text-gray-900"
                aria-label="닫기"
              >
                ×
              </button>
              <div className="space-y-4 text-sm text-gray-700">
                <p>
                  <strong>■ 수집 항목</strong>
                  <br />- 필수 항목: 이름, 이메일 주소, 비밀번호, 휴대전화번호, 주소
                  <br />- 선택 항목: 생년월일, 성별, 마케팅 수신 동의 여부 등
                </p>
                <p>
                  <strong>■ 수집 방법</strong>
                  <br />- 웹사이트 회원가입, 이벤트 응모, 상담 요청, 주문 시 입력 등
                </p>
                <p>
                  <strong>■ 수집 및 이용 목적</strong>
                  <br />- 회원 식별 및 가입 의사 확인
                  <br />- 주문·결제·배송 등 전자상거래 서비스 제공
                  <br />- 고객 문의 대응 및 A/S 처리
                  <br />- 개인 맞춤형 콘텐츠 및 혜택 제공
                </p>
                <p>
                  <strong>■ 보유 및 이용 기간</strong>
                  <br />- 회원 탈퇴 시까지 보관하며, 관계 법령에 따라 일부 정보는 다음 기간 동안 별도 보관됩니다.
                  <br />· 계약 또는 청약철회 등에 관한 기록: 5년
                  <br />· 대금결제 및 재화 등의 공급에 관한 기록: 5년
                  <br />· 소비자 불만 또는 분쟁 처리에 관한 기록: 3년
                </p>
                <p>
                  <strong>■ 동의 거부 권리 및 불이익 안내</strong>
                  <br />- 개인정보 수집·이용 동의를 거부할 권리가 있으며, 필수 항목 미동의 시 회원가입 및 서비스 이용이 제한될 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-gray-600">
          이미 계정이 있으신가요?{' '}
          <a className="font-semibold text-gray-900 underline" href={`/login?email=${encodeURIComponent(email)}`}>
            로그인
          </a>
        </p>
      </div>
    </div>
  );
}
