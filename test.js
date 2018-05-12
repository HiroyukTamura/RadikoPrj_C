const app = require('electron').remote.app;
const puppeteer = require('puppeteer');

window.onload = function(){
    hogehoge().then(function () {
        console.warn('完了');
    }).catch(function (e) {
        console.warn(e);
    });
};

async function hogehoge() {
    const browser = await puppeteer.launch({
        headless: true,
        // executablePath: 'C:\\Program Files (x86)\\Google\\Chrome Dev\\Application\\chrome.exe',
        args: [
            // '--auto-open-devtools-for-tabs',
            '--auto-select-desktop-capture-source=pickme',
            '--disable-infobars',
            '--load-extension=' + __dirname,  // eslint-disable-line no-path-concat
            '--no-sandbox',
            '--disable-setuid-sandbox',
            // No autoplay
            '--autoplay-policy=user-gesture-required'
        ],
    });
    const page = await browser.newPage();
    page.on('response', response => {
        if(response.headers()['set-cookie']) {
            console.log('きた', response.headers()['set-cookie']);
        }
    });
    await page.goto('http://radiko.jp/');
    await page.waitFor(10*1000);
    await browser.close();
}