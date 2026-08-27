import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });

const desktop = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await desktop.goto(`${baseUrl}/announcements`, { waitUntil: "networkidle" });
const newsLink = desktop.getByRole("link", { name: "最新資訊" });
if ((await newsLink.getAttribute("aria-current")) !== "page") throw new Error("公告頁未標示目前頁導覽狀態。");
await desktop.getByText("社團介紹", { exact: true }).click();
await desktop.getByLabel("公開服務導覽").getByRole("link", { name: "五部門" }).click();
await desktop.waitForURL("**/departments");
await desktop.getByRole("heading", { name: "五部門介紹" }).waitFor();
if ((await desktop.getByLabel("公開服務導覽").getByText("社團介紹", { exact: true }).getAttribute("aria-current")) !== "page") throw new Error("部門頁未更新目前頁導覽狀態。");
const exploreSummary = desktop.getByLabel("公開服務導覽").getByText("探索 FJUBAC", { exact: true });
await exploreSummary.focus();
await desktop.keyboard.press("Enter");
await desktop.getByLabel("公開服務導覽").getByRole("link", { name: "學習地圖" }).waitFor();
await desktop.keyboard.press("Tab");
const keyboardFocusText = await desktop.evaluate(() => document.activeElement?.textContent?.trim());
if (keyboardFocusText !== "學習地圖") throw new Error("探索 FJUBAC 分組選單未提供可預期的鍵盤子連結焦點。");
await desktop.keyboard.press("Enter");
await desktop.waitForURL("**/learning");
await desktop.getByRole("heading", { name: "學習地圖" }).waitFor();

await desktop.goto(`${baseUrl}/announcements`, { waitUntil: "networkidle" });
await desktop.getByLabel("公開服務導覽").getByRole("link", { name: "社員登入" }).click();
await desktop.waitForURL("**/account");
await desktop.getByRole("link", { name: "目前不是社員？返回公開網站" }).click();
await desktop.waitForURL(`${baseUrl}/`);

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
if (await mobile.getByRole("dialog").count()) await mobile.getByRole("button", { name: "略過導覽" }).click();
await mobile.getByRole("button", { name: "開啟導覽選單" }).click();
await mobile.getByLabel("公開服務導覽").getByText("公開資訊", { exact: true }).waitFor();
await mobile.getByLabel("公開服務導覽").getByText("社員服務", { exact: true }).waitFor();
await mobile.getByLabel("公開服務導覽").getByText("探索 FJUBAC", { exact: true }).click();
await mobile.getByLabel("公開服務導覽").getByRole("link", { name: "學習地圖" }).waitFor();
await mobile.keyboard.press("Tab");
const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
if (mobileOverflow) throw new Error("行動版公開導覽列出現水平溢出。");
await mobile.getByLabel("公開服務導覽").getByRole("link", { name: "學習地圖" }).click();
await mobile.waitForURL("**/learning");

console.log("公開導覽列驗收通過：桌機與鍵盤分組、目前頁標示、行動版分區、公開路由與社員登入返回流程均正常。");
await browser.close();
