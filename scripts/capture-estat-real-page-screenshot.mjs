import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const require = createRequire(process.env.NODE_REQUIRE_BASE || import.meta.url);
const { chromium } = require("playwright");

const rootDir = process.env.TUNAGU_WORK_DIR || process.cwd();
const extensionDir = path.join(rootDir, "extensions", "estat");
const outputDir = path.join(rootDir, "artifacts");
const screenshotPath = path.join(outputDir, "estat-extension-real-page.png");
const userDataDir = path.join("/tmp", "tunagu-extension-real-profile");
const targetUrl =
  process.env.TUNAGU_ESTAT_URL ||
  "https://www.e-stat.go.jp/stat-search/files?page=1&layout=datalist&toukei=00020111&tstat=000001232786&cycle=7&tclass1=000001232787&tclass2val=0";
const apiProxyBase = process.env.TUNAGU_API_PROXY_BASE;

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
  const page = await context.newPage();
  page.on("console", (message) => console.log(`browser:${message.type()}: ${message.text()}`));
  page.on("pageerror", (error) => console.log(`browser:error: ${error.message}`));
  if (apiProxyBase) {
    await page.route("http://localhost:8000/**", async (route) => {
      const requestedUrl = new URL(route.request().url());
      const proxyUrl = `${apiProxyBase}${requestedUrl.pathname}${requestedUrl.search}`;
      await route.continue({ url: proxyUrl });
    });
  }

  console.log(`Opening real e-Stat page: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {
    console.log("Network stayed busy; continuing after DOM content loaded.");
  });

  if (!(await page.locator(".tunagu-related-button").count())) {
    console.log("Content script was not detected; injecting extension assets directly.");
    await page.addStyleTag({ path: path.join(extensionDir, "content.css") });
    await page.addScriptTag({ path: path.join(extensionDir, "content.js") });
  }

  const detectedId = await page.evaluate(() => {
    const url = new URL(window.location.href);
    return {
      statsDataId: url.searchParams.get("statsDataId"),
      statdispId: url.searchParams.get("statdisp_id"),
      firstTenDigitText: document.body.innerText.match(/\b\d{10}\b/)?.[0] || null,
      title: document.title,
    };
  });
  console.log(`Detected page data: ${JSON.stringify(detectedId)}`);

  console.log("Waiting for TUNAGU button...");
  await page.waitForSelector(".tunagu-related-button", { timeout: 15000 });

  console.log("Opening related drawer...");
  await page.click(".tunagu-related-button");
  await page.waitForSelector(".tunagu-drawer.is-open", { timeout: 10000 });
  await page.waitForSelector(".tunagu-drawer-body > *", { timeout: 10000 });

  const drawerText = await page.locator(".tunagu-drawer").innerText();
  console.log(`Drawer text:\n${drawerText}`);

  console.log("Capturing screenshot...");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(screenshotPath);
} finally {
  await context.close();
}
