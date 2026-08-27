import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const rotationWaitMs = 7000;
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });

async function dismissOnboarding(page) {
  if (await page.getByRole("dialog").count()) await page.getByRole("button", { name: "略過導覽" }).click();
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desktop.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
await dismissOnboarding(desktop);
const stack = desktop.getByLabel("五部門焦點卡片");
const activeDesktopCard = () => stack.locator(".site-department-card[aria-pressed='true']");
await stack.scrollIntoViewIfNeeded();
const cards = stack.getByRole("button", { name: /選擇.*部/ });
if (await cards.count() !== 5) throw new Error("五部門卡片數量不正確。");
if (await activeDesktopCard().count() !== 1) throw new Error("應恰有一張部門卡片為中央焦點。");
const initialFocus = activeDesktopCard();
const initialLayer = await initialFocus.evaluate(element => ({
  opacity: getComputedStyle(element).opacity,
  zIndex: getComputedStyle(element).zIndex,
}));
if (initialLayer.opacity !== "1" || initialLayer.zIndex !== "5") throw new Error("中央部門卡片未維持完整透明度與最高層級。");
const initialAutoFocus = await activeDesktopCard().getAttribute("aria-label");
await desktop.mouse.move(8, 8);
await desktop.waitForTimeout(100);
if (await stack.getAttribute("data-autoplay-state") !== "running") throw new Error(`游標移出後自動輪播仍未啟動：${await stack.getAttribute("data-autoplay-reason")}`);
await desktop.waitForFunction(previousFocus => document.querySelector(".site-department-card[aria-pressed='true']")?.getAttribute("aria-label") !== previousFocus, initialAutoFocus, { timeout: rotationWaitMs });
const autoFocus = await activeDesktopCard().getAttribute("aria-label");
if (autoFocus === initialAutoFocus) throw new Error("五卡輪播未在定時週期後切換焦點。");
await stack.hover();
const hoverFocus = await activeDesktopCard().getAttribute("aria-label");
await desktop.waitForTimeout(rotationWaitMs);
if (await activeDesktopCard().getAttribute("aria-label") !== hoverFocus) throw new Error("滑鼠停留時自動輪播未暫停。");
await desktop.mouse.move(8, 8);
await stack.getByRole("button", { name: "下一個部門" }).click();
await stack.getByText("行銷策略部", { exact: true }).last().waitFor();
if (await activeDesktopCard().getAttribute("aria-label") !== "選擇行銷策略部，目前焦點") throw new Error("下一個部門切換未更新焦點卡片。");
if (await stack.getByRole("button", { name: "啟動自動輪播" }).count() !== 1) throw new Error("手動切換後未提供恢復自動輪播的控制。 ");
const manualFocus = await activeDesktopCard().getAttribute("aria-label");
await desktop.waitForTimeout(rotationWaitMs);
if (await activeDesktopCard().getAttribute("aria-label") !== manualFocus) throw new Error("手動切換後自動輪播未暫停。");
await stack.getByRole("button", { name: "啟動自動輪播" }).click();
await desktop.mouse.move(8, 8);
await desktop.getByRole("heading", { name: "五個部門，一個共同目標" }).click();
if (await stack.getAttribute("data-autoplay-state") !== "running") throw new Error("使用者恢復自動輪播後仍未回到運行狀態。");
await desktop.waitForFunction(previousFocus => document.querySelector(".site-department-card[aria-pressed='true']")?.getAttribute("aria-label") !== previousFocus, manualFocus, { timeout: rotationWaitMs });
await stack.getByRole("button", { name: /選擇人才發展部/ }).click();
if (await activeDesktopCard().getAttribute("aria-label") !== "選擇人才發展部，目前焦點") throw new Error("點選側邊卡片未置中為焦點。");
await activeDesktopCard().press("ArrowRight");
if (await activeDesktopCard().getAttribute("aria-label") !== "選擇專案開發部，目前焦點") throw new Error("右方向鍵未將焦點循環切換至下一個部門。");
const desktopOverflow = await desktop.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
if (desktopOverflow) throw new Error("桌機首頁出現水平溢出。");
await desktop.screenshot({ path: "/home/ubuntu/screenshots/stacked-departments-desktop.png", fullPage: true });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.emulateMedia({ reducedMotion: "reduce" });
await mobile.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
await dismissOnboarding(mobile);
const mobileStack = mobile.getByLabel("五部門焦點卡片");
const activeMobileCard = () => mobileStack.locator(".site-department-card[aria-pressed='true']");
await mobileStack.scrollIntoViewIfNeeded();
if (await activeMobileCard().count() !== 1) throw new Error("行動版應僅顯示一張焦點部門卡片。");
if (await mobileStack.getByRole("button", { name: "減少動態偏好已停止輪播" }).isDisabled() !== true) throw new Error("減少動態偏好未停止自動輪播。 ");
await mobileStack.getByRole("button", { name: "下一個部門" }).click();
if (await activeMobileCard().getAttribute("aria-label") !== "選擇學術營運部，目前焦點") throw new Error("行動版下一個部門切換未更新焦點。");
const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
if (mobileOverflow) throw new Error("行動版五部門區塊出現水平溢出。");
await mobile.screenshot({ path: "/home/ubuntu/screenshots/stacked-departments-mobile.png", fullPage: true });

console.log("五部門疊加卡片驗收通過：中央層級、點選、鍵盤、行動版單焦點與跨裝置無水平溢出均正常。");
await browser.close();
