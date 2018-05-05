"use strict";
// const geckodriver = require('geckodriver');
// const {Builder, By, Key, until} = require('selenium-webdriver');
// const webdriverio = require('webdriverio');

// (async function example() {
//     let driver = await new Builder().forBrowser('firefox').build();
//     driver.manage().logs().getAvailableLogTypes().then((val)=>{
//         console.log(val);
//     }).catch((err)=>{
//         console.log(err);
//     });
//     // driver.manage().logs().get(LogType.PERFORMANCE).getAll();
//     try {
//         await driver.get('http://radiko.jp/#!/ts/FMJ/20180415150000');
//         await driver.findElement(By.css('#now-programs-list > div.live-detail__body.group > div.live-detail__text > p.live-detail__play.disabled > a')).click();
//         await driver.findElement(By.css("#colorbox--term > p:nth-child(4) > a")).click();
//         await driver.findElement(By.css("#colorbox--term > p.colorbox__btn > a")).click();
//
//         await new Promise(resolve => setTimeout(resolve, 10000));
//     } finally {
//         await driver.quit();
//     }
// })();

// !function () {
//     const options = {
//         desiredCapabilities: {
//             browserName: 'firefox'
//         }
//     };
//
//     webdriverio
//         .remote(options)
//         .init()
//         .url('http://www.google.com')
//         .getTitle().then(function(title) {
//         console.log('Title was: ' + title);
//     })
//         .end()
//         .catch(function(err) {
//             console.log(err);
//         });
// }();




// driver.get('http://radiko.jp/#!/ts/FMJ/20180415150000').then(function(){
//     console.log('koko');
//
//     driver.quit();
// });


// const puppeteer = require('puppeteer');

// const shadowSelectorFn = (el, selector) => el.shadowRoot.querySelector(selector);
//
// const queryDeep = async (page, ...selectors) => {
//     if (!selectors || selectors.length === 0) {
//         return;
//     }
//
//     const [ firstSelector, ...restSelectors ] = selectors;
//     let parentElement = await page.$(firstSelector);
//     let count = 0;
//     for (const selector of restSelectors) {
//         parentElement = await page.evaluateHandle(shadowSelectorFn, parentElement, selector);
//         console.log(count);
//         count++;
//     }
//
//     return parentElement;
// };

const puppeteer = require('puppeteer');
const path = require('path');
// const isUrl = require('is-url');
const fs = require('fs-extra');
const ffmpeg = require('fluent-ffmpeg');
const ffmpeg_static = require('ffmpeg-static');
const http = require('http');
const httpProxy = require('http-proxy');
const request = require('request');
const {app, BrowserWindow} = require('electron');
const url = require('url');
const rp = require('request-promise');
const csv = require('csvtojson');
const exec = require('child_process').exec;
const iconv = require('iconv-lite');
const Sudoer = require('electron-sudo').default;
const cheerio = require('cheerio');
const parseString = require('xml2js').parseString;
let masterJson;
let vpnJson;
let postGotJsons;

const RADIKO_URL = 'http://radiko.jp/#!/ts/TBS/20180427180000';

console.log = function (...val) {
    const vals = val.join(' ') + '\n';
    fs.appendFile('./debug.log', vals, function (err) {
        if (err)
            throw err;
    });
};

let win;//グローバルにしないとGCに回収されてウィンドウが閉じる
function createWindow () {
    // Create the browser window.
    console.log('createWindow');
    win = new BrowserWindow({width: 800, height: 600});

    // and load the index.html of the app.
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    win.on('closed', () => {
        // ウィンドウオブジェクトを参照から外す。
        // もし何個かウィンドウがあるならば、配列として持っておいて、対応するウィンドウのオブジェクトを消去するべき。
        win = null;
    });

    // new OpenVpn().init();
    // masterJson = new MasterJson();
    // masterJson.requestJson();
    // vpnJson = new GateVpnCsv();
    // vpnJson.requestCsv();
    new PuppeteerOperator().getRegionWithPuppeteer();
}

app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    console.log('window-all-closed');
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    console.log('active');
    if (win === null) {
        createWindow();
    }
});

class PuppeteerOperator {
    // http://radiko.jp/v3/station/list/JP13.xml
    constructor(){
        // this.URL ='http://radiko.jp/v2/api/program/station/weekly?station_id=TBS';
        this.TOP_PAGE = 'http://radiko.jp/#!/top';
        this.TOP_TARGET = 'http://radiko.jp/v3/station/list';
        this.PRG_PAGE ='http://radiko.jp/#!/timeshift';
        this.PRG_TARGET = 'http://radiko.jp/v3/program/date/';
    }
    async getRegionWithPuppeteer(){
        // const FLASH_PATH = 'C:\\windows\\system32\\Macromed\\Flash\\pepflashplayer64_29_0_0_140.dll';
        const browser = await puppeteer.launch({
            // userDataDir: 'User Data',
            executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            args: [
                '--enable-usermedia-screen-capturing',
                '--allow-http-screen-capture',
                '--no-sandbox',
                // '--no-sandbox',
                // '--ppapi-flash-path= '+ FLASH_PATH,
                // "--allow-running-insecure-content",
                // "--allow-insecure-websocket-from-https-origin",
                // "--allow-outdated-plugins",
            ]
        });
        const scraper = new StationListScraper(browser, this.TOP_PAGE, this.TOP_TARGET);
        await scraper.requestPage();
        const scraper2 = new ProgramScraper(browser, this.PRG_PAGE, this.PRG_TARGET);
        await scraper2.requestPage();
        // await browser.close();
    }
}

class AbstractScraper {
    constructor(browser, url, targetUrl){
        this.browser = browser;
        this.url = url;
        this.targetUrl = targetUrl;
        this.isGotPage = false;
    }

    async requestPage(){
        const page = await this.browser.newPage();
        const self = this;
        page.on('response', response => {
            if (!this.isGotPage && response.status() === 200 && this.isTargetUrl(response.url())) {
                response.text().then(function (status) {
                    console.warn('こっち');
                    parseString(status, function (err, data) {
                        if (err)
                            self.onError(err);
                        else {
                            self.isGotPage = true;
                            self.onGetWebPage(data);
                        }
                    });
                });
            }
        });
        await page.goto(this.url);
    }

    isTargetUrl(url){
        throw new Error('this method must override');
    }

    onGetWebPage(response){
        throw new Error('this method must override');
    }

    onError(err){
        throw new Error('this method must override');
    }

    getTargetUrl(){
        return this.targetUrl;
    }
}

class StationListScraper extends AbstractScraper {
    isTargetUrl(url){
        return url.includes(super.getTargetUrl());
    }

    onGetWebPage(data){
        const stations = data['stations']['station'];
        for (let i = 0; i < stations.length; i++) {
            const name = stations[i]['name'][0];
            const id = stations[i]['id'];
            const logoUrl = 'https://radiko.jp/v2/static/station/logo/'+ id +'/lrtrim/224x100.png';/*todo urlを決め打ちしているので、url変更時にロゴ取得失敗の可能性*/
            const $ = cheerio.load(fs.readFileSync('index.html'));
            const html = $('<a href="#" class="mdl-layout__tab" id="'+ id +'"><img src="'+ logoUrl +'" alt="'+ name +'"></a>');
            $('.mdl-layout__tab-bar').append(html);
        }
        //todo イベント発火
    }

    onError(err){
        console.warn(err);
        //todo エラー処理
    }
}

class ProgramScraper extends AbstractScraper{
    isTargetUrl(url) {
        return url.includes(super.getTargetUrl());
    }

    onGetWebPage(data) {
        console.warn('ProgramScraper', 'onGetWebPage');
        const arr =  data['radiko']['stations'][0]['station'];
        for (let i = 0; i < arr.length; i++) {
            const id = arr[i]['$']['id'];
            const name = arr[i]['name'];
            const ymd = arr[i]['progs'][0]['date'];
            const prgArr = arr[i]['progs'][0]['prog'];
            console.warn(id, name, ymd);
            for (let j = 0; j < prgArr.length; j++) {
                console.warn(prgArr[j]);
            }
        }
    }

    onError(err){
        console.warn(err);
        //todo エラー処理
    }
}

class MasterJson {
    constructor(){
        this.json = null;
    }
    requestJson(){
        const self = this;
        request('http://wppsc.html.xdomain.jp/VpnGate/list.txt', function (error, response, body) {
            if (error) {
                console.log('requestJson', error);
            } else {
                self.json = JSON.parse(body);
                if (vpnJson.isComplete && !postGotJsons) {
                    new PostGotJsons();
                }
            }
        });
    }
}

class GateVpnCsv {
    constructor(){
        this.GATE_VPN_URL = 'http://www.vpngate.net/api/iphone/';
        this.csvRowArr = [];
        this.isComplete = false;
    }

    requestCsv() {
        const self = this;
        csv()
            .fromStream(request.get(this.GATE_VPN_URL))
            .on('csv',(csvRow)=>{
                if (csvRow[6] === 'JP') {
                    self.csvRowArr.push(csvRow);
                }
            })
            .on('done',(error)=>{
                const log = error ? error : '成功';
                console.log('requestCsv', log);
                self.isComplete = true;
                if (masterJson.json && !postGotJsons) {
                    new PostGotJsons();
                }
            });
    }
}

class PostGotJsons {
    constructor() {
        this.extractedIps = {
            "hokkaido-tohoku": null,
            "kanto": null,
            "hokuriku-koushinetsu": null,
            "chubu": null,
            "kinki": null,
            "chugoku-shikoku": null,
            "kyushu": null
        };
        this.regions = Object.keys(this.extractedIps);

        this.extract();
    }

    extract(){
        const self = this;
        const masterIps = Object.keys(masterJson.json);
        vpnJson.csvRowArr.forEach(function (row) {
            const num = masterIps.indexOf(row[1]);
            if (num === -1) {
                console.warn('!!!知らないIPアドレスだ!!!', row[1]);
            } else {
                let regionRow = self.extractedIps[masterJson.json[row[1]]];//ここ、参照渡しじゃなくて値渡しになってるから気をつけて。
                if (!regionRow || parseInt(row[4], 10) > parseInt(regionRow[4], 10))
                    self.extractedIps[masterJson.json[row[1]]] = row;
            }
        });
        console.log(JSON.stringify(this.extractedIps));
    }
}

class OpenVpn {
    constructor(){
        const cmd = 'cd C:/Program Files/OpenVPN/bin && openvpn --config "C:/Program Files/OpenVPN/config/vpngate_vpn943899651.opengw.net_tcp_1725.ovpn"';
        this.cp = exec(cmd);
        // this.sudoer = new Sudoer({name: 'electron sudo application'});
    }

    init(){
        // await this.sudoer.exec(cmd);
        this.cp.stdout.on('data', function(data) {
            // const str = iconv.decode(data, "Shift_JIS");
            if (data && data.toString().indexOf('All TAP-Windows adapters on this system are currently in use') !== -1) {
                console.log('↓↓↓↓対応すべきエラーが発生↓↓↓↓');
            }
            console.log('stdout', data);
        });
        this.cp.stderr.on('data', function(data) {
            // const str = iconv.decode(data, "Shift_JIS");
            console.log('stderr', data);
        });
        this.cp.on('close', function(code) {
            console.log('closing code: ' + code);
        });
        this.cp.on('error', function (err) {
            console.warn('error', err);
        })
    }
}

async function editConfig(page) {
    // const slcPlayBtnLive = '#now-programs-list > div.live-detail__body.group > div.live-detail__text > p.live-detail__play > a';
    const slcPlayBtnFree = '#now-programs-list > div.live-detail__body.group > div.live-detail__text > p.live-detail__play.disabled > a';
    const slcPlayBtn2nd = '#colorbox--term > p.colorbox__btn > a';
    const chunkListDir = 'chunklist';
    const ffmpegDir = 'C:\\ffmpeg\\ffmpeg-20180427-4833050-win64-static\\bin\\';
    ffmpeg.setFfmpegPath(ffmpegDir+'ffmpeg.exe');
    ffmpeg.setFfprobePath(ffmpegDir+'ffprobe.exe');
    // https://www.html5rocks.com/ja/tutorials/webcomponents/shadowdom/
    //     chrome://settings/content/siteDetails?site=http%3A%2F%2Fradiko.jp
    // await page.goto('chrome://settings/content/flash');
    // await page.waitFor(3*1000);
    //
    // let shadowRoot = await page.evaluate((sel) => {
    //     return document.getElementsByTagName(sel)[0];
    // }, 'settings-ui');
    // console.log('settings-ui', shadowRoot);


    // const e = await page.$('#main');
    // console.log(e.shadowRoot);
    // const k = await e.$('#main');
    // console.log(e.shadowRoot);
    // e.shadowRoot.querySelector('#addSite');
    // console.log(e);
    // e.screenshot({path: 'example.png'});
    // await queryDeep(page, '#settings-ui', '#main');
    // const main = getShadowRootChild(page.$("#settings-ui"), "#main");
    // const subPage = getShadowRootChild(main, 'settings-basic-page');
    // const settingSec = getShadowRootChild(subPage, '#advancedPage > settings-section.expanded');
    // const f = getShadowRootChild(settingSec, '#advancedPage > settings-section.expanded > settings-privacy-page');
    //
    // const result = await page.evaluate(getShadowRootChildText, elHandle, shadowSelector);
    // await page.screenshot({path: 'example.png'});
    // await page.type('#input-1', RADIKO_URL);
    //
    await page.setUserAgent('Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.139 Safari/537.36');
    await page.goto(RADIKO_URL);
    page.on('response', response => {
        console.log(response.status(), response.url());
        const url = response.url();
        if (response.url().indexOf('chunklist') !== -1 && path.extname(url) === '.m3u8') {
            response.text().then(function (status) {
                if (status.trim() === '') {
                    console.log('空ファイル', response.url());
                } else {
                    if (isFileExists(chunkListDir)) {
                        fs.removeSync(chunkListDir);
                    }
                    const pathE = chunkListDir +'/'+ path.basename(url);
                    writeFile(pathE, response).then(()=> {
                        console.log('書き込み完了');
                        runFfmpeg(pathE);
                    }).catch(err =>{
                        console.log(err);
                    });
                }
            });
        }
        // const url = response.url().split('?')[0];
        // if (path.basename(url) === 'playlist.m3u8') {
        //     response.text().then(function (status) {
        //         if (status === '')
        //             return;
        //         const arr = status.split('\n');
        //         for (let i = 0; i < arr.length; i++) {
        //             if (isUrl(arr[i])) {
        //                 console.log('キタゾー', value);
        //                 break;
        //             }
        //         }
        //     })
        // }
    });
    // await page.click("#now-programs-list > div.live-detail__body.group > div.live-detail__text > p.live-detail__play > a");
    // await page.click("#now-programs-list > div.live-detail__body.group > div.live-detail__text > p.live-detail__play.disabled > a");
    // await page.click("#colorbox--term > p:nth-child(4) > a");
    await page.waitFor(3*1000);
    await page.click(slcPlayBtnFree);
    await page.click(slcPlayBtn2nd);
    await page.waitFor(3*1000);

    // await page.waitFor(30*60*1000);
}

async function writeFile(pathE, response) {
    await fs.outputFile(pathE, await response.buffer());
}

function isFileExists(filePath) {
    try {
        fs.statSync(filePath);
        return true;
    } catch(err) {
        return false;
    }
}

function runFfmpeg(pathE) {
    ffmpeg(pathE)
        .setFfmpegPath(ffmpeg_static.path)
        .audioCodec('copy')
        .videoCodec('copy')
        .on('start', function(commandLine) {
            console.log('Spawned Ffmpeg with command: ' + commandLine);
        })
        .on('error', function(err, stdout, stderr) {
            console.log('Cannot process video: ' + err.message);
        })
        .on('end', function(stdout, stderr) {
            console.log('Transcoding s  ucceeded !');
        }).on('progress', function(progress) {
            console.log('Processing: ' + progress.percent + '% done');
        })
        .inputOptions([
            '-protocol_whitelist', 'file,http,https,tcp,tls,crypto'
        ])
        .outputOptions([
            '-bsf:a aac_adtstoasc'
        ])
        .output('output.mp4')
        .run();
}

(async () => {
    // const FLASH_PATH = 'C:\\windows\\system32\\Macromed\\Flash\\pepflashplayer64_29_0_0_140.dll';
    // const browser = await puppeteer.launch({
    //     headless: false,
    //     // userDataDir: 'User Data',
    //     executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    //     args: [
    //         '--enable-usermedia-screen-capturing',
    //         '--allow-http-screen-capture',
    //         '--no-sandbox',
    //         // '--no-sandbox',
    //         // '--ppapi-flash-path= '+ FLASH_PATH,
    //         // "--allow-running-insecure-content",
    //         // "--allow-insecure-websocket-from-https-origin",
    //         // "--allow-outdated-plugins",
    //     ]
    // });
    // const page = await browser.newPage();
    //
    // // await connect(page);
    //
    // await browser.close();

    // customAccess();

    // testSample();
})();

async function testSample() {
    const browser = await puppeteer.launch({
        // Ug: https://bugs.chromium.org/p/chromium/issues/detail?id=706008
        headless: false,
        // TODO: smarter way to find this
        // Ug: https://bugs.chromium.org/p/chromium/issues/detail?id=769894
        executablePath: 'C:\\Program Files (x86)\\Google\\Chrome Dev\\Application\\chrome.exe',
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
        slowMo: 100
    });
    const page = await browser.newPage();
}

async function connect(page) {
    page.on('response', response => {
        // console.log(response.status(), response.url());
    });
    await page.goto('https://abema.tv/now-on-air/special-plus-2');
    await page.waitFor(20*1000);

    await page.evaluate(()=>{
        const session = {
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: 'screen',
                },
                optional: []
            },
        };
        navigator.webkitGetUserMedia(session, (stream)=>{
            let chunks=[], recorder = new MediaRecorder(stream, {
                videoBitsPerSecond: 250000,
                ignoreMutedMedia: true,
                mimeType: 'video/webm'
            });
            recorder.ondataavailable = function (event) {
                console.log('recorder.ondataavailable');
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            recorder.onstop = function () {
                console.log('録画ストップ');
                let superBuffer = new Blob(chunks, {
                    type: 'video/webm'
                });

                const url = URL.createObjectURL(superBuffer);
                const a = document.createElement('a');
                document.body.appendChild(a);
                a.style = 'display: none';
                a.href = url;
                a.download = 'test.webm';
                a.click();
            };

            console.log('録画スタート');
            recorder.start();

            setTimeout(()=>{
                recorder.stop()
            }, 5000);
        }, (args)=>{
            console.log(args)
        });
    });

    await page.waitFor(20*1000);
}

function customAccess() {
    //
    // http.createServer(function(req, res) {
    //     // You can define here your custom logic to handle the request
    //     // and then proxy the request.
    //     proxy.web(req, res, {
    //         target: 'http://127.0.0.1:5060'
    //     }, function (err) {
    //         console.log(err);
    //     });
    // }).listen(8000);

    // const proxy = new httpProxy.createProxyServer({
    //     target: 'http://kakunin.net'
    // });
    // proxy.on('proxyReq', function(proxyReq, req, res, options) {
    //     proxyReq.setHeader('X-Special-Proxy-Header', 'foobar');
    // }).on('proxyRes', function (proxyRes, req, res) {
    //     console.log(res.toString());
    // }).on('error', function (err, req, res) {
    //     res.writeHead(500, {
    //         'Content-Type': 'text/plain'
    //     });
    //
    //     res.end('Something went wrong. And we are reporting a custom error message.');
    // });
    //
    // const proxyServer = http.createServer(function (req, res) {
    //     proxy.web(req, res, {
    //         target: 'http://kakunin.net'
    //     }, function (err) {
    //         console.log('err', err.toString());
    //     });
    // });
    // proxyServer.listen(8080);
    // const proxy = httpProxy.createServer({
    //     target:'122.183.137.190:8080'
    // });
    // proxy.on('proxyReq', function(proxyReq, req, res, options) {
    //         console.log('proxyReq', res.body);
    //         proxyReq.setHeader('X-Special-Proxy-Header', 'foobar');
    //     }).on('proxyRes', function (proxyRes, req, res) {
    //         console.log('proxyRes');
    //     }).on('error', function (err, req, res) {
    //         res.writeHead(500, {
    //             'Content-Type': 'text/plain'
    //         });
    //     res.end('Something went wrong. And we are reporting a custom error message.');
    // });
    // proxy.listen(8080);
    //
    // httpProxy.createServer().listen(8080);

    const proxy = request.defaults({'proxy': 'http://125.175.176.29:8080'});
    const server = http.createServer(function (req, res) {
        proxy.get('http://www.google.co.jp/');
    });
    server.listen(8080);
    // const proxy = request.defaults({'proxy': 'http://122.183.137.190:8080'});
    // proxy.get("http://github.com/", function (error, response, body) {
    //     if (!error && response.statusCode == 200) {
    //         console.log(body);
    //     } else {
    //         console.log(error);
    //     }
    // });

    // httpProxy.createProxyServer({
    //     target: 'http://www.ugtop.com/spill.shtml'
    // }).listen(8080);

    // const https = require('https');
    // const HttpsProxyAgent = require('https-proxy-agent');
    // const proxyE = 'http://122.183.137.8080';
    // const agent = new HttpsProxyAgent(proxyE);
    // const post_req = https.request({
    //     uri: "https://www.npmjs.com/package/https-proxy-agent",
    //     host: 'localhost',
    //     port: '443',
    //     headers: {
    //         'Content-Type': 'application/x-www-form-urlencoded'
    //     },
    //     agent: agent,
    //     timeout: 10000,
    //     followRedirect: true,
    //     maxRedirects: 10
    // }, function(res) {
    //     res.setEncoding('utf8');
    //     res.on('data', function(chunk) {
    //         console.log('Response: ' + chunk);
    //     });
    // });
    // post_req.write("name=john");
    // post_req.end();
}