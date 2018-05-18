const firebase = require("firebase");
require("firebase/firestore");
const moment = require('moment');

module.exports = class FirebaseClient{
    constructor(){
        this.moment = moment;
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
    }

    writeUserData(data) {
        const time = moment().format('YYYYMMDDhhmmss');
        return new Promise((resolve, reject) =>{
            this.db.collection("contact-comment").doc(time).set(data)
                .then(()=> {
                    resolve();
                    // Util.dangerNotify('ご意見ありがとうございました！');
                })
                .catch(error => {
                    reject(error);
                    // Util.dangerNotify('送信に失敗しました');
                });
        });
    }

    writeCrashRepo(obj){
        const time = moment().format('YYYYMMDDhhmmss');
        this.db.collection("crash").doc(time).set(obj)
            .then(()=> {
                console.log('writeCrashRepo');
            })
            .catch(error => {
                console.log(error);
            });
    }
};