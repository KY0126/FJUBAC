import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const outputDir = "/home/ubuntu/screenshots/brand-review";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });

async function capture(path, name, viewport) {
  const page = await browser.newPage({ viewport });
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3_650);
  const skip = page.getByRole("button", { name: "略過導覽" });
  if (await skip.count()) await skip.click();
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${outputDir}/${name}.png`, fullPage: true });
  await page.close();
}

await capture("/", "home-desktop-after-loader", { width: 1440, height: 900 });
await capture("/apply", "apply-desktop-after-loader", { width: 1440, height: 900 });
await capture("/apply", "apply-mobile-after-loader", { width: 390, height: 844 });
await browser.close();
console.log(`品牌視覺檢視截圖已輸出至 ${outputDir}`);
