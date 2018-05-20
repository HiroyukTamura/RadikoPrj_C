module.exports = class FirebaseClient {
    constructor(){
        this.moment = require('moment');
        this.remote = require('electron').remote;
        this.fs = require('fs-extra');
        this.LOG_PATH = 'debug.log';
        this.db = firebase.firestore();
        this.data = null;
    }

    /**
     * @param command => "contact-comment" or "crash"
     */
    writeData(command) {
        const time = this.moment().format('YYYYMMDDhhmmss');
        return new Promise((resolve, reject) =>{
            this.db.collection(command).doc(time).set(this.data)
                .then(()=> {
                    resolve();
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    setUserData() {
        this.data = {
            application_version: this.remote.app.getVersion(),
            electron_version: this.remote.process.versions.electron,
            chrome_version: this.remote.process.versions.chrome,
            platform: this.remote.process.platform,
            process_type: this.remote.process.type,
            version: this.remote.app.getVersion(),
            productName: (this.remote.app.getName()),
            prod: 'Electron',
        };
        return this;
    }

    /**
     * Note: FireStoreでは、undefinedを値にセットした場合エラーが返されるの
     * @param className undefinedでありうる
     */
    sendError(e, funcName, className){
        this.setUserData();
        this.data['exception'] = e;
        this.data['function'] = funcName ;
        if (className)
            this.data['class'] = className;

        this.fs.readFile(this.LOG_PATH, 'utf-8', (err, data) => {
            if (err) {
                console.log(err);
                return;
            }
            this.data['log'] = data;
            console.log(this.data);
            this.writeData('crash').then(()=>{
                console.log('書き込み完了!');
            }).catch(e => {
                console.log(e);
            }).then(() => {//finallyはサポートされていない
                this.fs.writeFile(this.LOG_PATH, '', (err)=>{
                    if (err)
                        console.log(err);
                });
            });
        });
    }
};