import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });

async function dismissOnboarding(page) {
  if (await page.getByRole("dialog").count()) await page.getByRole("button", { name: "略過導覽" }).click();
}

async function verifyDesktopTableOfContents(path, targetLabel, targetId) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  await dismissOnboarding(page);
  const toc = page.getByLabel("本頁章節目錄");
  if (await toc.count() !== 1) throw new Error(`${path} 應提供一個浮動章節目錄。`);
  if (await toc.locator(".floating-toc-desktop a").count() < 2) throw new Error(`${path} 桌機章節目錄應提供至少兩個可跳轉章節。`);
  await toc.getByRole("link", { name: targetLabel, exact: true }).click();
  await page.waitForURL(`**${path}#${targetId}`);
  await page.waitForFunction(id => { const top = document.getElementById(id)?.getBoundingClientRect().top; return typeof top === "number" && top > 75 && top < window.innerHeight - 100; }, targetId);
  const targetTop = await page.locator(`#${targetId}`).evaluate(element => element.getBoundingClientRect().top);
  if (targetTop > 180 && targetTop > 800) throw new Error(`${path} 的 ${targetLabel} 章節未停在安全的閱讀位置。`);
  await page.waitForFunction(({ label }) => [...document.querySelectorAll(".floating-toc-desktop a[aria-current='location']")].some(link => link.textContent?.trim() === label), { label: targetLabel });
  await page.close();
}

await verifyDesktopTableOfContents("/departments", "專案開發部", "department-project");
await verifyDesktopTableOfContents("/learning", "連結專案與交流", "learning-stage-03");
await verifyDesktopTableOfContents("/links", "公開資源", "public-resources");

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(`${baseUrl}/departments`, { waitUntil: "networkidle" });
await dismissOnboarding(mobile);
const mobileContents = mobile.getByLabel("本頁章節目錄").locator("details");
if (await mobileContents.count() !== 1) throw new Error("行動版應提供可展開的章節目錄。 ");
await mobileContents.locator("summary").click();
if (await mobileContents.getAttribute("open") === null) throw new Error("行動版章節目錄無法展開。 ");
await mobileContents.getByRole("link", { name: "對外發展部", exact: true }).click();
await mobile.waitForURL("**/departments#department-external");
await mobile.waitForFunction(() => { const top = document.getElementById("department-external")?.getBoundingClientRect().top; return typeof top === "number" && top > 70 && top < 180; });
if (await mobileContents.getAttribute("open") !== null) throw new Error("行動版選擇章節後應自動收合目錄。 ");
if (await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error("行動版浮動章節目錄不應造成水平溢出。 ");
await mobile.close();

console.log("浮動章節目錄驗收通過：桌機深連結、目前段落標示、行動展開與收合均正常。");
await browser.close();
