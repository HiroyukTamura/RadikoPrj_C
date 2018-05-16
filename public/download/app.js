const $ = require('jquery');
const remote = require('electron').remote;
require('bootstrap-notify');
// const dialog = remote.require('dialog');
// const browserWindow = remote.require('browser-window');
// const ipcRenderer = require('electron').ipcRenderer;

$(function () {
    const moment = require('moment');

    class Conductor{
        static init(){
            presenter.init();
            ProcessCommunicatorFromDL.askStatus();
        }
    }

    class ProcessCommunicatorFromDL{
        constructor(){
            this.statusList = [];
            this.setOnReceiveListeners();
        }

        static askStatus(){
            ipcRenderer.send('dlStatus');
        }

        setOnReceiveListeners(){
            ipcRenderer.on('dlStatus_REPLY', (event, arg) => {
                ProcessCommunicatorFromDL.onGetDlStatusReply(arg);
            }).on('startDlChainError', (event, data) => {
                this.onGetFfmpegError(data);//startDlChainErrorだけど、レンダラサイドではonGetFfmpegError()と同じ実装。
            }).on('pageReached', (event, data) => {
                console.log(data);
                presenter.updateStage('pageReached', data.stationId, data.fl);
            }).on('ffmpegStart', (event, data) => {
                console.log(data);
                presenter.updateStage('FfmpegStart', data.stationId, data.fl);
            }).on('ffmpegError', (event, data) => {
                this.onGetFfmpegError(data);
            }).on('ffmpegEnd', (event, data) => {
                this.onGetFfmpegEnd(data);
            })
            //     .on('ffmpegPrg', (event, data) => {
            //     this.onGetFfmpegProgress(data);
            // });
        }

        static onGetDlStatusReply(string){
            console.log(string);
            const dlTaskList = JSON.parse(string);
            const taskWorking = dlTaskList.tasks[dlTaskList.working];
            const taskKeys = Object.keys(dlTaskList.tasks);
            if (!dlTaskList.working || !taskKeys.length) {
                $('#non-list').show();
                return;
            }

            for (let i = 0; i < taskKeys.length; i++) {
                console.log(taskKeys[i]);
                const task = dlTaskList.tasks[taskKeys[i]];
                const startM = new moment(task.ft, 'YYYYMMDDhhmmss');
                const dateVal = Util.getMDWithWeekDay(startM) +' '+ startM.format('hh:mm') +' - '+ moment(task.to, 'YYYYMMDDhhmmss').format('hh:mm');
                const stage = DlNotification.getStageStr(task.stage);
                const $dlItem = Presenter.createDlItem(taskKeys[i], task.title, dateVal, stage, task.img);
                console.log(taskWorking, taskKeys[i]);

                if (dlTaskList.working == taskKeys[i]) {
                    if (taskWorking.stage === 'ffmpegError') {
                        Util.showFailedNtf('処理に失敗しました', task.title);
                        continue;
                    } else if (taskWorking.stage === 'ffmpegEnd') {
                        Util.showSuccessNtf('ダウンロード完了', task.title);
                        continue;
                    }
                    presenter.$taskList.prepend($dlItem);
                    Util.setElementAsMdl($dlItem);
                } else {
                    presenter.$taskList.append($dlItem);
                }

                Util.setElementAsMdl($dlItem);
                const progress = $dlItem.find('.mdl-progress')[0];

                if (dlTaskList.working == taskKeys[i]) {
                    const num = DlNotification.getStageNum(task.stage);
                    progress.MaterialProgress.setProgress(num);
                } else {
                    progress.MaterialProgress.setBuffer(90);
                }
            }

            Util.setElementAsMdl(presenter.$taskList);
            presenter.setOnClickCansel();
        }

        onGetFfmpegError(data) {
            console.log(data);
        }

        onGetFfmpegEnd (data) {
            console.log(data);
        }
    }

    class Presenter{
        constructor(){
            this.$input = $('#file-location .mdl-textfield');
            this.$dpdn = $('#dpdn');
            this.$taskList = $('#task-list ul');
            ProcessCommunicatorFromDL.askStatus();
        }

        init(){
            $('#dpdn').on('click', (e)=> {
                const focusedWindow = remote.getFocusedWindow();
                const option = {
                    title: 'フォルダを選択',
                    defaultPath: 'xxxx/yyyy/eee'
                };

                remote.showSaveDialog(focusedWindow, option, filename => {
                    console.log(filename);
                });
                return false;
            });
            $('#file-location .mdl-textfield').focusin((e) => {
                $(e).focusout();
                return false;
            });
        }

        static createDlItem(timeStamp, title, date, stage, img){
            return $(
                '<li data-time-stamp="'+ timeStamp +'">\n' +
                    '<div class="wrapper">\n' +
                        '<img src="'+ img +'" alt="番組ロゴ" class="prg-logo">\n' +
                        '<div class="main-row">\n' +
                            '<div class="main-row-in">\n' +
                                '<p class="prg-title">'+ title +'</p>\n' +
                                '<span class="prg-time">'+ date +'</span>\n' +
                                '<div class="mdl-progress mdl-js-progress mdl-pre-upgrade"></div>\n' +
                                '<span class="stage">'+ stage +'</span>\n' +
                            '</div>\n' +
                            '<button class="mdl-button mdl-js-button mdl-button--icon cancel-btn mdl-pre-upgrade cancel-btn">\n' +
                                '<i class="material-icons">clear</i>\n' +
                            '</button>\n' +
                        '</div>\n' +
                    '</div>\n' +
                '</li>');
        }

        setOnClickCansel(){
            const btn = this.$taskList.find('.cancel-btn');
            btn.on('click', () => {
                const li = btn.parents('li');
                const timeStamp = li.attr('data-time-stamp');
                console.log('キャンセル timeStamp', timeStamp);
            })
        }

        updateStage(command, timeStamp){
            const stage = DlNotification.getStageStr(command);
            const num = progress.getStageNum(command);
            const $li = this.$taskList.find('li[data-time-stamp="'+ timeStamp +'"]');
            $li.find('.mdl-progress')[0].MaterialProgress.setProgress(num);
            $li.find('.stage').html(stage);
        }
    }

    const presenter = new Presenter();
    const ipcComm = new ProcessCommunicatorFromDL();
    Conductor.init();
});