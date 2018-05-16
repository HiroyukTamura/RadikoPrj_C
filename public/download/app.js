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
                this.onGetPageReached(data);
            }).on('ffmpegStart', (event, data) => {
                this.onGetFfmpegStart(data);
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
                const stationId = task.stationId;
                const title = task.title;
                const $dlItem = Presenter.createDlItem(title, dateVal);
                console.log(taskWorking, taskKeys[i]);
                if (dlTaskList.working == taskKeys[i]) {
                    if (taskWorking.status === 'ffmpegError' || taskWorking.status === 'ffmpegEnd') {
                        //todo bootstrap-notify出す
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
                    console.log('いいよいいよー');
                    switch (taskWorking.status) {
                        case 'UNSET':
                            progress.MaterialProgress.setProgress(10);
                            break;
                        case 'pageReached':
                            progress.MaterialProgress.setProgress(30);
                            break;
                        case 'ffmpegStart':
                            progress.MaterialProgress.setProgress(50);
                            break;
                    }
                } else {
                    progress.MaterialProgress.setBuffer(90);
                }
            }
            Util.setElementAsMdl(presenter.$taskList);
        }

        onGetFfmpegError(data) {
            console.log(data);
        }

        onGetPageReached (data) {
            console.log(data);
        }

        onGetFfmpegEnd (data) {
            console.log(data);
        }

        onGetFfmpegStart (data) {
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

        static createDlItem(title, date){
            return $(
                '<li>\n' +
                    '<div class="wrapper">\n' +
                        '<img src="https://radiko.jp/res/program/DEFAULT_IMAGE/TBS/cl_20180419102536_6552592.jpg" alt="番組ロゴ" class="prg-logo">\n' +
                        '<div class="main-row">\n' +
                            '<div class="main-row-in">\n' +
                                '<p class="prg-title">'+ title +'</p>\n' +
                                '<span class="prg-time">'+ date +'</span>\n' +
                                '<div class="mdl-progress mdl-js-progress mdl-pre-upgrade"></div>\n' +
                            '</div>\n' +
                            '<button class="mdl-button mdl-js-button mdl-button--icon cancel-btn mdl-pre-upgrade">\n' +
                                '<i class="material-icons">clear</i>\n' +
                            '</button>\n' +
                        '</div>\n' +
                    '</div>\n' +
                '</li>');
        }
    }

    const presenter = new Presenter();
    const ipcComm = new ProcessCommunicatorFromDL();
    Conductor.init();
});