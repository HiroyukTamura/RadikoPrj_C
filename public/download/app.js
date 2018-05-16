const $ = require('jquery');
const remote = require('electron').remote;
require('bootstrap-notify');
const tippy = require('tippy.js');
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
            this.setOnReceiveListeners();
        }

        static askStatus(){
            console.log('askStatus()');
            ipcRenderer.send('dlStatus');
        }

        setOnReceiveListeners(){
            ipcRenderer.on('dlStatus_REPLY', (event, arg) => {
                ProcessCommunicatorFromDL.onGetDlStatusReply(arg);
            }).on('startDlChainError', (event, data) => {
                this.onGetFfmpegError(data);//startDlChainErrorだけど、レンダラサイドではonGetFfmpegError()と同じ実装。
            }).on('pageReached', (event, data) => {
                console.log(data);
                presenter.updateStage('pageReached', data.timeStamp);
            }).on('ffmpegStart', (event, data) => {
                console.log(data);
                presenter.updateStage('ffmpegStart', data.timeStamp);
            }).on('ffmpegError', (event, data) => {
                console.log(data);
                presenter.onGetFfmpegError(data);
            }).on('ffmpegEnd', (event, data) => {
                console.log(data);
                presenter.onGetFfmpegEnd(data);
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
                tippy($dlItem.find('.mdl-button')[0]);
                const progress = $dlItem.find('.mdl-progress')[0];

                if (dlTaskList.working == taskKeys[i]) {
                    const num = DlNotification.getStageNum(task.stage);
                    progress.MaterialProgress.setProgress(num);
                } else {
                    progress.MaterialProgress.setBuffer(90);
                }
            }

            Util.setElementAsMdl(presenter.$taskList);
            presenter.setOnClickCancel();
        }
    }

    class Presenter{
        constructor(){
            this.$input = $('#file-location .mdl-textfield');
            this.$dpdn = $('#dpdn');
            this.$taskList = $('#task-list ul');
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
                            '<button class="mdl-button mdl-js-button mdl-button--icon cancel-btn mdl-pre-upgrade cancel-btn" title="ダウンロードをキャンセル">\n' +
                                '<i class="material-icons">clear</i>\n' +
                            '</button>\n' +
                        '</div>\n' +
                    '</div>\n' +
                '</li>');
        }

        setOnClickCancel(){
            this.$taskList.find('.cancel-btn').on('click', function () {
                const li = $(this).parents('li');
                const timeStamp = li.attr('data-time-stamp');
                console.log('キャンセル timeStamp', timeStamp);
                Presenter.removeItem(li);

                //todo キャンセル動作をメインプロセスへ
            });
        }

        static removeItem(li){
            li.animate({opacity: '0'}, 500, ()=>{
                li.animate({height: '0'}, 500, ()=>{
                    li.remove();
                });
            });
        }

        updateStage(command, timeStamp){
            const $li = this.$taskList.find('li[data-time-stamp="'+ timeStamp +'"]');
            if (!$li) //レンダラ側でキャンセル動作と、メインからのsendがバッティングしうる⇒$liが見つからない場合がある
                return;
            const stage = DlNotification.getStageStr(command);
            const num = DlNotification.getStageNum(command);
            $li.find('.mdl-progress')[0].MaterialProgress.setProgress(num);
            $li.find('.stage').html(stage);
        }

        onGetFfmpegEnd(data) {
            const $li = this.$taskList.find('li[data-time-stamp="'+ data.timeStamp +'"]');
            presenter.updateStage('ffmpegEnd', data.timeStamp);
            Presenter.removeItem($li);
            const msg = data.title +' '+ Util.getMDWithWeekDay(moment(data.fl, 'YYYYMMDDhhmmss'));
            DlNotification.showSuccessNtf('ダウンロード完了', msg);
        }

        onGetFfmpegError(data) {
            const $li = this.$taskList.find('li[data-time-stamp="'+ data.timeStamp +'"]');
            presenter.updateStage('ffmpegError', data.timeStamp);
            Presenter.removeItem($li);
            console.log(data.fl);
            const msg = data.title +' '+ Util.getMDWithWeekDay(moment(data.fl, 'YYYYMMDDhhmmss'));
            DlNotification.showFailedNtf('処理に失敗しました', msg);
        }
    }

    const presenter = new Presenter();
    const ipcComm = new ProcessCommunicatorFromDL();
    Conductor.init();
});