module.exports = class ChromeInitializer {
    constructor(){
        this.progress = require('request-progress');
        this.fs = require('fs-extra');
        this.request = require('request');
        // this.unzip = require('unzip');
        this.DecompressZip = require('decompress-zip');
        this.exec = require('child_process').exec;
        this.sender = null;
        this.PATH = 'Application/chrome.exe';
        this.URL = 'https://dl.google.com/tag/s/appguid%3D%7B8A69D345-D564-463C-AFF1-A69D9E530F96%7D%26iid%3D%7B41EA043F-C339-07BF-5327-6F4CFE664450%7D%26lang%3Den%26browser%3D4%26usagestats%3D0%26appname%3DGoogle%2520Chrome%26needsadmin%3Dtrue%26ap%3Dstable-arch_x86-statsdef_1%26brand%3DGCEB/dl/chrome/install/GoogleChromeEnterpriseBundle.zip';
        this.INSTALLER_PATH = 'Installer/GoogleChromeEnterpriseBundle.zip';
        this.UNZIP_PATH = './unzip';
        this.MSI_PATH = 'Installer/unzip/Installers/GoogleChromeStandaloneEnterprise.msi';
        this.RATIOS = {
            INSTALL: 0.2,
            UNZIP: 0.1
        };
        this.UNZIP_RATIO = {
            APP: 0.7,
            DATA: 0.3
        };
        this.ZIPED_APP_PATH = './zipped/Application_win7.zip';
        this.ZIPED_DATA_PATH = './zipped/UserData.zip';
    }

    static getAppPath(){
        return './unzip/Application_win7/chrome.exe';
    }

    static getDataPath(){
        return './unzip/User Data';
    }

    isExistChrome(){
        // switch (process.platform) {
        //     case 'win32':
        //         break;
        // }
        return this.fs.existsSync(ChromeInitializer.getAppPath()) && this.fs.existsSync(ChromeInitializer.getDataPath());
    }

    setSender(sender){
        this.sender = sender;
    }

    /**
     * 呼び出し元でsendErrorLog()しているので本メソッド内でsendErrorLog()する必要なし
     */
    dlInstaller(){
        let currentPercent = 0;
        return new Promise((resolve, reject) => {
            this.progress(this.request(this.URL), {})
                .on('progress', state => {
                    // The state is an object that looks like this:
                    // {
                    //     percent: 0.5,               // Overall percent (between 0 to 1)
                    //     speed: 554732,              // The download speed in bytes/sec
                    //     size: {
                    //         total: 90044871,        // The total payload size in bytes
                    //         transferred: 27610959   // The transferred payload size in bytes
                    //     },
                    //     time: {
                    //         elapsed: 36.235,        // The total elapsed seconds since the start (3 decimals)
                    //         remaining: 81.403       // The remaining seconds to finish (3 decimals)
                    //     }
                    // }
                    const percent = Math.round(100 * state.size.transferred / state.size.total * this.RATIOS.INSTALL);
                    if (percent === currentPercent)
                        return;
                    currentPercent = percent;
                    console.log('progress', percent);
                    this.sender.sendDlInstallerPrg(percent);
                })
                .on('error', err =>{
                    reject(err);
                    console.log(err);
                })
                .on('end', ()=>{
                    resolve();
                })
                .pipe(this.fs.createWriteStream(this.INSTALLER_PATH));
        });
    }

    /**
     * 呼び出し元でsendErrorLog()しているので本メソッド内でsendErrorLog()する必要なし
     */
    unZipInstaller(){
        const unzipper = new this.DecompressZip(this.INSTALLER_PATH);
        return new Promise((resolve, reject) => {
            unzipper.on('error', err => {
                return reject(err);
            });

            unzipper.on('extract', log =>{
                resolve(log);
                console.log(log);
            });

            unzipper.on('progress', (fileIndex, fileCount) => {
                if (!fileIndex || !fileCount)
                    return;
                console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
                const percent = 100 * Math.round(fileIndex / fileCount * this.RATIOS.UNZIP + this.RATIOS.INSTALL);
                this.sender.sendUnzipInstallPrg(percent);
            });

            unzipper.extract({
                path: this.UNZIP_PATH
            });
        });
    }

    executeInstaller(){
        return new Promise((resolve, reject) => {
            const command = this.exec('msiexec /i '+ this.MSI_PATH +' /qn /norestart');
            command.stdout.on('data', data =>{
                console.log('stdout', data);
            });
            command.stderr.on('data', data =>{
                // const str = iconv.decode(data, "Shift_JIS");
                console.log('stderr', data);
            });
            command.on('close', code =>{
                console.log('closing code: ' + code);
                resolve(code);
            });
            command.on('error', err =>{
                console.log('error', err);
                reject(err);
            })
        });
    }

    unzip(command){
        let targetPath = null;
        switch (command) {
            case 'APP':
                targetPath = this.ZIPED_APP_PATH;
                break;
            case 'DATA':
                targetPath = this.ZIPED_DATA_PATH;
                break;
        }
        const unzipper = new this.DecompressZip(targetPath);
        return new Promise((resolve, reject) => {
            unzipper.on('error', err => {
                return reject(err);
            });

            unzipper.on('extract', log =>{
                resolve(log);
                console.log(log);
            });

            unzipper.on('progress', (fileIndex, fileCount) => {
                if (!fileIndex || !fileCount)
                    return;
                console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
                let percent = 0;
                switch (command) {
                    case 'APP':
                        percent = this.calcPercentAsApp(fileCount, fileIndex);
                        break;
                    case 'DATA':
                        percent = this.calcPercentAsData(fileCount, fileIndex);
                        break;
                }
                console.log('percent', percent);
                this.sender.sendUnzipInstallPrg(percent);
            });

            unzipper.extract({
                path: this.UNZIP_PATH
            });
        });
    }

    calcPercentAsApp(fileCount, fileIndex){
        return Math.round(100 * fileIndex / fileCount * this.UNZIP_RATIO.APP);
    }

    calcPercentAsData(fileCount, fileIndex){
        return Math.round(100 * (fileIndex / fileCount * this.UNZIP_RATIO.DATA + this.UNZIP_RATIO.APP));
    }
};