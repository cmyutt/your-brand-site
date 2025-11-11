const KEY = "admin-logs:bump";

export function emitAdminLogChanged() {
  // 1) BroadcastChannel
  try {
    const ch = new BroadcastChannel("admin-logs");
    ch.postMessage({ t: "changed", ts: Date.now() });
    ch.close();
  } catch { /* ignore */ }

  // 2) storage 이벤트 (다른 탭에서만 발화)
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch { /* ignore */ }
}
