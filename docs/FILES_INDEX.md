# 📂 파일 인덱스 (자동 생성)

> ignore: node_modules, .next, .git, .turbo, dist, build / depth: 5

```
.
├─ components/
│  └─ order/
│     └─ StatusBadgeClient.tsx
├─ docs/
│  └─ FILES_INDEX.md
├─ prisma/
│  ├─ migrations/
│  │  ├─ 0_init/
│  │  │  └─ migration.sql
│  │  ├─ 20250822144910_add_payment_model/
│  │  │  └─ migration.sql
│  │  ├─ 20250824164954_add_order_event/
│  │  │  └─ migration.sql
│  │  ├─ 20250825145032_add_order_total_idx/
│  │  │  └─ migration.sql
│  │  ├─ 20250825155203_add_admin_log/
│  │  │  └─ migration.sql
│  │  ├─ 20250908_add_order_event_diff/
│  │  │  └─ migration.sql
│  │  └─ migration_lock.toml
│  ├─ src/
│  │  └─ generated/
│  │     └─ prisma/
│  │        ├─ runtime/
│  │        │  ├─ edge-esm.js
│  │        │  ├─ edge.js
│  │        │  ├─ index-browser.d.ts
│  │        │  ├─ index-browser.js
│  │        │  ├─ library.d.ts
│  │        │  ├─ library.js
│  │        │  ├─ react-native.js
│  │        │  ├─ wasm-compiler-edge.js
│  │        │  └─ wasm-engine-edge.js
│  │        ├─ client.d.ts
│  │        ├─ client.js
│  │        ├─ default.d.ts
│  │        ├─ default.js
│  │        ├─ edge.d.ts
│  │        ├─ edge.js
│  │        ├─ index-browser.js
│  │        ├─ index.d.ts
│  │        ├─ index.js
│  │        ├─ package.json
│  │        ├─ query_engine-windows.dll.node
│  │        ├─ schema.prisma
│  │        ├─ wasm.d.ts
│  │        └─ wasm.js
│  ├─ schema.prisma
│  └─ seed.ts
├─ public/
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ next.svg
│  ├─ vercel.svg
│  └─ window.svg
├─ scripts/
│  ├─ backfill-order-events.mjs
│  └─ gen-file-index.ts
├─ src/
│  ├─ app/
│  │  ├─ admin/
│  │  │  ├─ dashboard/
│  │  │  │  ├─ DailySalesTable.tsx
│  │  │  │  ├─ DailyTableClient.tsx
│  │  │  │  ├─ DashboardFilters.tsx
│  │  │  │  ├─ LeadTimeHistogram.tsx
│  │  │  │  ├─ LiveRefresher.tsx
│  │  │  │  ├─ page.tsx
│  │  │  │  ├─ SalesChart.tsx
│  │  │  │  ├─ StatusCountList.tsx
│  │  │  │  ├─ StatusCountListClient.tsx
│  │  │  │  └─ TopProductsClient.tsx
│  │  │  ├─ dev/
│  │  │  │  └─ payments/
│  │  │  │     └─ page.tsx
│  │  │  ├─ login/
│  │  │  │  └─ page.tsx
│  │  │  ├─ logs/
│  │  │  │  ├─ _live/
│  │  │  │  │  └─ heartbeat/
│  │  │  │  ├─ cleanup/
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ export/
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ AutoRefresh.tsx
│  │  │  │  ├─ LogsLiveClient.tsx
│  │  │  │  └─ page.tsx
│  │  │  ├─ orders/
│  │  │  │  ├─ [id]/
│  │  │  │  │  ├─ _components/
│  │  │  │  │  ├─ _actions.ts
│  │  │  │  │  ├─ actions.ts
│  │  │  │  │  ├─ Events.tsx
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ export/
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ _actions.ts
│  │  │  │  ├─ _bulkActions.ts
│  │  │  │  ├─ ActionToast.tsx
│  │  │  │  ├─ ActionToastServer.tsx
│  │  │  │  ├─ BulkBar.tsx
│  │  │  │  ├─ BulkStatusFormServer.tsx
│  │  │  │  ├─ BulkStatusSelect.tsx
│  │  │  │  ├─ CsvExportButton.tsx
│  │  │  │  ├─ DeleteOrderButton.tsx
│  │  │  │  ├─ ExportCsvForm.tsx
│  │  │  │  ├─ ExportCsvToggle.tsx
│  │  │  │  ├─ FiltersBar.tsx
│  │  │  │  ├─ FormLiveHint.tsx
│  │  │  │  ├─ layout.tsx
│  │  │  │  ├─ OrdersKeyboardNav.tsx
│  │  │  │  ├─ OrdersLiveClient.tsx
│  │  │  │  ├─ OrdersSelectAll.tsx
│  │  │  │  ├─ page.tsx
│  │  │  │  ├─ ReasonOnSubmit.tsx
│  │  │  │  ├─ RequireReason.tsx
│  │  │  │  ├─ SelectionStickyBar.tsx
│  │  │  │  └─ StatusButtons.tsx
│  │  │  ├─ products/
│  │  │  │  ├─ [id]/
│  │  │  │  │  ├─ images/
│  │  │  │  │  ├─ variants/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ _CreateForm.tsx
│  │  │  │  ├─ page.tsx
│  │  │  │  └─ productActions.ts
│  │  │  ├─ _Nav.tsx
│  │  │  ├─ actions.ts
│  │  │  ├─ layout.tsx
│  │  │  └─ page.tsx
│  │  ├─ api/
│  │  │  ├─ debug/
│  │  │  │  └─ slack/
│  │  │  │     └─ route.ts
│  │  │  ├─ orders/
│  │  │  │  └─ [id]/
│  │  │  │     └─ status/
│  │  │  ├─ payments/
│  │  │  │  ├─ initiate/
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ mock/
│  │  │  │     ├─ approve/
│  │  │  │     └─ fail/
│  │  │  ├─ products/
│  │  │  │  ├─ [slug]/
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  ├─ sse/
│  │  │  │  └─ route.ts
│  │  │  └─ webhooks/
│  │  │     └─ payments/
│  │  │        └─ route.ts
│  │  ├─ cart/
│  │  │  ├─ actions.ts
│  │  │  └─ page.tsx
│  │  ├─ checkout/
│  │  │  ├─ actions.ts
│  │  │  └─ page.tsx
│  │  ├─ orders/
│  │  │  └─ [id]/
│  │  │     ├─ pay/
│  │  │     │  ├─ actions.ts
│  │  │     │  └─ page.tsx
│  │  │     ├─ result/
│  │  │     │  └─ page.tsx
│  │  │     ├─ success/
│  │  │     │  └─ page.tsx
│  │  │     ├─ page.tsx
│  │  │     └─ StatusBadge.tsx
│  │  ├─ products/
│  │  │  └─ [slug]/
│  │  │     ├─ error.tsx
│  │  │     ├─ loading.tsx
│  │  │     ├─ page.tsx
│  │  │     └─ VariantControls.tsx
│  │  ├─ favicon.ico
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ components/
│  │  ├─ AutoSubmitNumber.tsx
│  │  ├─ ConfirmServerActionButton.tsx
│  │  ├─ ConfirmSubmitButton.tsx
│  │  ├─ FormLiveHint.tsx
│  │  ├─ RefreshOnSubmit.tsx
│  │  └─ StatusChip.tsx
│  ├─ generated/
│  │  └─ prisma/
│  │     ├─ runtime/
│  │     │  ├─ edge-esm.js
│  │     │  ├─ edge.js
│  │     │  ├─ index-browser.d.ts
│  │     │  ├─ index-browser.js
│  │     │  ├─ library.d.ts
│  │     │  ├─ library.js
│  │     │  ├─ react-native.js
│  │     │  ├─ wasm-compiler-edge.js
│  │     │  └─ wasm-engine-edge.js
│  │     ├─ client.d.ts
│  │     ├─ client.js
│  │     ├─ default.d.ts
│  │     ├─ default.js
│  │     ├─ edge.d.ts
│  │     ├─ edge.js
│  │     ├─ index-browser.js
│  │     ├─ index.d.ts
│  │     ├─ index.js
│  │     ├─ package.json
│  │     ├─ query_engine-windows.dll.node
│  │     ├─ schema.prisma
│  │     ├─ wasm.d.ts
│  │     └─ wasm.js
│  └─ lib/
│     ├─ actor.ts
│     ├─ adminLog.ts
│     ├─ adminLogLive.ts
│     ├─ adminLogQuery.ts
│     ├─ bus.ts
│     ├─ cart.ts
│     ├─ notify.ts
│     ├─ orderEvents.ts
│     ├─ prisma.ts
│     ├─ requireAdmin.ts
│     └─ stockDeltaPreview.ts
├─ .env
├─ .env.local
├─ .gitignore
├─ eslint.config.mjs
├─ middleware.ts
├─ next-env.d.ts
├─ next.config.ts
├─ package-lock.json
├─ package.json
├─ postcss.config.mjs
├─ README.md
├─ tsconfig.json
└─ tsconfig.tsbuildinfo
```
