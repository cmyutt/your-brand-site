// src/lib/notify.ts
/**
 * Slack 통합 유틸
 * - 두 모드 지원:
 *   1) Bot Token: SLACK_BOT_TOKEN + SLACK_CHANNEL_ID
 *   2) Incoming Webhook: SLACK_WEBHOOK_URL
 * - 미설정이면 no-op
 */

type SlackMode = "token" | "webhook" | "disabled";

const cfg = {
  token: process.env.SLACK_BOT_TOKEN,    // xoxb-...
  channel: process.env.SLACK_CHANNEL_ID, // Cxxxxxx
  webhook: process.env.SLACK_WEBHOOK_URL // https://hooks.slack.com/...
};

export function slackMode(): SlackMode {
  if (cfg.token && cfg.channel) return "token";
  if (cfg.webhook) return "webhook";
  return "disabled";
}

function withTimeout(ms: number) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort("timeout"), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(id) };
}

export async function notifySlack(
  text: string,
  opts?: { blocks?: any; channel?: string }
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const mode = slackMode();
  if (mode === "disabled") return { ok: false, reason: "disabled" };

  try {
    if (mode === "token") {
      const { signal, clear } = withTimeout(7000);
      const res = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${cfg.token}`,
        },
        body: JSON.stringify({
          channel: opts?.channel || cfg.channel,
          text,
          blocks: opts?.blocks,
          unfurl_links: false,
          unfurl_media: false,
        }),
        signal,
      });
      clear();
      const data = (await res.json()) as { ok: boolean; error?: string };
      return data.ok ? { ok: true } : { ok: false, reason: data.error || "slack_error" };
    }

    // webhook
    const { signal, clear } = withTimeout(7000);
    const res = await fetch(cfg.webhook!, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ text, blocks: opts?.blocks }),
      signal,
    });
    clear();
    return res.ok ? { ok: true } : { ok: false, reason: `http_${res.status}` };
  } catch (e) {
    return { ok: false, reason: (e as Error).message || "fetch_failed" };
  }
}

/** 과거 호환: 실패 무시 */
export async function notifySlackSafe(text: string) {
  try {
    await notifySlack(text);
  } catch {
    /* noop */
  }
}

/** 주문 이벤트 알림(멀티라인 한국어 템플릿) */
export async function notifyOrderEvent(input: {
  orderId: string;
  type: "STATUS_CHANGED" | "NOTE" | "WEBHOOK" | string;
  from?: string | null;
  to?: string | null;
  note?: string | null;
  actor?: string | null;
}) {
  const { orderId, type, from, to, note, actor } = input;
  const short = `#${orderId.slice(0, 8)}`;
  const t = (s?: string | null) =>
    ({
      PENDING: "대기중",
      PAID: "결제완료",
      FULFILLED: "배송완료",
      CANCELED: "취소됨",
      REFUNDED: "환불됨",
    } as const)[s || ""] || s || "—";

  let text = "";
  if (type === "STATUS_CHANGED") {
    text =
`⚠️ 주문 상태 변경
• 주문번호: ${short}
• ${t(from)} → ${t(to)}
• 처리자: ${actor ?? "admin"}` + (note ? `\n• 메모: ${note}` : "");
  } else if (type === "NOTE") {
    text =
`📝 주문 메모
• 주문번호: ${short}
• 내용: ${note ?? ""}
• 작성자: ${actor ?? "admin"}`;
  } else {
    text = `📡 주문 이벤트 ${short}: ${type}${note ? ` — ${note}` : ""}`;
  }

  return notifySlack(text);
}

/** 관리자 알림(삭제/일괄 등) */
export async function notifyAdmin(text: string) {
  return notifySlack(`⚠️ 관리자 알림\n${text}`);
}
