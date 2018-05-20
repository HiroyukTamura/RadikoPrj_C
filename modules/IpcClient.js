module.exports = class IpcClient {
    constructor(dlNotification, FirebaseClient){
        this.ipcRenderer = require('electron').ipcRenderer;
        // this.dlNotification = dlNotification;
        // require('FirebaseClient');<=htmlのscriptタグで読み込む

        this.ipcRenderer.on('uncaughtException', (event, args) => {
            console.log('uncaughtException', args);
            dlNotification.showFailedNtf('処理に失敗しました');
        })
            .on('unhandledRejection', (event, args) => {
                console.log('unhandledRejection', args);
                dlNotification.showFailedNtf('処理に失敗しました');
            })
            //!!!!エラーロギングはここでのみ行う。それ以外では絶対に行わない!!!!!!
            .on('FATAL_ERROR', (event, args) => {
                console.log('FATAL_ERROR', args);
                new FirebaseClient().sendError(args.exception, args.funcName, args.className);
            });
    }
};