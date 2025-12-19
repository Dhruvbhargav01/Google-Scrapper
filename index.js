
const { chromium } = require('playwright');
const readline = require('readline');

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function typeLikeHuman(page, selector, text) {
  for (const char of text) {
    await page.type(selector, char, { delay: 120 });
  }
}

async function autoScroll(page, durationMs) {
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(800);
  }
}

async function isCaptchaPresent(page) {
  const iframeCount = await page.locator('iframe[src*="recaptcha"]').count();
  const textCount = await page.locator('text=/unusual traffic/i').count();
  return iframeCount > 0 || textCount > 0;
}

(async () => {
  const searchQuery = await askQuestion('What do you want to search? ');

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
  });

  const page = await context.newPage();

  console.log('Opening Google...');
  await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });

  await page.click('textarea[name="q"]');
  await typeLikeHuman(page, 'textarea[name="q"]', searchQuery);

  await page.waitForTimeout(4000);
  await page.keyboard.press('Enter');

  await page.waitForTimeout(5000);

  if (await isCaptchaPresent(page)) {
    console.log('\nCaptcha detected.');
    console.log('Solve it manually in the browser.');
    console.log('Press ENTER here after solving.\n');
    await askQuestion('');
  }

  await page.waitForSelector('a h3', { timeout: 15000 });
  await page.locator('a h3').first().click();

  await page.waitForLoadState('domcontentloaded');

  console.log('Scrolling page...');
  await autoScroll(page, 12000);

  const data = await page.evaluate(() => {
    const title = document.title;
    const description =
      document.querySelector('meta[name="description"]')?.content || '';

    const links = Array.from(document.querySelectorAll('a'))
      .map(a => a.href)
      .filter(h => h.startsWith('http'))
      .slice(0, 20);

    const prices = document.body.innerText.match(/₹\s?\d+[,\d]*/g) || [];

    return {
      title,
      description,
      links,
      prices: [...new Set(prices)]
    };
  });

  console.log('\nScraped Data:\n');
  console.log(JSON.stringify(data, null, 2));

  await browser.close();
})();




