import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.argv[2] || "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true, executablePath: "/usr/bin/chromium" });

try {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await desktop.newPage();

  await page.goto(`${baseUrl}/announcements`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "招生" }).click();
  await page.getByRole("heading", { name: "目前沒有招生公告。" }).waitFor();

  await page.goto(`${baseUrl}/links`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "官方連結" }).waitFor();
  await page.getByRole("heading", { name: "目前尚無可公開的資源。" }).waitFor();

  await page.goto(`${baseUrl}/outcomes`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "目前尚無可公開的專案成果。" }).waitFor();

  await page.goto(`${baseUrl}/departments`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "人才發展部" }).waitFor();
  await page.getByRole("heading", { name: "行銷策略部" }).waitFor();
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(`${baseUrl}/learning`, { waitUntil: "networkidle" });
  await mobilePage.getByRole("link", { name: "向下查看探索架構" }).waitFor();
  const revealStyles = await mobilePage.locator(".reveal").first().evaluate(element => ({ opacity: getComputedStyle(element).opacity, transform: getComputedStyle(element).transform }));
  assert.equal(revealStyles.opacity, "1", "減少動態偏好下內容必須立即可讀");
  assert.equal(revealStyles.transform, "none", "減少動態偏好下不應保留位移效果");
  await mobile.close();

  console.log("Public content browser checks passed.");
} finally {
  await browser.close();
}
