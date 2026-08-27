import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const routes = ["/", "/apply", "/account", "/announcements", "/events", "/links", "/learning", "/outcomes", "/departments", "/research", "/workspace", "/me", "/manage/workspace", "/manage/recruitment", "/manage/project-content", "/manage/accounts", "/404"];
const viewports = [{ name: "桌機", width: 1440, height: 900 }, { name: "平板", width: 768, height: 1024 }, { name: "手機", width: 390, height: 844 }];
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });

async function dismissOnboarding(page) {
  const skip = page.getByRole("button", { name: "略過導覽" });
  if (await skip.count()) await skip.click();
}

for (const viewport of viewports) {
  for (const route of routes) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    await dismissOnboarding(page);
    await page.waitForTimeout(800);
    const result = await page.evaluate(() => {
      const style = (element) => window.getComputedStyle(element);
      const main = document.querySelector("main");
      const visibleText = document.body.innerText.replace(/\s+/g, " ").trim();
      const persistentLoadingMessages = ["正在載入頁面…", "正在整理你的個人中心…"].filter(message => visibleText.includes(message));
      const horizontalOverflow = document.documentElement.scrollWidth > window.innerWidth + 1;
      const textClips = [...document.querySelectorAll("h1,h2,h3,h4,p,a,button,label,summary,strong,small,li")]
        .filter(element => element instanceof HTMLElement && element.offsetParent !== null)
        .filter(element => {
          const computed = style(element);
          const hidesOverflow = ["hidden", "clip"].includes(computed.overflowX) || ["hidden", "clip"].includes(computed.overflowY);
          return hidesOverflow && (element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2);
        })
        .map(element => element.textContent?.trim().slice(0, 80) || "未命名文字");
      const fixedOutOfBounds = [...document.querySelectorAll("*")]
        .filter(element => element instanceof HTMLElement && element.offsetParent !== null && style(element).position === "fixed")
        .filter(element => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && (rect.right > window.innerWidth + 2 || rect.left < -2 || rect.bottom > window.innerHeight + 2 || rect.top < -2);
        })
        .map(element => element.className || element.tagName);
      return { hasMain: Boolean(main), hasVisibleText: visibleText.length > 12, persistentLoadingMessages, horizontalOverflow, textClips, fixedOutOfBounds };
    });
    if (!result.hasMain || !result.hasVisibleText) throw new Error(`${viewport.name} ${route} 未完成可讀頁面載入。`);
    if (result.persistentLoadingMessages.length) throw new Error(`${viewport.name} ${route} 等待後仍停留在載入狀態：${result.persistentLoadingMessages.join("、")}。`);
    if (result.horizontalOverflow) throw new Error(`${viewport.name} ${route} 出現水平溢出。`);
    if (result.textClips.length) throw new Error(`${viewport.name} ${route} 出現疑似文字裁切：${result.textClips.join("、")}。`);
    if (result.fixedOutOfBounds.length) throw new Error(`${viewport.name} ${route} 有固定控制超出視窗：${result.fixedOutOfBounds.join("、")}。`);
    await page.close();
  }
}

await browser.close();
console.log("全頁面呈現驗收通過：17 條路由於桌機、平板、手機均完成載入，未見水平溢出、疑似文字裁切或固定控制超出視窗。 ");
