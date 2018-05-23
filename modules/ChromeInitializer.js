module.exports = class ChromeInitializer {
    constructor(){
        this.fs = require('fs-extra');
        this.request = require('request');
        this.PATH = 'Application/chrome.exe';
        this.URL = 'https://dl.google.com/tag/s/appguid%3D%7B8A69D345-D564-463C-AFF1-A69D9E530F96%7D%26iid%3D%7B41EA043F-C339-07BF-5327-6F4CFE664450%7D%26lang%3Den%26browser%3D4%26usagestats%3D0%26appname%3DGoogle%2520Chrome%26needsadmin%3Dtrue%26ap%3Dstable-arch_x86-statsdef_1%26brand%3DGCEB/dl/chrome/install/GoogleChromeEnterpriseBundle.zip';
        this.INSTALLER_PATH = 'Installer/GoogleChromeEnterpriseBundle.zip';
    }

    isExistChrome(){
        // switch (process.platform) {
        //     case 'win32':
        //         break;
        // }
        return this.fs.existsSync(this.PATH);
    }

    dlInstaller(){
        return new Promise((resolve, reject) => {
            this.request(this.URL)
                .pipe(this.fs.createWriteStream(this.INSTALLER_PATH))
                .on('error', err => {
                    reject(err);
                    console.log(err);
                })
                .on('close', ()=>{
                    resolve();
                });
        });
    }

    setUpChrome(){

    }
};