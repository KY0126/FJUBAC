import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.argv[2] || "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium" });

async function assertVisible(page, expected) {
  const dialog = page.getByRole("dialog");
  if (expected) await dialog.waitFor({ state: "visible" });
  else await dialog.waitFor({ state: "hidden" });
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await desktop.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await assertVisible(page, true);
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByRole("heading", { name: "公開資訊與活動，都有清楚入口。" }).waitFor();
  await page.getByRole("button", { name: "下一步" }).click();
  await page.getByRole("heading", { name: "從申請到社員服務，依路徑開始。" }).waitFor();
  await page.getByRole("button", { name: "開始瀏覽" }).click();
  await assertVisible(page, false);
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.getByRole("dialog").count(), 0, "完成後不應再次自動顯示導覽");
  await page.getByRole("button", { name: "重新開啟網站功能導覽" }).click();
  await assertVisible(page, true);
  await page.getByRole("button", { name: "略過導覽" }).click();
  await assertVisible(page, false);
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mobilePage = await mobile.newPage();
  await mobilePage.emulateMedia({ reducedMotion: "reduce" });
  await mobilePage.goto(baseUrl, { waitUntil: "networkidle" });
  await assertVisible(mobilePage, true);
  const animationName = await mobilePage.locator(".site-onboarding-backdrop").evaluate(element => getComputedStyle(element).animationName);
  assert.equal(animationName, "none", "減少動態偏好下不應播放進場動畫");
  await mobilePage.keyboard.press("Escape");
  await assertVisible(mobilePage, false);
  await mobilePage.getByRole("button", { name: "重新開啟網站功能導覽" }).click();
  await assertVisible(mobilePage, true);
  await mobile.close();

  console.log("Onboarding browser interaction checks passed.");
} finally {
  await browser.close();
}
