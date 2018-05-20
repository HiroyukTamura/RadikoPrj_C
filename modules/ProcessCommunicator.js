module.exports = class ProcessCommunicator {
    constructor(DlNotification){
        this.ipcRenderer = require('electron').ipcRenderer;
        this.DlNotification = DlNotification;
        this.setOnReceiveListeners();
        this.ntfList = [];
    }

    releaseNtf(stationId, ft){
        for (let i = 0; i < this.ntfList.length; i++)
            if (this.ntfList[i].stationId === stationId && this.ntfList[i].ft === ft) {
                this.ntfList.splice(i, 1);
                return;
            }
    }

    getNtf(stationId, ft){
        let ntf = null;
        this.ntfList.forEach(function (ele) {
            if (ele.stationId === stationId && ele.ft === ft)
                ntf = ele;
        });
        if (ntf === null)
            console.log('ntf==null');
        return ntf;
    }

    callDL(ft, to, stationId, title, img){
        const data = {
            ft: ft,
            to: to,
            stationId: stationId,
            title: title,
            img: img
        };
        this.ipcRenderer.send('startDlWithFt', data);
    }

    setOnReceiveListeners(){
        this.ipcRenderer.on('startDlWithFt-REPLY', (event, arg) => {
            this.onGetStartDlWithFtReply(arg);
            // }).on('isDownloadable', (event, data) => {
            //     this.onGetIsDownloadable(data);
        }).on('startDlChainError', (event, data, e) => {
            console.log(e);
            this.onGetFfmpegError(data);//startDlChainErrorだけど、レンダラサイドではonGetFfmpegError()と同じ実装。
        }).on('pageReached', (event, data) => {
            this.onGetPageReached(data);
        }).on('ffmpegStart', (event, data) => {
            this.onGetFfmpegStart(data);
        }).on('ffmpegError', (event, data, e) => {
            console.log(e);
            this.onGetFfmpegError(data);
        }).on('ffmpegEnd', (event, data) => {
            this.onGetFfmpegEnd(data);
        }).on('ffmpegPrg', (event, data) => {
            this.onGetFfmpegProgress(data);
        })
        //     .on('unhandledRejection', (event, data) => {
        //         this.DlNotification.showCancelNtf('処理に失敗しました');
        //     }).on('unhandledRejection', (efvent, data) => {
        //     this.DlNotification.showCancelNtf('処理に失敗しました');
        // }).on('FATAL_ERROR', (event, args) => {
        //     console.log(args);
        // });
    }

    onGetStartDlWithFtReply(arg){
        console.log(arg);
        if (arg.duplicated)
            this.DlNotification.showDuplicatedNtf();
        else {
            let ntf = new this.DlNotification(arg.stationId, arg.ft, arg.title);
            ntf.showNtf();
            this.ntfList.push(ntf);
        }
    }

    // onGetIsDownloadable(data){
    //     const ntf = this.getNtf(data.stationId, data.ft);
    //     if (!ntf) return;
    //
    //     if (data.status === 'SUCCESS') {
    // console.log('yeah! let\' DL!!');
    // this.$status.circleProgress({
    //     value: 0.4
    // });
    // const msg = ProcessCommunicator.generateNtfVal(data);
    // Util.successNotify('データを確認しています...\n'+ msg);
    //     ntf.updateAs2nd();
    // } else {
    //     const msg = data.status === 'UNKNOWN' ? '処理に失敗しました' : data.status;
    //     ntf.updateAsFailed(msg);
    // }

    // const msg = data.status === 'UNKNOWN' ? '処理に失敗しました' : data.status;
    // Util.dangerNotify(msg);
    // this.rollbackStatus(data);
    // }

    onGetFfmpegStart(data){
        const ntf = this.getNtf(data.stationId, data.ft);
        if (ntf)
            ntf.updateAs4th();
    }

    onGetFfmpegError(data){
        console.log(data);
        const ntf = this.getNtf(data.stationId, data.ft);
        if (ntf)
            ntf.updateAsFailed();
        this.releaseNtf(data.stationId, data.ft);
    }

    onGetFfmpegEnd(data){
        const ntf = this.getNtf(data.stationId, data.ft);
        if (ntf)
            ntf.updateAsSuccess();
        this.releaseNtf(data.stationId, data.ft);
    }

    onGetPageReached(data){
        const ntf = this.getNtf(data.stationId, data.ft);
        if (ntf)
            ntf.updateAs3rd();
    }

    onGetFfmpegProgress(data){
        const ntf = this.getNtf(data.stationId, data.ft);
        if (ntf) {
            ntf.updateAsPrg(data);
        }
    }
};