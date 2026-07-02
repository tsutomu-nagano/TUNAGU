import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const require = createRequire(process.env.NODE_REQUIRE_BASE || import.meta.url);
const { chromium } = require("playwright");

const rootDir = process.env.TUNAGU_WORK_DIR || process.cwd();
const extensionDir = path.join(rootDir, "extensions", "estat");
const outputDir = path.join(rootDir, "artifacts");
const screenshotPath = path.join(outputDir, "estat-extension-demo.png");
const userDataDir = path.join("/tmp", "tunagu-extension-profile");
const demoUrl = "https://www.e-stat.go.jp/stat-search/files?page=1&statsDataId=0003448231";

await mkdir(outputDir, { recursive: true });

console.log("Launching Chromium with extension...");
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: true,
  viewport: { width: 1366, height: 900 },
  args: [
    `--disable-extensions-except=${extensionDir}`,
    `--load-extension=${extensionDir}`,
    "--no-sandbox",
  ],
});

try {
  console.log("Opening demo page...");
  const page = await context.newPage();
  await page.route("https://www.e-stat.go.jp/**", async (route) => {
    await route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<!doctype html>
        <html lang="ja">
          <head>
            <meta charset="utf-8" />
            <title>e-Stat 統計データ</title>
            <style>
              body {
                margin: 0;
                color: #1f2937;
                background: #f4f7fb;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              }
              header {
                background: #fff;
                border-bottom: 1px solid #d8e0ea;
                padding: 18px 40px;
              }
              header strong {
                color: #005bac;
                font-size: 22px;
              }
              main {
                max-width: 960px;
                margin: 32px auto;
                background: #fff;
                border: 1px solid #d8e0ea;
                border-radius: 8px;
                padding: 28px 32px 42px;
              }
              h1 {
                font-size: 26px;
                margin: 0 0 10px;
              }
              .meta {
                display: grid;
                gap: 8px;
                margin-top: 24px;
              }
              .meta div {
                border-top: 1px solid #e5e7eb;
                display: grid;
                grid-template-columns: 160px 1fr;
                padding: 12px 0;
              }
              .label {
                color: #4b5563;
                font-weight: 700;
              }
            </style>
          </head>
          <body>
            <header><strong>e-Stat</strong></header>
            <main>
              <h1>人口推計 2021年</h1>
              <p>統計データ ID: 0003448231</p>
              <section class="meta">
                <div><span class="label">統計名</span><span>人口推計</span></div>
                <div><span class="label">提供分類</span><span>全国・年次</span></div>
                <div><span class="label">公開日</span><span>2026-07-01</span></div>
              </section>
            </main>
          </body>
        </html>`,
    });
  });

  await page.goto(demoUrl, { waitUntil: "networkidle" });
  if (!(await page.locator(".tunagu-related-button").count())) {
    await page.addStyleTag({ path: path.join(extensionDir, "content.css") });
    await page.addScriptTag({ path: path.join(extensionDir, "content.js") });
  }
  console.log("Waiting for extension button...");
  await page.waitForSelector(".tunagu-related-button", { timeout: 10000 });
  console.log("Opening related drawer...");
  await page.click(".tunagu-related-button");
  await page.waitForSelector(".tunagu-drawer.is-open .tunagu-relation-row", { timeout: 10000 });
  console.log("Capturing screenshot...");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(screenshotPath);
} finally {
  await context.close();
}
