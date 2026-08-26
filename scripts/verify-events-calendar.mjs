import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.argv[2] || "http://127.0.0.1:3000";
const executablePath = process.env.CHROMIUM_PATH || "/usr/bin/chromium";
const browser = await chromium.launch({ headless: true, executablePath });

try {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await desktop.newPage();
  await page.goto(`${baseUrl}/events`, { waitUntil: "networkidle" });
  await page.getByRole("region", { name: "活動行事曆" }).waitFor();
  await page.getByRole("button", { name: "週" }).click();
  await page.getByText("當週 ·").waitFor();
  await page.getByRole("button", { name: /清單/ }).click();
  await page.getByText("所有可查看活動").waitFor();
  await page.getByPlaceholder("搜尋活動、地點或關鍵字").fill("不存在的測試關鍵字");
  await page.getByText("這個範圍尚無符合搜尋條件的活動。").waitFor();
  for (const label of ["Instagram", "Threads", "LinkedIn"]) {
    const href = await page.getByRole("link", { name: new RegExp(label) }).getAttribute("href");
    assert.ok(href?.startsWith("https://"), `${label} 必須為公開 HTTPS 連結`);
  }
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(`${baseUrl}/events`, { waitUntil: "networkidle" });
  await mobilePage.getByRole("region", { name: "活動行事曆" }).waitFor();
  await mobilePage.getByRole("button", { name: "週" }).click();
  await mobilePage.getByRole("button", { name: /清單/ }).click();
  await mobilePage.getByText("所有可查看活動").waitFor();
  await mobile.close();
  console.log("Events calendar browser interaction checks passed.");
} finally {
  await browser.close();
}
