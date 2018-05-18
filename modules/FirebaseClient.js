module.exports = class FirebaseClient {
    constructor(){
        this.moment = require('moment');
        this.remote = require('electron').remote;
        const config = {
            apiKey: "AIzaSyC3PLY3nwjXPxWAUB10wvIoWAxO_Fn5R7I",
            authDomain: "radiko-7e63e.firebaseapp.com",
            databaseURL: "https://radiko-7e63e.firebaseio.com",
            projectId: "radiko-7e63e",
            storageBucket: "radiko-7e63e.appspot.com",
            messagingSenderId: "1032750813236"
        };
        firebase.initializeApp(config);
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

    static sendError(e, funcName, className){
        const client = new FirebaseClient().setUserData();
        client.data['exeption'] = e;
        client.data['function'] = funcName ;
        client.data['class'] = className;
        client.writeData('crash', ()=>{
            //do nothing
        }).catch(e =>{
            //do nothing
        });
    }
};