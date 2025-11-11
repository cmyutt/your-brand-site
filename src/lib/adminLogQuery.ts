import { Prisma } from "@prisma/client";

/**
 * Admin Logs 필터 → Prisma Query 변환 헬퍼
 * - 지원 파라미터 (쿼리스트링 키)
 *   - from: string (YYYY-MM-DD | ISO)  // createdAt 시작(포함)
 *   - to: string (YYYY-MM-DD | ISO)    // createdAt 끝(포함)
 *   - actor: string                    // 정확/부분 일치(contains)
 *   - action: string | string[]        // 다중 허용(쉼표 구분)
 *   - targetType: string | string[]    // 다중 허용(쉼표 구분)
 *   - targetId: string                 // 부분 일치(contains)
 *   - q: string                        // 키워드( message | actor | targetId )
 *   - order: "new" | "old"             // 정렬(기본: new)
 *   - page: number                     // 1-based (기본: 1)
 *   - per: number                      // 페이지 당 건수(기본: 20, 최대: 200)
 */

export type AdminLogQueryInput = URLSearchParams | Record<string, string | string[] | undefined>;

export type AdminLogQueryOutput = {
  where: Prisma.AdminLogWhereInput;
  orderBy: Prisma.AdminLogOrderByWithRelationInput;
  skip: number;
  take: number;
};

/**
 * 문자열이 비어있거나 공백뿐이면 true
 */
function isBlank(v: unknown): v is undefined | null | "" {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

function normalizeToArray(val: string | string[] | undefined): string[] | undefined {
  if (isBlank(val)) return undefined;
  if (Array.isArray(val)) return val.flatMap((s) => String(s).split(",")).map((s) => s.trim()).filter(Boolean);
  return String(val)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function getOne(sp: AdminLogQueryInput, key: string): string | undefined {
  if (sp instanceof URLSearchParams) {
    const v = sp.get(key);
    return v === null ? undefined : v;
  }
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function getMany(sp: AdminLogQueryInput, key: string): string[] | undefined {
  if (sp instanceof URLSearchParams) {
    const all = sp.getAll(key);
    if (all.length > 0) return normalizeToArray(all);
    const single = sp.get(key);
    return normalizeToArray(single ?? undefined);
  }
  return normalizeToArray(sp[key]);
}

function safeInt(v: string | undefined, fallback: number, { min, max }: { min: number; max: number }): number {
  const n = Number.parseInt(String(v ?? "").trim(), 10);
  if (Number.isFinite(n)) {
    return Math.min(Math.max(n, min), max);
  }
  return fallback;
}

function parseDateAtStartOfDay(input: string | undefined): Date | undefined {
  if (isBlank(input)) return undefined;
  const s = String(input);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    // YYYY-MM-DD 케이스 처리
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s);
    if (m) {
      const [_, y, mo, da] = m;
      return new Date(Number(y), Number(mo) - 1, Number(da), 0, 0, 0, 0);
    }
    return undefined;
  }
  // 이미 시각 포함이면 그대로 사용(시:분:초 유지)
  return d;
}

function parseDateAtEndOfDay(input: string | undefined): Date | undefined {
  if (isBlank(input)) return undefined;
  const s = String(input);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s);
    if (m) {
      const [_, y, mo, da] = m;
      return new Date(Number(y), Number(mo) - 1, Number(da), 23, 59, 59, 999);
    }
    return undefined;
  }
  // 시각 포함 입력이면 그대로 사용
  return d;
}

export function buildAdminLogQuery(sp: AdminLogQueryInput): AdminLogQueryOutput {
  const from = getOne(sp, "from");
  const to = getOne(sp, "to");
  const actor = getOne(sp, "actor");
  const targetId = getOne(sp, "targetId");
  const q = getOne(sp, "q");
  const actions = getMany(sp, "action");
  const targetTypes = getMany(sp, "targetType");

  const order = (getOne(sp, "order") ?? "new").toLowerCase();
  const page = safeInt(getOne(sp, "page"), 1, { min: 1, max: 1_000_000 });
  const per = safeInt(getOne(sp, "per"), 20, { min: 1, max: 200 });

  const createdAtFilter: Prisma.DateTimeFilter | undefined = (() => {
    const gte = parseDateAtStartOfDay(from);
    const lte = parseDateAtEndOfDay(to);
    if (!gte && !lte) return undefined;
    return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
  })();

  const whereAnd: Prisma.AdminLogWhereInput[] = [];

  if (createdAtFilter) whereAnd.push({ createdAt: createdAtFilter });

  if (!isBlank(actor)) {
    whereAnd.push({ actor: { contains: String(actor), mode: "insensitive" } });
  }

  if (actions && actions.length > 0) {
    whereAnd.push({ action: { in: actions } });
  }

  if (targetTypes && targetTypes.length > 0) {
    whereAnd.push({ targetType: { in: targetTypes } });
  }

  if (!isBlank(targetId)) {
    whereAnd.push({ targetId: { contains: String(targetId), mode: "insensitive" } });
  }

  if (!isBlank(q)) {
    const keyword = String(q);
    // 프로젝트 스키마 기준: message(텍스트 로그) 필드가 있다고 가정
    // 없을 경우 page.tsx에서 q는 actor/targetId로만 동작해도 무방
    whereAnd.push({
      OR: [
        { actor: { contains: keyword, mode: "insensitive" } },
        { targetId: { contains: keyword, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.AdminLogWhereInput = whereAnd.length > 0 ? { AND: whereAnd } : {};

  const orderBy: Prisma.AdminLogOrderByWithRelationInput =
    order === "old" ? { createdAt: "asc" } : { createdAt: "desc" };

  const skip = (page - 1) * per;
  const take = per;

  return { where, orderBy, skip, take };
}

/**
 * 검색 파라미터를 (페이지네이션 제외) 유지하면서 page만 교체할 때 사용
 */
export function buildPageParam(sp: AdminLogQueryInput, page: number): URLSearchParams {
  const qs = new URLSearchParams();
  const copyKeys = [
    "from",
    "to",
    "actor",
    "action",
    "targetType",
    "targetId",
    "q",
    "order",
    "per",
  ];

  const setMany = (key: string, vals?: string[]) => {
    if (!vals || vals.length === 0) return;
    vals.forEach((v) => qs.append(key, v));
  };

  for (const key of copyKeys) {
    const many = getMany(sp, key);
    if (many && many.length > 1) {
      setMany(key, many);
      continue;
    }
    const one = getOne(sp, key);
    if (!isBlank(one)) qs.set(key, String(one));
  }

  qs.set("page", String(Math.max(1, page)));
  return qs;
}
