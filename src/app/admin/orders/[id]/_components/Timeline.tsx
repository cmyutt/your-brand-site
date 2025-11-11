"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Copy as CopyIcon, Check, CheckCircle2, StickyNote, Webhook } from "lucide-react";

export type TimelineEvent = {
  id: string;
  type: "STATUS_CHANGED" | "NOTE" | "WEBHOOK" | string;
  from?: string | null;
  to?: string | null;
  note?: string | null;
  actor?: string | null;
  createdAt: string | Date;
  // 서버가 넣어줄 수도 있는 확장 필드 (없어도 동작)
  diff?: unknown;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기중",
  PAID: "결제완료",
  FULFILLED: "배송완료",
  CANCELED: "취소됨",
  REFUNDED: "환불됨",
};
function kStatus(s?: string | null): string {
  if (!s) return "—";
  const u = s.toUpperCase();
  return STATUS_LABEL[u] ?? s;
}

/* ===== 날짜 헬퍼: KST 기준으로 통일 ===== */
function ymdKST(d: Date): string {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  const da = parts.find((p) => p.type === "day")?.value ?? "00";
  return `${y}-${m}-${da}`;
}
function isSameKSTDay(a: Date, b: Date) {
  return ymdKST(a) === ymdKST(b);
}
function dayKeyKST(d: Date): string {
  return ymdKST(d);
}

type Kind = "STATUS_CHANGED" | "NOTE" | "WEBHOOK" | string;

export default function Timeline({
  events,
  autoFocusNewTopNote = true,
  showFilters = true,
  defaultEnabled,
}: {
  events: TimelineEvent[];
  /** 최상단 NOTE가 바뀌면 자동 스크롤/하이라이트 */
  autoFocusNewTopNote?: boolean;
  /** 상단 필터칩 표시 */
  showFilters?: boolean;
  /** 기본 활성화 타입 (미지정시 전부 on) */
  defaultEnabled?: Kind[];
}) {
  if (!events?.length) {
    return <div className="text-sm text-gray-500">이력 없음</div>;
  }

  // '오늘/어제' 기준을 마운트 시점으로 고정(하이드레이션 경고 방지)
  const todayRef = useRef(new Date());
  const yesterdayRef = useMemo(() => {
    const y = new Date(todayRef.current);
    y.setDate(y.getDate() - 1);
    return y;
  }, []);

  // --- 새 메모 최상단 감지 & 하이라이트 ---
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const prevTopId = useRef<string | null>(null);

  useEffect(() => {
    const top = events[0];
    if (!autoFocusNewTopNote || !top) return;
    if (top.id !== prevTopId.current && top.type === "NOTE") {
      prevTopId.current = top.id;
      setHighlightId(top.id);

      document.getElementById(`ev-${top.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      const t = setTimeout(() => setHighlightId(null), 1600);
      return () => clearTimeout(t);
    }
    prevTopId.current = top.id;
  }, [events, autoFocusNewTopNote]);

  // ----- 타입 카운트/필터 상태 -----
  const typeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      const k = (e.type || "").toUpperCase();
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [events]);

  const allKinds = useMemo<Kind[]>(
    () => Array.from(new Set<Kind>(events.map((e) => (e.type || "").toUpperCase()))),
    [events]
  );

  const [enabled, setEnabled] = useState<Set<string>>(
    () => new Set((defaultEnabled ?? allKinds).map((k) => String(k).toUpperCase()))
  );

  const toggleKind = (k: Kind) => {
    const key = String(k).toUpperCase();
    setEnabled((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      if (n.size === 0) {
        // 최소 1개는 유지
        n.add(key);
      }
      return n;
    });
  };
  const enableAll = () => setEnabled(new Set(allKinds.map((k) => String(k).toUpperCase())));

  const filtered = useMemo(
    () => events.filter((e) => enabled.has(String(e.type || "").toUpperCase())),
    [events, enabled]
  );

  // 날짜별 그룹핑(최신 날짜 먼저)
  const groups = filtered.reduce<Record<string, TimelineEvent[]>>((acc, e) => {
    const k = dayKeyKST(new Date(e.createdAt));
    (acc[k] ||= []).push(e);
    return acc;
  }, {});
  const orderedKeys = Object.keys(groups).sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));

  return (
    <div className="relative">
      {/* 상단 필터 바 */}
      {showFilters && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {allKinds.map((k) => {
            const on = enabled.has(String(k).toUpperCase());
            const count = typeCounts.get(String(k).toUpperCase()) ?? 0;
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggleKind(k)}
                className={[
                  "inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs ring-1",
                  on ? "bg-gray-900 text-white ring-gray-900" : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50",
                ].join(" ")}
                title={`${kLabel(k)} 보기 전환`}
              >
                <KindIcon kind={k} />
                <span>{kLabel(k)}</span>
                <span className={on ? "opacity-80" : "text-gray-500"}>· {count}</span>
              </button>
            );
          })}
          {enabled.size !== allKinds.length && (
            <button
              type="button"
              onClick={enableAll}
              className="ml-1 inline-flex items-center gap-1 rounded-xl px-2 py-1 text-xs ring-1 ring-gray-300 text-gray-700 hover:bg-gray-50"
              title="모두 보기"
            >
              전체
            </button>
          )}
        </div>
      )}

      <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200" aria-hidden />
      <ul className="space-y-6">
        {orderedKeys.map((k) => {
          const sampleDate = new Date(groups[k][0].createdAt);
          const label = new Intl.DateTimeFormat("ko-KR", {
            timeZone: "Asia/Seoul",
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "short",
          }).format(sampleDate);

          const isToday = isSameKSTDay(sampleDate, todayRef.current);
          const isYesterday = isSameKSTDay(sampleDate, yesterdayRef);

          return (
            <li key={k}>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block w-4 h-4 rounded-full bg-gray-300" />
                <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
                {isToday && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                    오늘
                  </span>
                )}
                {isYesterday && !isToday && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
                    어제
                  </span>
                )}
              </div>

              <ul className="ml-5 space-y-3">
                {groups[k].map((e) => {
                  const isHL = highlightId === e.id;
                  return (
                    <li
                      key={e.id}
                      id={`ev-${e.id}`}
                      className={[
                        "grid gap-1 rounded-xl ring-1 ring-gray-200 bg-white p-3 transition-colors",
                        isHL ? "bg-blue-50 ring-blue-200" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge kind={e.type} from={e.from} to={e.to} />
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {renderTitle(e)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-xs text-gray-500">
                          <span>
                            {new Intl.DateTimeFormat("ko-KR", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            }).format(new Date(e.createdAt))}
                          </span>
                          {e.actor ? (
                            <span className="text-gray-400 flex items-center gap-1">
                              · {e.actor}
                              <CopyButton text={e.actor} />
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {e.note ? <NoteBlock text={e.note} /> : null}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function kLabel(kind: Kind) {
  const k = String(kind).toUpperCase();
  if (k === "STATUS_CHANGED") return "상태";
  if (k === "NOTE") return "메모";
  if (k === "WEBHOOK") return "웹훅";
  return k;
}

/** 타이틀 라인(이벤트별 문구) */
function renderTitle(e: TimelineEvent) {
  if (e.type === "STATUS_CHANGED") {
    return (
      <span>
        상태 변경: <StatusChip>{kStatus(e.from)}</StatusChip>
        <span className="mx-1 text-gray-400">→</span>
        <StatusChip>{kStatus(e.to)}</StatusChip>
      </span>
    );
  }
  if (e.type === "NOTE") return "메모 추가";
  if (e.type === "WEBHOOK") return "웹훅";
  return e.type;
}

/** 좌측 타입 배지 (아이콘 + 색) */
function Badge({ kind, from, to }: { kind: string; from?: string | null; to?: string | null }) {
  const k = (kind || "").toUpperCase();

  // 상태 변경 중 취소/환불은 강조색
  const isCancel = String(to || "").toUpperCase() === "CANCELED";
  const isRefund = String(to || "").toUpperCase() === "REFUNDED";

  let cls = "bg-gray-100 text-gray-700";
  if (k === "STATUS_CHANGED") cls = "bg-amber-100 text-amber-800";
  if (k === "NOTE") cls = "bg-blue-100 text-blue-700";
  if (k === "WEBHOOK") cls = "bg-purple-100 text-purple-700";
  if (k === "STATUS_CHANGED" && (isCancel || isRefund)) {
    cls = isRefund ? "bg-rose-100 text-rose-700" : "bg-orange-100 text-orange-700";
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${cls}`}>
      <KindIcon kind={k} />
      {k === "STATUS_CHANGED" ? "상태" : k === "NOTE" ? "메모" : k === "WEBHOOK" ? "웹훅" : kind}
    </span>
  );
}

function KindIcon({ kind }: { kind: Kind }) {
  const k = String(kind).toUpperCase();
  if (k === "STATUS_CHANGED") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (k === "NOTE") return <StickyNote className="h-3.5 w-3.5" />;
  if (k === "WEBHOOK") return <Webhook className="h-3.5 w-3.5" />;
  return <Check className="h-3.5 w-3.5" />;
}

/** 상태 표시 칩 */
function StatusChip({ children }: { children: React.ReactNode }) {
  const text = String(children);
  const u = text.toUpperCase();
  const tint =
    u === "CANCELED"
      ? "ring-orange-200 bg-orange-50"
      : u === "REFUNDED"
      ? "ring-rose-200 bg-rose-50"
      : "ring-gray-200 bg-gray-50";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs ring-1 ${tint}`}>
      {children}
    </span>
  );
}

/* ---------- 긴 메모 3줄 클램프 + 더보기/접기 ---------- */

type ClampStyle = React.CSSProperties & {
  WebkitLineClamp?: number;
  WebkitBoxOrient?: "vertical" | "horizontal";
};

function NoteBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const pRef = useRef<HTMLParagraphElement | null>(null);

  // overflow 여부 측정
  useEffect(() => {
    const el = pRef.current;
    if (!el) return;

    const detect = () => {
      // 벤더 속성은 setProperty로 안전하게 설정
      el.style.display = "-webkit-box";
      (el.style as any).setProperty("-webkit-box-orient", "vertical");
      (el.style as any).setProperty("-webkit-line-clamp", "3");
      el.style.overflow = "hidden";

      const overflowing = el.scrollHeight > el.clientHeight + 1;
      setShowToggle(overflowing);
    };

    const id = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(id);
  }, [text]);

  const commonCls = "text-sm text-gray-700 whitespace-pre-wrap";

  const collapsedStyle: ClampStyle = {
    display: "-webkit-box",
    overflow: "hidden",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
  };

  return (
    <div>
      <p
        ref={pRef}
        className={commonCls}
        style={expanded ? { display: "block", overflow: "visible" } : collapsedStyle}
      >
        {text}
      </p>

      {showToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs text-gray-600 hover:text-gray-900 underline underline-offset-2"
        >
          {expanded ? "접기" : "더보기"}
        </button>
      ) : null}
    </div>
  );
}

/* ---------- 복사 버튼(아이콘) ---------- */
function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);

  async function onCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // fallback
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setDone(true);
      setTimeout(() => setDone(false), 1200);
    } catch {
      /* noop */
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      title="actor 복사"
      aria-label="actor 복사"
      className="inline-flex items-center justify-center rounded ring-1 ring-gray-300 hover:bg-gray-50 text-gray-600 h-5 w-5"
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
    </button>
  );
}
