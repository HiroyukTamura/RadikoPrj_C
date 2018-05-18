module.exports =  class DlTask {
    constructor(timeStamp, stationId, ft, to, title, img){
        this.timeStamp = timeStamp;
        this.stationId = stationId;
        this.ft = ft;
        this.to = to;
        this.title = title;
        this.chunkFileName = null;
        this.img = img;
        this.abortFlag = false;
        this.progressSec = 0;
        this.stage = 'UNSET';
    }
};