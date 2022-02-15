import { chromium } from 'playwright-core';
import { solveCaptcha } from './solveCaptcha';
import userAgents from './useragents';

(async () => {

    const browser = await chromium.launch({
        headless: false,
        args: [
            `--user-agent=${userAgents[Math.floor(Math.random() * userAgents.length)]}`,
            '--disable-site-isolation-trials',
            '--disable-features=site-per-process,SitePerProcess',
            '--disable-blink-features=AutomationControlled',
            '--enable-features=UserAgentClientHint',
            '--start-maximized'
        ],

    });

    const ctx = await browser.newContext();
    await ctx.addInitScript( () => {

    });
    const page = await ctx.newPage();

    await page.goto('http://democaptcha.com/demo-form-eng/hcaptcha.html');
    // await page.goto('https://2captcha.com/ru/demo/hcaptcha');

    await solveCaptcha(page);

    await Promise.all([
        page.waitForNavigation(),
        page.click('input[type="submit"]'),
    ]);

    const h2 = await page.waitForSelector('h2')
    console.log(`Done. Result: "${await h2.textContent()}"`);

    await browser.close();
})();


