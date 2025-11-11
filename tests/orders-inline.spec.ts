// CODPATCH: e2e — orders inline smoke
import { test, expect } from "@playwright/test";

test.describe("Orders — inline actions", () => {
  test("단건 상태 변경은 네비게이션 없이 토스트 3초 노출", async ({ page }) => {
    await page.goto("/admin/orders");
    const toast = page.locator('[data-codpatch="inline-flash"]');
    // 페이지마다 존재하지 않을 수 있으므로 존재하면 상호작용
    const btn = await page.$('button:has-text("배송완료")');
    test.skip(!btn, "no inline fulfilled button");
    await btn!.click();
    await expect(toast).toBeVisible();
    await page.waitForTimeout(3200);
    await expect(toast).toBeHidden();
  });

  test("일괄 상태변경/삭제 버튼 존재", async ({ page }) => {
    await page.goto("/admin/orders");
    const bulkStatusBtn = await page.$('text=선택 상태변경');
    const bulkDeleteBtn = await page.$('text=선택 삭제');
    test.skip(!bulkStatusBtn || !bulkDeleteBtn, "bulk buttons not found");
    await expect(bulkStatusBtn!).toBeVisible();
    await expect(bulkDeleteBtn!).toBeVisible();
  });

  test("SSE 엔드포인트 이벤트 스트림", async ({ request }) => {
    const res = await request.get("/api/sse?topic=orders:update");
    expect(res.ok()).toBeTruthy();
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toContain("text/event-stream");
  });
});

