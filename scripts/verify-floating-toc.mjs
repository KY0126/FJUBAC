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

const recruitment = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await recruitment.goto(`${baseUrl}/apply`, { waitUntil: "networkidle" });
await dismissOnboarding(recruitment);
const recruitmentToc = recruitment.getByLabel("本頁章節目錄");
if (await recruitmentToc.locator(".floating-toc-desktop a").count() < 4) throw new Error("招生頁目錄應提供申請流程、五部門、梯次選擇與常見問題等實際節點。 ");
await recruitmentToc.getByRole("link", { name: "選擇招生梯次", exact: true }).click();
await recruitment.waitForURL("**/apply#recruitment-cycle-selection");
await recruitment.waitForFunction(() => { const top = document.getElementById("recruitment-cycle-selection")?.getBoundingClientRect().top; return typeof top === "number" && top > 75 && top < 180; });
if (await recruitmentToc.locator(".floating-toc-desktop a[aria-current='location']").textContent() !== "選擇招生梯次") throw new Error("招生流程目錄未標示目前選擇的章節。 ");
await recruitmentToc.getByRole("button", { name: "收合章節目錄" }).click();
if (await recruitmentToc.locator(".floating-toc-desktop").getAttribute("data-collapsed") !== "true") throw new Error("桌機章節目錄無法收合。 ");
if (await recruitment.evaluate(() => window.localStorage.getItem("fjubac:toc:desktop-collapsed")) !== "true") throw new Error("桌機收合偏好未保存。 ");
await recruitment.reload({ waitUntil: "networkidle" });
if (await recruitmentToc.locator(".floating-toc-desktop").getAttribute("data-collapsed") !== "true") throw new Error("桌機收合偏好未在重新造訪後保留。 ");
await recruitmentToc.getByRole("button", { name: "展開章節目錄" }).click();
await recruitment.close();

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

const mobilePreference = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobilePreference.goto(`${baseUrl}/apply`, { waitUntil: "networkidle" });
await dismissOnboarding(mobilePreference);
const mobileRecruitmentToc = mobilePreference.getByLabel("本頁章節目錄").locator("details");
if (await mobileRecruitmentToc.getAttribute("open") !== null) throw new Error("未設定偏好時行動版章節目錄應維持收合。 ");
await mobileRecruitmentToc.locator("summary").click();
if (await mobilePreference.evaluate(() => window.localStorage.getItem("fjubac:toc:mobile-open")) !== "true") throw new Error("行動版展開偏好未保存。 ");
await mobilePreference.reload({ waitUntil: "networkidle" });
await mobilePreference.waitForFunction(() => document.querySelector(".floating-toc-mobile")?.hasAttribute("open") === true);
await mobileRecruitmentToc.getByRole("link", { name: "申請流程", exact: true }).click();
if (await mobilePreference.evaluate(() => window.localStorage.getItem("fjubac:toc:mobile-open")) !== "false") throw new Error("行動版收合偏好未在選擇章節後更新。 ");
await mobilePreference.close();

console.log("浮動章節目錄驗收通過：桌機深連結、目前段落標示、行動展開與收合均正常。");
await browser.close();
