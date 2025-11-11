import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildAdminLogQuery } from "@/lib/adminLogQuery";

export const runtime = "nodejs"; // 스트리밍 용이

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // 따옴표/줄바꿈/쉼표가 있으면 전체를 ""로 감싸고 내부 따옴표는 두 번 반복
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function nowStamp() {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, "0");
  return (
    d.getFullYear().toString() +
    p(d.getMonth() + 1) +
    p(d.getDate()) +
    "_" +
    p(d.getHours()) +
    p(d.getMinutes()) +
    p(d.getSeconds())
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp = url.searchParams; // URLSearchParams 그대로 전달

  // 목록 페이지와 동일한 필터 사용
  const { where, orderBy } = buildAdminLogQuery(sp);

  // CSV 헤더 라인
  const header = [
    "id",
    "createdAt",
    "actor",
    "action",
    "targetType",
    "targetId",
  ].join(",") + "\n";

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode("\uFEFF")); // BOM (엑셀 호환)
      controller.enqueue(encoder.encode(header));

      let cursor: string | null = null;
      const batchSize = 1000; // 큰 데이터도 안전하게 스트리밍

      try {
        while (true) {
          const batch = await prisma.adminLog.findMany({
            where,
            orderBy,
            take: batchSize,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            select: {
              id: true,
              createdAt: true,
              actor: true,
              action: true,
              targetType: true,
              targetId: true,
            },
          });

          if (batch.length === 0) break;

          for (const row of batch) {
            const line = [
              csvEscape(row.id),
              csvEscape(new Date(row.createdAt).toISOString()),
              csvEscape(row.actor),
              csvEscape(row.action),
              csvEscape(row.targetType),
              csvEscape(row.targetId),
            ].join(",") + "\n";
            controller.enqueue(encoder.encode(line));
          }

          cursor = batch[batch.length - 1].id as string;
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });

  const filename = `admin_logs_${nowStamp()}.csv`;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
      "Cache-Control": "no-store",
    },
  });
}
