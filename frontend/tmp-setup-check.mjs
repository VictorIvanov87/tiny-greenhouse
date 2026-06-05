import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
for (const vp of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  await page.goto('http://127.0.0.1:5174/setup', { waitUntil: 'networkidle' });
  console.log(vp.name, page.url(), await page.locator('body').innerText({ timeout: 5000 }).catch(e => String(e).slice(0,120)));
  await page.close();
}
await browser.close();
