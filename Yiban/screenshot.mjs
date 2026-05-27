import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto('http://localhost:3001');
await page.waitForSelector('input', { timeout: 10000 });

const inputs = await page.$$('input');
await inputs[0].fill('20230101');
await inputs[1].fill('123456');
const submitBtn = await page.$('button[type="submit"]') || await page.$('form button');
await submitBtn?.click();
await page.waitForURL(/student/, { timeout: 8000 }).catch(()=>{});
await page.waitForTimeout(1500);

await page.goto('http://localhost:3001/student/competitions');
await page.waitForTimeout(2500);
await page.screenshot({ path: '/tmp/competitions.png', fullPage: false });
console.log('done: /tmp/competitions.png');

await browser.close();
