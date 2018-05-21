module.exports = class ProgressBarOperator{
    constructor(win){
        this.win = win;
        this.DlNotification = require('./DlNotification');
    }

    setProgressAsPageReached(){
        if (this.win) {
            const stageNum = this.DlNotification.getStageNum('pageReached') /100;
            this.win.setProgressBar(stageNum);
        }
    }

    setProgressAsFfmpegStart(){
        if (this.win) {
            const stageNum = this.DlNotification.getStageNum('ffmpegStart') /100;
            this.win.setProgressBar(stageNum);
        }
    }

    //todo 何らかのアイコン変更
    setProgressAsFfmpegErr(){
        if (this.win)
            this.win.setProgressBar(-1);
    }

    setProgressAsFfmpegPrg(totalSec, currentSec){
        const startPcn = this.DlNotification.getStageNum('ffmpegStart');
        const progress = startPcn/100 + (currentSec / totalSec) * ((100 - startPcn) / 100);
        console.log(progress);
        if (this.win)
            this.win.setProgressBar(progress);
    }

    //todo 何らかのアイコン変更
    setProgressAsFfmpegEnd(){
        if (this.win)
            this.win.setProgressBar(-1);
        // if (this.win)
        //     this.win.setProgressBar(0);
    }
};