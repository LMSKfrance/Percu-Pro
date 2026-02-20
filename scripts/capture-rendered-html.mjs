/**
 * Capture full rendered DOM HTML from the running Percu Pro dev server.
 * Run: node scripts/capture-rendered-html.mjs
 * Requires: npm install -D puppeteer (or use npx puppeteer)
 */
const url = process.env.APP_URL || 'http://localhost:5185/';

async function main() {
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
    await page.waitForSelector('header', { timeout: 10000 });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    console.log(html);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
