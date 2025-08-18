// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// 개발 환경에서 HMR로 인스턴스가 중복 생성되는 걸 막기 위한 글로벌 캐시
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // 필요시 로그 켜고싶으면 아래 주석 해제
    // log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
