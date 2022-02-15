import { Page } from 'playwright-core';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs-node-gpu';
import jwtDecode from 'jwt-decode';
import axios from 'axios';
import userAgents from './useragents';

const solve = async (page, sitekey, host): Promise<string> => {
    let model;

    const tensor = async imgURL => {
        try {
            const image = await axios.get(imgURL, { responseType: 'arraybuffer' }).then(response => response.data);

            model = model || await cocoSsd.load();

            return model.detect(tf.node.decodeImage(image));
        } catch (e) {
            return null;
        }
    };

    const getNVC = async config => {
        if (!config) {
            return {};
        }
        const scriptPath = jwtDecode(config.req)['l'];
        const script = await axios.get(`${scriptPath}/${config.type}.js`).then(response => response.data);

        return {
            n: await page.evaluate(`${script}; ${config.type}("${config.req}")`),
            v: scriptPath.slice('https://newassets.hcaptcha.com/c/'.length),
            c: JSON.stringify(config),
        };
    };

    const recognizeImages = async (lookFor, tasks): Promise<Record<string, string>> =>
        (await Promise.all(tasks.map(task => tensor(task.datapoint_uri)))).reduce((results, [recognized], index) => {
            results[tasks[index].task_key] = String(recognized?.class.toUpperCase() === lookFor.toUpperCase() && recognized.score > 0.5);
            return results;
        }, new Map());


    const hCaptcha = axios.create({
        baseURL: 'https://hcaptcha.com/',
        headers: {
            Accept: 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Content-Type': 'application/x-www-form-urlencoded',
            Origin: 'https://newassets.hcaptcha.com',
            Referer: 'https://newassets.hcaptcha.com',
            'Sec-Fetch-Site': 'same-site',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',

        },
    });

    const getConfig = async () => hCaptcha.get(`checksiteconfig?host=${host}&sitekey=${sitekey}&sc=1&swa=1`).then(response => response.data?.c);

    while (true) {
        try {
            hCaptcha.defaults.headers['User-Agent'] = userAgents[Math.floor(Math.random() * userAgents.length)];

            const config = await getConfig();

            if (config?.type === 'hsj') {
                throw new Error('Unsupported challenge type. Retrying...');
            }

            const {
                tasklist,
                request_type: job_mode,
                key,
                generated_pass_UUID,
                requester_question,
            } = await hCaptcha.post(`getcaptcha?s=${sitekey}`, new URLSearchParams({
                sitekey,
                host,
                hl: 'en',
                motionData: JSON.stringify({
                    st: Date.now(),
                    dct: Date.now(),
                }),
                ...await getNVC(config),
            })).then(response => response.data);

            if (generated_pass_UUID) {
                return generated_pass_UUID;
            }

            if (key.charAt(0) !== 'E' && key.charAt(2) === '_') {
                return key;
            }

            const result = await hCaptcha.post(`checkcaptcha/${key}?s=${sitekey}`,
                {
                    job_mode,
                    answers: await recognizeImages(requester_question.en.split(' ').pop().replace('motorbus', 'bus'), tasklist),
                    serverdomain: host,
                    sitekey,
                    motionData: JSON.stringify({
                        st: Date.now() + 2000,
                        dct: Date.now() + 2000,
                    }),
                    ...await getNVC(await getConfig()),
                },
                { headers: { 'Content-Type': 'application/json' } }).then(response => response.data);

            if (!result.generated_pass_UUID) {
                throw new Error('Wrong response, retrying...');
            }

            return result.generated_pass_UUID;

        } catch (error) {
            if (error.response?.status === 429) {
                console.error('Rate limited. Waiting 30 seconds.');
                await new Promise(r => setTimeout(r, 30_000));
            } else {
                console.error(error.message);
            }
        }
    }
};

export const solveCaptcha = async (page: Page) => {
    const hcaptchaIframe = await page.waitForSelector('iframe[src*="newassets.hcaptcha.com"]');
    const urlParams = new URLSearchParams(await hcaptchaIframe.getAttribute('src'));

    const token = await solve(
        page,
        urlParams.get('sitekey'),
        urlParams.get('host'),
    );

    if (!token) {
        throw new Error('Error solving captcha');
    }

    await page.evaluate(token => {
        // @ts-ignore
        document.querySelector('[name="h-captcha-response"]').value = token;
    }, token);

    return;
};