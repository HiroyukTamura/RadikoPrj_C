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
const {app, BrowserWindow, ipcMain} = require('electron');
const url = require('url');
const rp = require('request-promise');
const csv = require('csvtojson');
const exec = require('child_process').exec;
const iconv = require('iconv-lite');
const Sudoer = require('electron-sudo').default;
const cheerio = require('cheerio');
const parseString = require('xml2js').parseString;
const moment = require('moment');
let masterJson;
let vpnJson;
let postGotJsons;

const RADIKO_URL = 'http://radiko.jp/#!/ts/TBS/20180427180000';
const HTML_PATH = 'public/timetable/index.html';

// console.log = function (...val) {
//     const vals = val.join(' ') + '\n';
//     fs.appendFile('./debug.log', vals, function (err) {
//         if (err)
//             throw err;
//     });
// };

let win;//グローバルにしないとGCに回収されてウィンドウが閉じる
function createWindow () {
    // Create the browser window.
    console.log('createWindow');
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            // nodeIntegration: false,
            webSecurity: false
        }
    });

    // and load the index.html of the app.
    win.loadURL(url.format({
        pathname: path.join(__dirname, HTML_PATH),
        protocol: 'file:',
        slashes: true
    }));

    win.webContents.openDevTools();

    win.on('closed', () => {
        // ウィンドウオブジェクトを参照から外す。
        // もし何個かウィンドウがあるならば、配列として持っておいて、対応するウィンドウのオブジェクトを消去するべき。
        win = null;
    });

    ipcMain.on('startDlWithFt', (event, arg) => {
        new PuppeteerKicker(arg).launchPuppeteer().then(_=> {
            console.warn('launchPuppeteer completed');
        }).catch((e) => {
            console.warn(e);
        });
    });

    // new OpenVpn().init();
    // masterJson = new MasterJson();
    // masterJson.requestJson();
    // vpnJson = new GateVpnCsv();
    // vpnJson.requestCsv();
    // new PuppeteerOperator().getRegionWithPuppeteer();
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

class PuppeteerKicker {
    constructor(arg){
        this.ft = arg.ft;
        this.stationId = arg.stationId;
        this.URL = 'http://radiko.jp/#!/ts/'+ arg.stationId +'/'+ arg.ft;
        this.USER_DATA_PATH = 'UserData';
        this.FLASH_PATH = 'pepflashplayer64_29_0_0_171.dll';
        this.chunkListDir = 'TempChunkList';
        this.playBtnSlector = '#now-programs-list > div.live-detail__body.group > div.live-detail__text > p.live-detail__play.disabled > a';
        this.browser = null;
        this.DlTasks = [];
        this.taskLimit = 2;
    }

    async isPossibleToDl(){
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.139 Safari/537.36');
        await page.goto(this.URL);
        return await page.$(this.playBtnSlector) === null;
    }

    async closeBrowser(){

    }

    async launchPuppeteer() {
        if (this.browser)
            return;
        this.browser = await puppeteer.launch({
            headless: false,
            // userDataDir: 'UserData',
            executablePath: 'Application/chrome.exe',
            args: [
                // '--auto-open-devtools-for-tabs',
                // '--auto-select-desktop-capture-source=pickme',
                // '--ppapi-flash-path= '+ self.FLASH_PATH,
                // 'userDataDir= '+ self.USER_DATA_PATH,
                // '--disable-infobars',
                '--mute-audio', // Mute any audio
                '--disable-sync',// Disable syncing to a Google account
                '--no-first-run',// Skip first run wizards
                '--disable-default-apps',// Disable installation of default apps on first run
                '--load-extension=' + __dirname,  // eslint-disable-line no-path-concat
                '--no-sandbox',
                '--disable-setuid-sandbox',
                // No autoplay
                // '--autoplay-policy=user-gesture-required'
            ]
        });
        // const page = await browser.newPage();
        // await page.setUserAgent('Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.139 Safari/537.36');
        // page.on('response', response => {
        //     console.log(response.status(), response.url());
        //     const url = response.url();
        //     if (response.url().indexOf('chunklist') === -1 || path.extname(url) !== '.m3u8')
        //         return;
        //
        //     response.text().then(function (status) {
        //         if (status.trim() === '') {
        //             console.log('空ファイル', response.url());
        //             return;
        //         }
        //
        //         if (isFileExists(self.chunkListDir)) {
        //             fs.removeSync(self.chunkListDir);
        //         }
        //         const pathE = self.chunkListDir + '/' + path.basename(url);
        //         writeFile(pathE, response).then(() => {
        //             console.log('書き込み完了');
        //             // runFfmpeg(pathE);
        //         }).catch(err => {
        //             console.log(err);
        //         });
        //     });
        // });
        // await page.goto(this.URL);
        // await page.click("#now-programs-list > div.live-detail__body.group > div.live-detail__text > p.live-detail__play.disabled > a");
        // await page.click('#colorbox--term > p.colorbox__btn > a');
        // await page.waitFor(10 * 1000);
        // await browser.close();
    }
}

String.prototype.splice = function(start, delCount, newSubStr) {
    return this.slice(0, start) + newSubStr + this.slice(start + Math.abs(delCount));
};

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

// async function editConfig(page) {
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
    // await page.click("#now-programs-list > div.live-detail__body.group > div.live-detail__text > p.live-detail__play > a");
    // await page.click("#now-programs-list > div.live-detail__body.group > div.live-detail__text > p.live-detail__play.disabled > a");
    // await page.click("#colorbox--term > p:nth-child(4) > a");
// }

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
        .output('output/output.mp4')
        .run();
}