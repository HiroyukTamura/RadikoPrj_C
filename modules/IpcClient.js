module.exports = class IpcClient {
    constructor(){
        this.ipcRenderer = require('electron').ipcRenderer;
        const DlNotification = require('./DlNotification');
        const FirebaseClient = require('./FirebaseClient');
        const remote = require('electron').remote;
        // require('FirebaseClient');<=htmlのscriptタグで読み込む

        this.ipcRenderer.on('uncaughtException', (event, args) => {
            console.log('uncaughtException', args);
            DlNotification.showFailedNtf('処理に失敗しました');
        }).on('unhandledRejection', (event, args) => {
            console.log('unhandledRejection', args);
            DlNotification.showFailedNtf('処理に失敗しました');
        }).on('FATAL_ERROR', (event, args) => {
            //!!!!エラーロギングはここでのみ行う。それ以外では絶対に行わない!!!!!!
            console.log('FATAL_ERROR', args);
            new FirebaseClient().sendError(args.exception, args.funcName, args.className);
        });
        //     .on('updateBadge', (event, taskLen) => {
        //     console.log(taskLen);
        //     if (process.platform !== 'win32')
        //         return;
        //     const mainWindow = remote.getCurrentWindow();
        //     mainWindow.setOverlayIcon(__dirname+'/icon.png', "icon");
        // });
    }
};