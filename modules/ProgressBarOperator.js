module.exports = class ProgressBarOperator {
    constructor(win){
        this.win = win;
        this.DlNotification = require('./DlNotification');
        this.nativeImage = require('electron').nativeImage;
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

    setProgressAsFfmpegEnd(){
        if (this.win)
            this.win.setProgressBar(0);
    }

    setBadge(win, app, dlTaskList){
        const taskLen = Object.keys(dlTaskList.tasks).length;
        if (taskLen) {
            const taskLenStr = taskLen > 9 ? taskLen +'+' : taskLen.toString();
            switch (process.platform) {
                case 'darwin':
                    app.dock.setBadge(taskLenStr);
                    break;
                case 'win32':
                    const path = './img/badge'+ taskLenStr + '.png';
                    const icon = this.nativeImage.createFromPath(path);
                    win.setOverlayIcon(icon, taskLenStr);
                    break;
            }
        } else
            switch (process.platform) {
                case 'darwin':
                    app.dock.setBadge(null);
                    break;
                case 'win32':
                    win.setOverlayIcon(null, '');
                    break;
            }
    }
};