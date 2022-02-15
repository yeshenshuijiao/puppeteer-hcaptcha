## hCaptcha solver for [Playwright](https://playwright.dev/)

A library to solve hcaptcha challenges that are automated within Playwright. You can automatically set response values where they should be so the only thing left for you is submitting the page or you can get the response token. Average response time is rougly 13 - 20 seconds with TensorFlow's Image Recognition.

Best results with [Playwright-stealth](https://github.com/berstend/puppeteer-extra/issues/454#issuecomment-917437212)

<img src="images/demo.gif" height="400px"/>

### If you like this project feel free to donate!

[![Donate with PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/paypalme/xrip/)

## Install

```bash
yarn add https://github.com/xrip/playwright-hcaptcha-solver.git
```

## Usage

```javascript
await solveCaptcha(page);
```

-   `page` [&lt;Page&gt;](https://playwright.dev/docs/api/class-page) - Playwright Page Instance

### Automatically set respone value 

```javascript
import { chromium } from 'playwright-core';
import { solveCaptcha } from './solveCaptcha';
import userAgents from './useragents';

(async () => {

    const browser = await chromium.launch({
        headless: false,
        args: [
            `--user-agent=${userAgents[Math.floor(Math.random() * userAgents.length)]}`,
            '--disable-blink-features=AutomationControlled',
        ],

    });

    const ctx = await browser.newContext();
    await ctx.addInitScript( () => {

    });
    const page = await ctx.newPage();

    await page.goto('http://democaptcha.com/demo-form-eng/hcaptcha.html');

    await solveCaptcha(page);

    await Promise.all([
        page.waitForNavigation(),
        page.click('input[type="submit"]'),
    ]);

    const h2 = await page.waitForSelector('h2')
    console.log(`Done. Result: "${await h2.textContent()}"`);

    await browser.close();
})();
```

## Credits
- Based on puppeteer-hcaptcha by [aw1875](https://github.com/aw1875/puppeteer-hcaptcha)
- Thanks to [Futei](https://github.com/Futei/SineCaptcha), [JimmyLaurent](https://github.com/JimmyLaurent/hcaptcha-solver/), [Nayde](https://github.com/nayde-fr), [DinoHorvat](https://github.com/dinohorvat), and [Tal](https://github.com/JustTalDevelops/)

