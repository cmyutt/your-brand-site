// CODPATCH: playwright config — minimal
import { defineConfig } from "@playwright/test";

export default defineConfig({
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    headless: true,
  },
});

