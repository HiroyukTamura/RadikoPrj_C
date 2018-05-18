module.exports = class IpcClient {
    constructor(){
        this.ipcRenderer = require('electron').ipcRenderer;
        // require('FirebaseClient');<=htmlのscriptタグで読み込む
        // require('common');

        this.ipcRenderer.on('uncaughtException', (event, args) => {
            console.log('uncaughtException', args);
            DlNotification.showFailedNtf('処理に失敗しました');
            FirebaseClient.sendError(args.exception, args.funcName, args.className);
        }).on('unhandledRejection', (event, args) => {
            console.log('unhandledRejection', args);
            DlNotification.showFailedNtf('処理に失敗しました');
            FirebaseClient.sendError(args.exception, args.funcName, args.className);
        }).on('FATAL_ERROR', (event, args) => {
            console.log(args);
            FirebaseClient.sendError(args.exception, args.funcName, args.className);
        });
    }
};