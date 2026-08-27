import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });

async function dismissOnboarding(page) {
  if (await page.getByRole("dialog").count()) await page.getByRole("button", { name: "略過導覽" }).click();
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desktop.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
await dismissOnboarding(desktop);
const stack = desktop.getByLabel("五部門焦點卡片");
await stack.scrollIntoViewIfNeeded();
const cards = stack.getByRole("button", { name: /選擇.*部/ });
if (await cards.count() !== 5) throw new Error("五部門卡片數量不正確。");
if (await stack.getByRole("button", { pressed: true }).count() !== 1) throw new Error("應恰有一張部門卡片為中央焦點。");
const initialFocus = stack.getByRole("button", { pressed: true });
const initialLayer = await initialFocus.evaluate(element => ({
  opacity: getComputedStyle(element).opacity,
  zIndex: getComputedStyle(element).zIndex,
}));
if (initialLayer.opacity !== "1" || initialLayer.zIndex !== "5") throw new Error("中央部門卡片未維持完整透明度與最高層級。");
await stack.getByRole("button", { name: "下一個部門" }).click();
await stack.getByText("學術營運部", { exact: true }).last().waitFor();
if (await stack.getByRole("button", { pressed: true }).getAttribute("aria-label") !== "選擇學術營運部，目前焦點") throw new Error("下一個部門切換未更新焦點卡片。");
await stack.getByRole("button", { name: /選擇人才發展部/ }).click();
if (await stack.getByRole("button", { pressed: true }).getAttribute("aria-label") !== "選擇人才發展部，目前焦點") throw new Error("點選側邊卡片未置中為焦點。");
await stack.getByRole("button", { pressed: true }).press("ArrowRight");
if (await stack.getByRole("button", { pressed: true }).getAttribute("aria-label") !== "選擇專案開發部，目前焦點") throw new Error("右方向鍵未將焦點循環切換至下一個部門。");
const desktopOverflow = await desktop.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
if (desktopOverflow) throw new Error("桌機首頁出現水平溢出。");
await desktop.screenshot({ path: "/home/ubuntu/screenshots/stacked-departments-desktop.png", fullPage: true });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
await dismissOnboarding(mobile);
const mobileStack = mobile.getByLabel("五部門焦點卡片");
await mobileStack.scrollIntoViewIfNeeded();
if (await mobileStack.getByRole("button", { pressed: true }).count() !== 1) throw new Error("行動版應僅顯示一張焦點部門卡片。");
await mobileStack.getByRole("button", { name: "下一個部門" }).click();
if (await mobileStack.getByRole("button", { pressed: true }).getAttribute("aria-label") !== "選擇學術營運部，目前焦點") throw new Error("行動版下一個部門切換未更新焦點。");
const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
if (mobileOverflow) throw new Error("行動版五部門區塊出現水平溢出。");
await mobile.screenshot({ path: "/home/ubuntu/screenshots/stacked-departments-mobile.png", fullPage: true });

console.log("五部門疊加卡片驗收通過：中央層級、點選、鍵盤、行動版單焦點與跨裝置無水平溢出均正常。");
await browser.close();
