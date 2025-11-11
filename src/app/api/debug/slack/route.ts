// src/app/api/debug/slack/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { notifySlack, slackMode } from "@/lib/notify";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ping = url.searchParams.get("ping") === "1";

  const mode = slackMode();
  const configured =
    mode === "token"
      ? { SLACK_BOT_TOKEN: !!process.env.SLACK_BOT_TOKEN, SLACK_CHANNEL_ID: !!process.env.SLACK_CHANNEL_ID }
      : mode === "webhook"
      ? { SLACK_WEBHOOK_URL: !!process.env.SLACK_WEBHOOK_URL }
      : {};

  let pingResult: any = null;
  if (ping && mode !== "disabled") {
    pingResult = await notifySlack(`✅ Slack ping (${new Date().toISOString()})`);
  }

  return NextResponse.json({ mode, configured, ping: pingResult });
}
