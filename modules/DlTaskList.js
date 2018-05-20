module.exports = class DlTaskList {
    constructor(){
        this.tasks = {};
        this.working = 0;
    }

    // constructor(){
    // this.tasks = {
    //     123456: new DlTask(123456, 'TBS', '20170610094000', '20170610100000', 'サンプルタイトル', 'https://radiko.jp/res/program/DEFAULT_IMAGE/TBS/cl_20180419102536_6552592.jpg'),
    //     123470: new DlTask(123470, 'TBS', '20170610094000', '20170610100000', '再生してない番組', 'https://radiko.jp/res/program/DEFAULT_IMAGE/JORF/20170330042126.jpg'),
    // };
    // this.working = 123456;

    // this.pendTime(20).then(()=>{
    //     Sender.sendMiddleData('ffmpegError');
    //     console.warn('sentFakeEvent');
    // }).catch(e=>{
    //     console.warn('error sendFakeEvent', e);
    // })
    // }

    async pendTime(sec){
        return new Promise(resolve => setTimeout(resolve, sec * 1000));
    }

    isExistTask(stationId, ft){
        const dlTaskArr = Object.values(this.tasks);
        let isExist = false;
        for (let i = 0; i < dlTaskArr.length; i++) {
            if (dlTaskArr[i]['stationId'] === stationId && dlTaskArr[i]['ft'] === ft) {
                isExist = true;
                break;
            }
        }
        return isExist;
    }

    getWorkingTask(){
        return this.tasks[this.working];
    }

    getSimpleData(){
        return {
            stationId: this.getWorkingTask().stationId,
            ft: this.getWorkingTask().ft
        }
    }

    getMiddleData(){
        const data = this.getSimpleData();
        data['title'] = this.getWorkingTask().title;
        data['timeStamp'] = this.getWorkingTask().timeStamp;
        data['taskLength'] = Object.keys(this.tasks).length;
        // console.warn(data);
        return data;
    }

    switchToNext(){
        this.working = 0;
        const keyArr = Object.keys(this.tasks);
        if (!keyArr.length)
            return null;
        keyArr.sort((a, b) => {
            return b - a;
        });
        this.working = keyArr[0];
        return this.tasks[keyArr[0]];
    }
};