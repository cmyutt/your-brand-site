import type { NextRequest } from "next/server";
import { bus } from "@/lib/bus";

// ✅ 반드시 Node 런타임 + 동적 처리 + 재검증 없음
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  // 여러 토픽 구독 가능: ?topic=orders:update&topic=logs:update
  const topics = searchParams.getAll("topic");
  const listenTopics = topics.length > 0 ? topics : ["orders:update"];

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();

      // 구독 핸들러 등록
      const unsubscribes = listenTopics.map((t) =>
        bus.subscribe<any>(t, (payload) => {
          try {
            const data = JSON.stringify({ topic: t, payload });
            controller.enqueue(enc.encode(`event: message\ndata: ${data}\n\n`));
          } catch {
            // JSON 실패 등은 무시 (연결 유지)
          }
        })
      );

      // 초기 핑 + 주기 핑
      controller.enqueue(enc.encode(`event: ping\ndata: hello\n\n`));
      const hb = setInterval(() => {
        controller.enqueue(enc.encode(`event: ping\ndata: ${Date.now()}\n\n`));
      }, 15000);

      // 연결 종료 처리
      const close = () => {
        try {
          clearInterval(hb);
          unsubscribes.forEach((u) => u());
          controller.close();
        } catch {
          // 이미 닫혔을 수 있음
        }
      };

      // Next의 AbortSignal 지원
      // @ts-ignore - 런타임에서 존재
      req.signal?.addEventListener?.("abort", close);
    },
    cancel() {
      // 클라이언트가 수동으로 close() 할 때도 안전하게 정리
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // 프록시 버퍼 회피(nginx 등). Vercel 환경에서도 무해.
      "X-Accel-Buffering": "no",
    },
  });
}
