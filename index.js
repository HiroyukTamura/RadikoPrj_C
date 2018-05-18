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
const {app, BrowserWindow, ipcMain, Menu, autoUpdater} = require('electron');
const url = require('url');
const rp = require('request-promise');
const csv = require('csvtojson');
const exec = require('child_process').exec;
const iconv = require('iconv-lite');
const Sudoer = require('electron-sudo').default;
const cheerio = require('cheerio');
const parseString = require('xml2js').parseString;
const moment = require('moment');
const events = require('events');
const Store = require('electron-store');
const electron = require('electron');
const FirebaseClient = require('./modules/FirebaseClient');
const FileExplorerOpener = require('./modules/FileOperator');
const DlTaskList = require('./modules/DlTaskList');
const DlTask = require('./modules/DlTask');
let masterJson;
let vpnJson;
let postGotJsons;

const HTML_PATH = 'public/timetable/index.html';

// console.log = function (...val) {
//     const vals = val.join(' ') + '\n';
//     fs.appendFile('./debug.log', vals, function (err) {
//         if (err)
//             throw err;
//     });
// };
//todo タイムアウトエラーを作成すること(特にffmpeg)
!function () {
    const store = new Store();
    if(!store.get('output_path')) {
        const path = app.getPath('downloads') || './output';
        store.set('output_path', path);
    }

    // autoUpdater.setFeedURL(options);
}();

class PuppeteerOperator {
    constructor(){
        this.ft = null;
        this.stationId = null;
        this.URL = null;
        this.USER_DATA_PATH = 'UserData';
        this.FLASH_PATH = 'pepflashplayer64_29_0_0_171.dll';
        this.chunkListDir = new Store().get('output_path');
        this.playBtnSlector = '#now-programs-list > div.live-detail__body.group > div.live-detail__text > p.live-detail__play.disabled > a';
        this.errMsgSelector = '#now-programs-list > div.live-detail__body.group > div.live-detail__text > p.live-detail__plan';
        this.userAgent = 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.139 Safari/537.36';
        this.browser = null;
        this.pageForDl = null;
    }

    static getTimeFreeUrl(stationId, ft){
        return 'http://radiko.jp/#!/ts/'+ stationId +'/'+ ft;
    }

    async isPossibleToDl(){
        const stationId = dlTaskList.getWorkingTask().stationId;
        const ft = dlTaskList.getWorkingTask().ft;
        const page = await this.browser.newPage();
        await page.setUserAgent(this.userAgent);
        await page.goto(PuppeteerOperator.getTimeFreeUrl(stationId, ft));
        await page.waitFor(3 * 1000);
        let status = 'UNKNOWN';
        if (await page.$(this.playBtnSlector) !== null)
            status = 'SUCCESS';
        if (await page.$(this.errMsgSelector) !== null) {
            status = await page.$eval(this.errMsgSelector, el => el.innerHTML);
        }
        await page.close();
        return status;
    }

    async closeBrowser(){
        if (!this.browser || Object.keys(dlTaskList.tasks).length)//非同期だからこういうチェックはちゃんとしないとね
            return;
        await this.browser.close();
        this.browser = null;
        this.pageForDl = null;
    }

    async launchPuppeteer() {
        if (this.browser)
            return;
        this.browser = await puppeteer.launch({
            // headless: false,
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
    }

    async startDlChain(){
        console.log('startDlChain');
        const task = dlTaskList.tasks[dlTaskList.working];
        if (task.abortFlag) {
            await connectEndToNext();
            return;
        }
        if (!this.pageForDl) {
            this.pageForDl = await this.browser.newPage();
            await this.pageForDl.setUserAgent(this.userAgent);
        }
        const url = PuppeteerOperator.getTimeFreeUrl(task.stationId, task.ft);
        console.log(url);
        await this.pageForDl.goto(url);
        const self = this;
        let isDone = false;/*現在配信中の番組の場合、chunkListは適宜動的に更新されてゆく為、isDoneのスコープに注意すること*/
        this.pageForDl.on('response', response => {
            console.log(response.status(), response.url());
            const url = response.url();
            if (response.url().indexOf('chunklist') === -1 || path.extname(url) !== '.m3u8')
                return;

            response.text().then(function (status) {
                if (status.trim() === '') {
                    console.log('空ファイル', response.url());
                    return;
                }

                dlTaskList.getWorkingTask().chunkFileName = path.basename(url);
                const pathE = self.chunkListDir + '/' + path.basename(url);
                if (isDone)
                    return;
                isDone = true;

                if (task.abortFlag) {
                    emitter.emit('onErrorHandler');
                    return;
                }

                writeFile(pathE, response).then(() => {
                    console.log('書き込み完了');
                    if (task.abortFlag)
                        emitter.emit('onErrorHandler');
                    else
                        runFfmpeg(pathE);
                }).catch(err => {
                    sendError('writeFile', err);
                    throw err;
                });
            });
        });
        await this.pageForDl.waitFor(2 * 1000);
        await this.pageForDl.click("#now-programs-list > div.live-detail__body.group > div.live-detail__text > p.live-detail__play.disabled > a");
        await this.pageForDl.waitFor(2 * 1000);
        await this.pageForDl.click('#colorbox--term > p.colorbox__btn > a');
        task.stage = 'pageReached';
        Sender.sendMiddleData('pageReached');
    }
}

String.prototype.splice = function(start, delCount, newSubStr) {
    return this.slice(0, start) + newSubStr + this.slice(start + Math.abs(delCount));
};

let win;//グローバルにしないとGCに回収されてウィンドウが閉じる
let emitter = new events.EventEmitter();
const dlTaskList = new DlTaskList();
const operator = new PuppeteerOperator();

function createWindow () {
    // Create the browser window.
    console.log('createWindow');
    win = new BrowserWindow({
        webPreferences: {
            width: 800,
            height: 600,
            // nodeIntegration: false,
            webSecurity: false,
            show: false
        },
        titleBarStyle: 'hiddenInset'
    });

    win.maximize();
    Menu.setApplicationMenu(null);

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

    win.webContents.on('will-navigate', function(e, url) {
        if (url.includes('public/timetable/index.html') ||
            url.includes('public/download/index.html') ||
            url.includes('public/search/index.html') ||
            url.includes('public/about/index.html')) {
            return;
        }
        e.preventDefault();
        electron.shell.openExternal(url);
    });

    win.once('ready-to-show', () => {
        win.show();
    });

    // operator.launchPuppeteer();//todo コメントアウト外すこと?

    // new OpenVpn().init();
    // masterJson = new MasterJson();
    // masterJson.requestJson();
    // vpnJson = new GateVpnCsv();
    // vpnJson.requestCsv();
    // new PuppeteerOperator().getRegionWithPuppeteer();
}

ipcMain.on('startDlWithFt', (event, arg) => {
    console.log('startDlWithFt', arg);
    const isDuplicated = dlTaskList.isExistTask(arg.stationId, arg.ft);
    if (!isDuplicated) {
        const timeStamp = moment().valueOf();
        dlTaskList['tasks'][timeStamp] = new DlTask(timeStamp, arg.stationId, arg.ft, arg.to, arg.title, arg.img);
        if (!dlTaskList.working)
            dlTaskList.working = timeStamp;
        emitter.emit('setTask');
    }
    Sender.sendReply(arg.stationId, arg.ft, isDuplicated, arg.title);
});

ipcMain.on('dlStatus', (event, arg) => {
    console.log('dlStatus');
    Sender.sendDlStatus(dlTaskList);
});

ipcMain.on('cancelDl', (event, timeStamp) => {
    console.log('cancelDl', timeStamp);
    if (dlTaskList['tasks'][timeStamp]) {
        dlTaskList['tasks'][timeStamp]['abortFlag'] = true;
    } else {
        Sender.sendMiddleData('cancelError');
    }
});

ipcMain.on('openFileExplore', (event, arg) => {
   new FileExplorerOpener().open();
});

ipcMain.on('sendContact', (event, message) => {
    const data = collectUserData();
    data['comment'] = message;
    new FirebaseClient().writeUserData(data).then(()=>{
        Sender.sendWriteFbResult(true);
    }).catch((e)=>{
        Sender.sendWriteFbResult(false);
    });
});

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

app.on('will-quit', (event)=>{
    console.log('will-quit');
    if (operator.browser !== null) {
        event.preventDefault();
        emitter.emit('closeBrowser');
    }
});

emitter.on('setTask', async() => {
    console.log('setTask');
    let isFailed = false;
    await operator.launchPuppeteer().catch(err => {
        console.log(e);
        emitter.emit('onErrorHandler', err);
        isFailed = true;
        sendError('launchPuppeteer()', e);
    });
    if (isFailed)
        return;
    operator.startDlChain().catch(e => {
        console.log('startDlChain error');
        Sender.sendMiddleData('startDlChainError');
        emitter.emit('onErrorHandler', e);
        sendError('operator.startDlChain()', e);
    });
});

emitter.on('onErrorHandler', async (e) => {
    await onError(e);
});

emitter.on('connectEndToNext', async _=> {
    await connectEndToNext();
});

emitter.on('closeBrowser', async ()=>{
    await operator.closeBrowser();
    app.quit();
});

process.on('uncaughtException', e => {
    Sender.sendMiddleData('uncaughtException');
    sendError('uncaughtException', e);
});

process.on('unhandledRejection', e => {
    Sender.sendMiddleData('unhandledRejection');
    sendError('unhandledRejection', e);
});

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
    // const path = 'output/'+ dlTaskList.getWorkingTask().stationId;
    const totalPath = getOutputPath();
    const dirName = path.dirname(totalPath);

    let err = null;
    try {
        if (!fs.existsSync(dirName)){
            fs.mkdirSync(dirName);
        }
        if (fs.existsSync(totalPath)) {
            fs.unlinkSync(totalPath);//既に同じmp3が存在しているなら削除
        }
    } catch (e) {
        err = e;
    }

    if (err || dlTaskList.getWorkingTask().abortFlag) {
        emitter.emit('onErrorHandler', err);
        return;
    }

    let bps = new Store().get('kbps');
    bps = bps ? bps.substring(0, bps.length-4) : 128;
    console.log('bps', bps);
    let codecLib = null;
    switch (totalPath.split('.')[1]) {
        case 'aac':
        case 'm4a':
        case 'flac':
        case 'wav':
            codecLib = 'aac';
            break;
        case 'mp3':
            codecLib = 'libmp3lame';
            break;
        default:
            console.log(totalPath.split('.')[1]);
            Sender.sendMiddleData('ffmpegError');
            emitter.emit('onErrorHandler', '拡張子がおかしい');
            return;
    }

    // let progressCounter = 0;
    let isKilled = false;

    const command = ffmpeg(pathE)
        .setFfmpegPath(ffmpeg_static.path)
        .audioCodec(codecLib)
        .audioBitrate(bps)
        // .videoCodec('copy')
        .on('start', function(commandLine) {
            console.log('Spawned Ffmpeg with command: ' + commandLine);
            if (!dlTaskList.getWorkingTask().abortFlag) {
                Sender.sendMiddleData('ffmpegStart');
                dlTaskList.getWorkingTask().stage = 'ffmpegStart';
            }
        })
        .on('error', function(err, stdout, stderr) {
            console.log('Cannot process video: ' + err.message);
            if (!dlTaskList.getWorkingTask().abortFlag)
                Sender.sendMiddleData('ffmpegError');
            deleteFileSync(totalPath);
            sendError('ffmpegError', err);
            emitter.emit('onErrorHandler', err);
        })
        .on('end', function(stdout, stderr) {
            console.log('Transcoding s  ucceeded !');
            if (dlTaskList.getWorkingTask().abortFlag) {
                emitter.emit('onErrorHandler', err);
                deleteFileSync(totalPath);
            } else {
                Sender.sendMiddleData('ffmpegEnd');
                dlTaskList.getWorkingTask().stage = 'ffmpegEnd';
                emitter.emit('connectEndToNext');
            }
        }).on('stderr', function(stderrLine) {
            if (stderrLine.includes('time=')/* && progressCounter%3 === 0*/) {
                const hms = stderrLine.substr(stderrLine.indexOf('time=')+5, 8)
                    .split(':');
                const sec = 60*60 * parseInt(hms[0]) + 60*parseInt(hms[1]) + parseInt(hms[2]);
                console.log(sec);
                Sender.sendFfmpegPrg(sec);
                // progressCounter++;
            }

            if (dlTaskList.getWorkingTask().abortFlag && !isKilled) {
                isKilled = true;
                command.kill();
            }
        })
        // .on('progress', function(progress) {
        //     console.log('Processing: ' + progress.percent + '% done');
        //     if (dlTaskList.getWorkingTask().abortFlag)
        //         command.kill();
        //     // Sender.sendFfmpegPrg(progress.percent);
        // })
        .inputOptions([
            '-protocol_whitelist', 'file,http,https,tcp,tls,crypto'
        ])
        // .outputOptions([
        //     '-bsf:a aac_adtstoasc'
        // ])
        .output(totalPath);
    command.run();
}

function getOutputPath() {
    const task = dlTaskList.getWorkingTask();
    const ymd = moment(task.ft, 'YYYYMMDDhhmmss').format('YYYY-MM-DD');
    const suf = new Store().get('suffix') || 'mp3';
    return new Store().get('output_path') +'/' + task.stationId +'/'+ task.title +'('+ ymd +').' + suf;
}

/**
 * @see {@link DlTask}
 * Note: ここで、sendする際には{@link #sendDlStatus()}を除いて、DlTask.stageを送信しないことに注意してください。
 * すなわち、renderer側ではコマンド名で進捗を判断し、DlTask.stageは用いません。
 * DlTask.stageを用いた場合、必ずDlTask.stageに進捗を書き込んだのちsendしなければならない⇒前後を誤りやすい⇒バグ発生
 */
class Sender {
    static sendMiddleData(command){
        win.webContents.send(command, dlTaskList.getMiddleData());
    }

    /**
     * taskに書き込む前なので、taskは参照できない
     */
    static sendReply(stationId, ft, duplicated, title){
        const data = {
            stationId: stationId,
            ft: ft,
            duplicated: duplicated,
            taskLength: Object.keys(dlTaskList.tasks).length,
            title: title
        };
        win.webContents.send('startDlWithFt-REPLY', data);
    }

    static sendIsDownloadable(status){
        console.log('sendIsDownloadable', status);
        console.log(dlTaskList);
        const data = dlTaskList.getMiddleData();
        console.log(data);
        data['status'] = status;
        console.log('sendIsDownloadable', 'ここ');
        win.webContents.send('isDownloadable', data);
    }

    static sendFfmpegPrg(percent){
        const data = dlTaskList.getMiddleData();
        data['ffmpegPrg'] = percent;
        data['to'] =  dlTaskList.getWorkingTask().to;
        win.webContents.send('ffmpegPrg', data);
    }

    static sendDlStatus(){
        win.webContents.send('dlStatus_REPLY', JSON.stringify(dlTaskList));
    }

    static sendExplorerErr(){
        win.webContents.send('ExplorerErr', JSON.stringify(dlTaskList));
    }

    static sendWriteFbResult(isSuccess){
        win.webContents.send('writeFbResult', isSuccess);
    }
}

async function onError(e) {
    await connectEndToNext();
    console.log(e);
}

async function connectEndToNext() {
    const chunkFileName = dlTaskList.getWorkingTask().chunkFileName;
    if (chunkFileName) {
        deleteFileSync(operator.chunkListDir +'/'+ chunkFileName);
    }
    delete dlTaskList.tasks[dlTaskList.working];
    const taskNext = dlTaskList.switchToNext();
    console.log('taskNext: ', taskNext);

    if (taskNext) {
        operator.startDlChain().catch(e => {
            console.log('connectEndToNext()内 startDlChain エラー!');
            Sender.sendMiddleData('startDlChainError');
            emitter.emit('onErrorHandler', e);
            sendError('connectEndToNext()', e);
        });
    } else {
        await operator.closeBrowser();
    }
}

function deleteFileSync(path) {
    if (fs.existsSync(path)){
        fs.unlinkSync(path);
    }
}

function sendError(witch, e) {
    const reportObj = {
        application_version: app.getVersion(),
        electron_version: process.versions.electron,
        chrome_version: process.versions.chrome,
        platform: process.platform,
        user_agent: session.defaultSession.getUserAgent(),
        process_type: process.type,
        version: app.getVersion(),
        productName: (app.getName()),
        prod: 'Electron',
        exceptionStack: e,
        witch: witch
    };
    new FirebaseClient().writeCrashRepo(reportObj);
}

function collectUserData() {
    return {
        application_version: app.getVersion(),
        electron_version: process.versions.electron,
        chrome_version: process.versions.chrome,
        platform: process.platform,
        user_agent: session.defaultSession.getUserAgent(),
        process_type: process.type,
        version: app.getVersion(),
        productName: (app.getName()),
        prod: 'Electron',
    };
}