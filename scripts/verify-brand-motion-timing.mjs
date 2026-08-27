import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const duration = 1_800;
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
const loader = page.locator(".brand-loader");
await page.waitForFunction(() => document.querySelector(".brand-loader") !== null);
await page.waitForTimeout(duration - 1_000);
if (await loader.count() !== 1) throw new Error("品牌進入動畫早於約 3.5 秒結束。");
await page.waitForTimeout(1_150);
if (await loader.count() !== 0) throw new Error("品牌進入動畫未於約 3.5 秒後結束。");

const skip = page.getByRole("button", { name: "略過導覽" });
if (await skip.count()) await skip.click();
await page.getByRole("link", { name: "我要申請", exact: true }).click();
await page.waitForURL("**/apply");
const curtain = page.locator(".brand-route-curtain.is-visible");
await page.waitForFunction(() => document.querySelector(".brand-route-curtain.is-visible") !== null);
await page.waitForTimeout(duration - 1_000);
if (await curtain.count() !== 1) throw new Error("品牌換頁動畫早於約 3.5 秒結束。");
await page.waitForTimeout(1_150);
if (await curtain.count() !== 0) throw new Error("品牌換頁動畫未於約 3.5 秒後結束。");

await browser.close();
console.log("品牌載入驗收通過：進入網站與內部換頁遮罩均維持約 1.8 秒。 ");
