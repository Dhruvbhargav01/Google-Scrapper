const playwright = require("playwright");
const readline = require("readline");
const fs = require("fs");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36",
];

const viewports = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
];

const locales = ["en-US", "en-IN", "en-GB"];
const timezones = ["Asia/Kolkata", "Asia/Dubai", "Europe/London"];

async function isCaptchaPresent(page) {
  const iframeCount = await page.locator('iframe[src*="recaptcha"]').count();
  const textCount = await page.locator('text=/unusual traffic/i').count();
  return iframeCount > 0 || textCount > 0;
}

async function waitIfCaptcha(page) {
  const captchaTexts = ["unusual traffic", "verify you are human", "captcha"];
  for (const text of captchaTexts) {
    if ((await page.locator(`text=${text}`).count()) > 0) {
      await page.waitForTimeout(25000);
      break;
    }
  }
}

async function humanType(page, selector, text) {
  const input = page.locator(selector);
  await input.focus();
  for (const char of text) {
    await page.type(selector, char, { delay: 120 });
  }
  const finalValue = await input.inputValue();
  if (finalValue !== text) {
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
    await page.type(selector, text, { delay: 120 });
  }
}

async function autoScroll(page, durationMs) {
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(800);
  }
}

async function smartScrollAndCollect(page) {
  const collected = new Map();
  const start = Date.now();
  while (Date.now() - start < 12000 && collected.size < 5) {
    const items = await page.evaluate(() => {
      const out = [];
      const seen = new Set();
      document.querySelectorAll("div,article,section,li").forEach((el) => {
        if (out.length >= 5) return;
        const text = el.innerText || "";
        if (!/₹|lakh|cr|bhk|villa/i.test(text)) return;
        const price = text.match(/₹\s*[\d.,]+(?:\s*(Cr|Lakh|Lac))?/i)?.[0];
        const link = el.querySelector("a[href]")?.href;
        const title = el.querySelector("h1,h2,h3,h4")?.innerText;
        if (price && link && title && !seen.has(link)) {
          seen.add(link);
          out.push({ title, price, link });
        }
      });
      return out;
    });

    for (const item of items) {
      const key = `${item.title}-${item.link}`;
      if (!collected.has(key)) {
        collected.set(key, item);
      }
      if (collected.size >= 5) break;
    }

    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(800);
  }
  return Array.from(collected.values()).slice(0, 5);
}

(async () => {
  const searchText = await askQuestion("What would you want to search? ");
  rl.close();

  const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
  const viewport = viewports[Math.floor(Math.random() * viewports.length)];
  const locale = locales[Math.floor(Math.random() * locales.length)];
  const timezoneId = timezones[Math.floor(Math.random() * timezones.length)];

  const browser = await playwright.chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    userAgent: ua,
    viewport,
    locale,
    timezoneId,
  });

  await context.clearCookies();
  await context.clearPermissions();

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    try {
      localStorage.clear();
      sessionStorage.clear();
      indexedDB.databases().then((dbs) =>
        dbs.forEach((db) => indexedDB.deleteDatabase(db.name))
      );
    } catch {}
  });

  const page = await context.newPage();

  await page.goto("https://www.google.com", { waitUntil: "domcontentloaded" });

  if (await isCaptchaPresent(page)) {
    await page.waitForTimeout(25000);
  }

  await waitIfCaptcha(page);

  try {
    await page.click("button:has-text('Accept all'), button:has-text('I agree')", { timeout: 5000 });
  } catch {}

  const searchSelector = "textarea[name='q'], input[name='q']";
  await page.waitForSelector(searchSelector);
  await page.click(searchSelector);

  await humanType(page, searchSelector, searchText);

  await page.waitForTimeout(4000);
  await page.keyboard.press("Enter");

  await page.waitForTimeout(5000);

  if (await isCaptchaPresent(page)) {
    await page.waitForTimeout(25000);
  }

  await waitIfCaptcha(page);

  await page.waitForSelector("div#search a h3", { timeout: 15000 });

  const firstResult = page.locator("div#search a:has(h3)").first();
  const targetUrl = await firstResult.getAttribute("href");

  await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded" }), firstResult.click()]);

  if (await isCaptchaPresent(page)) {
    await page.waitForTimeout(25000);
  }

  const data = await smartScrollAndCollect(page);

  fs.writeFileSync(
    "output.json",
    JSON.stringify({ searchText, sourcePage: page.url(), totalItems: data.length, items: data }, null, 2),
    "utf-8"
  );

  await browser.close();
})();
