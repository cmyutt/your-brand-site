// src/lib/bus.ts
import { EventEmitter } from "events";

/** 공통 인터페이스 */
type Handler<T = any> = (payload: T) => void;
export interface Bus {
  publish<T = any>(topic: string, payload: T): Promise<void> | void;
  subscribe<T = any>(topic: string, handler: Handler<T>): () => void;
}

/** 메모리 버스 (단일 인스턴스용) */
class MemoryBus extends EventEmitter implements Bus {
  publish<T = any>(topic: string, payload: T) {
    this.emit(topic, payload);
  }
  subscribe<T = any>(topic: string, handler: Handler<T>) {
    this.on(topic, handler);
    return () => this.off(topic, handler);
  }
}

/** Redis Pub/Sub 버스 (멀티 인스턴스) */
class RedisBus implements Bus {
  private publisher: any;
  private subscriber: any;
  private topics = new Map<string, number>();
  private handlers = new Map<string, Set<Handler>>();

  constructor(url: string) {
    // ioredis 사용 (Node 전용). edge 런타임 X
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IORedis = require("ioredis");
    const tls = process.env.REDIS_TLS === "true";
    const common = { maxRetriesPerRequest: 2, enableReadyCheck: true };
    this.publisher = new IORedis(url, tls ? { tls: { rejectUnauthorized: false }, ...common } : common);
    this.subscriber = new IORedis(url, tls ? { tls: { rejectUnauthorized: false }, ...common } : common);

    this.subscriber.on("message", (channel: string, message: string) => {
      const hs = this.handlers.get(channel);
      if (!hs || hs.size === 0) return;
      try {
        const parsed = JSON.parse(message);
        for (const h of hs) h(parsed);
      } catch {
        for (const h of hs) h(message as any);
      }
    });
  }

  async publish<T = any>(topic: string, payload: T) {
    const msg = typeof payload === "string" ? payload : JSON.stringify(payload);
    await this.publisher.publish(topic, msg);
  }

  subscribe<T = any>(topic: string, handler: Handler<T>) {
    if (!this.handlers.has(topic)) this.handlers.set(topic, new Set());
    this.handlers.get(topic)!.add(handler);

    const curr = this.topics.get(topic) ?? 0;
    if (curr === 0) {
      // 첫 구독 시 Redis SUBSCRIBE
      this.subscriber.subscribe(topic).catch(() => {});
    }
    this.topics.set(topic, curr + 1);

    return () => {
      const set = this.handlers.get(topic);
      if (set) {
        set.delete(handler);
        if (set.size === 0) this.handlers.delete(topic);
      }
      const cnt = (this.topics.get(topic) ?? 1) - 1;
      if (cnt <= 0) {
        this.topics.delete(topic);
        // 구독자 0명이면 Redis UNSUBSCRIBE
        this.subscriber.unsubscribe(topic).catch(() => {});
      } else {
        this.topics.set(topic, cnt);
      }
    };
  }
}

/** 싱글톤 선택: REDIS_URL 있으면 Redis, 없으면 메모리 */
function createBus(): Bus {
  const url = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
  if (url && process.env.NODE_ENV !== "test") {
    try {
      return new RedisBus(url);
    } catch {
      // Redis 연결 실패 시 메모리로 폴백
      return new MemoryBus();
    }
  }
  return new MemoryBus();
}

const g = globalThis as any;
export const bus: Bus = g.___app_bus ?? (g.___app_bus = createBus());
