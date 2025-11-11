"use client";
// CODPATCH: RowPatchContext — per-row patch store (id → partial)
import React, { createContext, useContext, useMemo, useRef, useSyncExternalStore } from "react";

type Patch = Record<string, any>;
type Store = {
  subscribe: (cb: () => void) => () => void;
  get(): Map<string, Patch>;
  patch(id: string, data: Patch): void;
  clear(id: string): void;
};

function createStore(): Store {
  const map = new Map<string, Patch>();
  const listeners = new Set<() => void>();
  return {
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    get() {
      return map;
    },
    patch(id, data) {
      const next = { ...(map.get(id) ?? {}), ...data };
      map.set(id, next);
      listeners.forEach((l) => l());
    },
    clear(id) {
      map.delete(id);
      listeners.forEach((l) => l());
    },
  };
}

const Ctx = createContext<Store | null>(null);

export function RowPatchProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<Store>();
  if (!storeRef.current) storeRef.current = createStore();
  return <Ctx.Provider value={storeRef.current}>{children}</Ctx.Provider>;
}

export function useRowPatch() {
  const store = useContext(Ctx);
  if (!store) throw new Error("RowPatchProvider is missing");
  const getSnap = () => store.get();
  const sub = (cb: () => void) => store.subscribe(cb);
  const snap = useSyncExternalStore(sub, getSnap, getSnap);
  const api = useMemo(
    () => ({
      patchRow: (id: string, data: Patch) => store.patch(id, data),
      clearRow: (id: string) => store.clear(id),
      getRowPatch: (id: string) => snap.get(id) ?? null,
    }),
    [snap, store]
  );
  return api;
}

