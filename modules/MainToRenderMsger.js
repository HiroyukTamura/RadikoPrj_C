/**
 * @see {@link DlTask}
 * Note: ここで、sendする際には{@link #sendDlStatus()}を除いて、DlTask.stageを送信しないことに注意してください。
 * すなわち、renderer側ではコマンド名で進捗を判断し、DlTask.stageは用いません。
 * DlTask.stageを用いた場合、必ずDlTask.stageに進捗を書き込んだのちsendしなければならない⇒前後を誤りやすい⇒バグ発生
 */
module.exports = class MainToRenderMsger {
    constructor(webContents, dlTaskList){
        this.webContents = webContents;
        this.dlTaskList = dlTaskList;
    }

    sendMiddleData(command){
        const data = this.dlTaskList.getMiddleData();
        if (data)
            this.webContents.send(command, data);
    }

    /**
     * taskに書き込む前なので、taskは参照できない
     */
    sendReply(stationId, ft, duplicated, title){
        const data = {
            stationId: stationId,
            ft: ft,
            duplicated: duplicated,
            taskLength: Object.keys(this.dlTaskList.tasks).length,
            title: title
        };
        this.webContents.send('startDlWithFt-REPLY', data);
    }

    sendIsDownloadable(status){
        console.log('sendIsDownloadable', status);
        console.log(this.dlTaskList);
        const data = this.dlTaskList.getMiddleData();
        console.log(data);
        data['status'] = status;
        console.log('sendIsDownloadable', 'ここ');
        this.webContents.send('isDownloadable', data);
    }

    sendFfmpegPrg(percent){
        const data = this.dlTaskList.getMiddleData();
        if (!data)
            return;
        data['ffmpegPrg'] = percent;
        data['to'] = this.dlTaskList.getWorkingTask().to;
        this.webContents.send('ffmpegPrg', data);
    }

    sendDlStatus(){
        this.webContents.send('dlStatus_REPLY', JSON.stringify(this.dlTaskList));
        console.log('送ってる');
    }

    sendExplorerErr(){
        this.webContents.send('ExplorerErr', JSON.stringify(this.dlTaskList));
    }

    sendWriteFbResult(isSuccess){
        this.webContents.send('writeFbResult', isSuccess);
    }

    sendUncaughtException(){
        this.webContents.send('uncaughtException');
    }

    sendUnhandledRejection(){
        this.webContents.send('unhandledRejection');
    }

    sendUpdateBadge(taskLen){
        this.webContents.send('updateBadge', taskLen);
    }

    /**
     * !!!!!{@link #sendMiddleData}などでエラーをレンダラ側に通知する動作には、絶対にログ送信を含めないこと。必ず本メソッドを通じてログ送信を行うこと。!!!!!!
     * @param exception エラー内容を代入。ただし、該当するものがなければなんでもOK
     * @param funcName メソッド名 ただし、該当するものがなければなんでもOK」
     * @param className クラス名 globalであれば省略可。
     */
    sendErrorLog(exception, funcName, className){
        const data = {
            exception: exception,
            funcName: funcName,
            className: className
        };
        this.webContents.send('FATAL_ERROR', data);
    }
};