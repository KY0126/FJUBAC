import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.goto(`${baseUrl}/me`, { waitUntil: "networkidle" });
await page.waitForSelector("text=個人中心需要登入");
if (!(await page.getByRole("link", { name: "社員登入" }).count())) throw new Error("未登入個人中心未提供社員登入入口。");
const personalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
if (personalOverflow) throw new Error("個人中心未登入保護頁於行動尺寸出現水平溢出。");

await page.goto(`${baseUrl}/account`, { waitUntil: "networkidle" });
await page.waitForSelector("text=社員登入");
if (!(await page.getByRole("button", { name: "登入" }).count())) throw new Error("帳號登入頁缺少登入操作。");
const accountOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
if (accountOverflow) throw new Error("帳號登入頁於行動尺寸出現水平溢出。");

console.log("個人中心瀏覽器驗收通過：未登入保護、登入入口與行動版水平溢出檢查均正常。");
await browser.close();
