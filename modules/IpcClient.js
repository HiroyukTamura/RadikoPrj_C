module.exports = class IpcClient {
    constructor(){
        this.ipcRenderer = require('electron').ipcRenderer;
        const DlNotification = require('./DlNotification');
        const FirebaseClient = require('./FirebaseClient');
        // require('FirebaseClient');<=htmlのscriptタグで読み込む

        this.ipcRenderer.on('uncaughtException', (event, args) => {
            console.log('uncaughtException', args);
            DlNotification.showFailedNtf('処理に失敗しました');
        })
            .on('unhandledRejection', (event, args) => {
                console.log('unhandledRejection', args);
                DlNotification.showFailedNtf('処理に失敗しました');
            })
            //!!!!エラーロギングはここでのみ行う。それ以外では絶対に行わない!!!!!!
            .on('FATAL_ERROR', (event, args) => {
                console.log('FATAL_ERROR', args);
                new FirebaseClient().sendError(args.exception, args.funcName, args.className);
            });
    }
};