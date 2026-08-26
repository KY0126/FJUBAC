import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.argv[2] || "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium" });

try {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await desktop.newPage();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator(".brand-loader").waitFor({ state: "visible" });
  if (await page.getByRole("dialog").count()) await page.getByRole("button", { name: "略過導覽" }).click();
  await page.getByLabel("主要導覽").getByRole("link", { name: "公告" }).click();
  await page.locator(".brand-route-curtain.is-visible").waitFor({ state: "visible" });
  await page.getByRole("heading", { name: "公告" }).waitFor();
  await page.goto(`${baseUrl}/manage/accounts`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "帳號管理需要治理登入" }).waitFor();
  await desktop.close();

  const reduced = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(`${baseUrl}/learning`, { waitUntil: "networkidle" });
  assert.equal(await reducedPage.locator(".brand-loader").count(), 0, "減少動態偏好下不應顯示載入幕");
  assert.equal(await reducedPage.locator(".brand-route-curtain").evaluate(element => getComputedStyle(element).display), "none", "減少動態偏好下不應顯示頁面轉場遮罩");
  await reduced.close();

  console.log("Brand motion and account governance browser checks passed.");
} finally {
  await browser.close();
}
