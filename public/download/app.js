const $ = require('jquery');
const remote = require('remote');
const dialog = remote.require('dialog');
const browserWindow = remote.require('browser-window');
const ipcRenderer = require('electron').ipcRenderer;

$(function () {
    const moment = require('moment');

    class Conductor{
        static init(){
            presenter.init();
            ProcessCommunicator.askStatus();
        }
    }

    class Presenter{
        constructor(){
            this.$input = $('#file-location .mdl-textfield');
            this.$dpdn = $('#dpdn');
            this.$taskList = $('#task-list li');
            ProcessCommunicator.askStatus();
        }

        init(){
            $('#dpdn').on('click', (e)=> {
                const focusedWindow = browserWindow.getFocusedWindow();
                const option = {
                    title: 'フォルダを選択',
                    defaultPath: 'xxxx/yyyy/eee'
                };

                dialog.showSaveDialog(focusedWindow, option, filename => {
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
                                '<div class="mdl-progress mdl-js-progress"></div>\n' +
                            '</div>\n' +
                            '<button class="mdl-button mdl-js-button mdl-button--icon cancel-btn">\n' +
                                '<i class="material-icons">clear</i>\n' +
                            '</button>\n' +
                        '</div>\n' +
                    '</div>\n' +
                '</li>');
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
                this.onGetDlStatusReply(arg);
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

        onGetDlStatusReply(string){
            const dlTaskList = JSON.parse(string);
            const taskWorking = dlTaskList.tasks[dlTaskList.working];
            const taskKeys = Object.keys(dlTaskList.tasks);
            for (let i = 0; i < taskKeys.length; i++) {
                const task = dlTaskList.tasks[taskKeys[i]];
                const startM = new moment(task.ft);
                const dateVal = Util.getMDWithWeekDay(startM) +' '+ startM.format('hh:mm') +' - '+ moment(task.to).format('hh:mm');
                const stationId = task.stationId;
                const title = task.title;
                const $dlItem = Presenter.createDlItem(title, dateVal);
                if (taskWorking === taskKeys[i]) {
                    presenter.$taskList.prepend($dlItem);
                    task.stage
                } else {
                    $dlItem.append(presenter.$taskList);
                }
            }
        }
    }

    class Status{

    }

    Conductor.init();
    const presenter = new Presenter();
    const ipcComm = new ProcessCommunicatorFromDL();
});