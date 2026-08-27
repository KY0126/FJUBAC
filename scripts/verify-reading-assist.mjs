import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function dismissOnboarding(currentPage) {
  if (await currentPage.getByRole("dialog").count()) await currentPage.getByRole("button", { name: "略過導覽" }).click();
}

await page.goto(`${baseUrl}/departments`, { waitUntil: "networkidle" });
await dismissOnboarding(page);
const progressBar = page.getByRole("progressbar", { name: "頁面閱讀進度" });
const backToTop = page.getByRole("button", { name: "回到頁面頂端" });
if (await progressBar.getAttribute("aria-hidden") !== "false") throw new Error("長頁面應顯示閱讀進度條。");
if (await backToTop.getAttribute("tabindex") !== "-1") throw new Error("未顯示的回到頂部按鈕不應進入鍵盤焦點序列。");
await page.evaluate(() => window.scrollTo(0, Math.round((document.documentElement.scrollHeight - window.innerHeight) * .6)));
await page.waitForFunction(() => Number(document.querySelector(".reading-progress")?.getAttribute("aria-valuenow")) > 40);
if (await backToTop.getAttribute("data-visible") !== "true") throw new Error("長頁捲動後應顯示回到頂部按鈕。");
if (await backToTop.getAttribute("tabindex") !== "0") throw new Error("顯示後的回到頂部按鈕應可使用鍵盤聚焦。");
await backToTop.click();
await page.waitForFunction(() => window.scrollY < 5);
if (Number(await progressBar.getAttribute("aria-valuenow")) !== 0) throw new Error("回到頂部後閱讀進度應回到 0%。");
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.emulateMedia({ reducedMotion: "reduce" });
await mobile.goto(`${baseUrl}/departments`, { waitUntil: "networkidle" });
await dismissOnboarding(mobile);
await mobile.evaluate(() => window.scrollTo(0, Math.round((document.documentElement.scrollHeight - window.innerHeight) * .6)));
await mobile.waitForFunction(() => document.querySelector(".reading-back-to-top")?.getAttribute("data-visible") === "true");
if (await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error("行動版閱讀輔助不應造成水平溢出。");
await mobile.getByRole("button", { name: "回到頁面頂端" }).click();
await mobile.waitForFunction(() => window.scrollY < 5);

console.log("閱讀輔助驗收通過：長頁進度、回到頂部、鍵盤焦點與行動版減少動態均正常。");
await browser.close();
