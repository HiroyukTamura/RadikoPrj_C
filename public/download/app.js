const $ = require('jquery');
// const {BrowserWindow} = require('electron').remote;
const remote = require('electron').remote;
// const exec = remote.require('child_process').exec;
require('bootstrap-notify');
const tippy = require('tippy.js');
const Store = require('electron-store');
const FirebaseClient = require('../../modules/FirebaseClient');
const IpcClient = require('../../modules/IpcClient');
const DlNotification = require('../../modules/DlNotification');
const ipcRenderer = require('electron').ipcRenderer;
const Util = require('../../modules/Util');
// const dialog = remote.require('dialog');
// const browserWindow = remote.require('browser-window');

$(() => {
    const moment = require('moment');

    class Conductor {
        static init(){
            presenter.init();
            ProcessCommunicatorFromDL.askStatus();
        }
    }

    class ProcessCommunicatorFromDL {
        constructor(){
            this.setOnReceiveListeners();
        }

        static askStatus(){
            console.log('askStatus()');
            ipcRenderer.send('dlStatus');
        }

        static callOpenFile(){
            ipcRenderer.send('openFileExplore');
        }

        setOnReceiveListeners(){
            ipcRenderer.on('dlStatus_REPLY', (event, arg) => {
                ProcessCommunicatorFromDL.onGetDlStatusReply(arg);
            }).on('startDlChainError', (event, data) => {
                presenter.onGetFfmpegError(data);//startDlChainErrorだけど、レンダラサイドではonGetFfmpegError()と同じ実装。
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
            }).on('cancelError', (event, data) => {
                const msg = data.title +' '+ Util.getMDWithWeekDay(moment(data.ft, 'YYYYMMDDhhmmss'));
                DlNotification.showFailedNtf('処理に失敗しました', msg);
            }).on('ExplorerErr', (event, data) => {
                DlNotification.showFailedNtf('処理に失敗しました');
            }).on('ffmpegPrg', (event, data) => {
                console.log('ffmpegPrg');
                presenter.onGetFfmpegProgress(data);
            });
            // .on('unhandledRejection', (event, data) => {
            //     DlNotification.showFailedNtf('処理に失敗しました');
            // }).on('unhandledRejection', (efvent, data) => {
            //     DlNotification.showFailedNtf('処理に失敗しました');
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
                if (task.abortFlag)
                    continue;

                const startM = new moment(task.ft, 'YYYYMMDDhhmmss');
                const dateVal = Util.getMDWithWeekDay(startM) +' '+ startM.format('hh:mm') +' - '+ moment(task.to, 'YYYYMMDDhhmmss').format('hh:mm');
                const stage = DlNotification.getStageStr(task.stage);
                const $dlItem = Presenter.createDlItem(taskKeys[i], task.title, dateVal, stage, task.img);
                console.log(taskWorking, taskKeys[i]);

                if (dlTaskList.working == taskKeys[i]) {
                    if (taskWorking.stage === 'ffmpegError') {
                        DlNotification.showFailedNtf('処理に失敗しました', task.title);
                        continue;
                    } else if (taskWorking.stage === 'ffmpegEnd') {
                        DlNotification.showSuccessNtf('ダウンロード完了', task.title);
                        continue;
                    }
                    presenter.$taskList.prepend($dlItem);
                    Util.setElementAsMdl($dlItem);
                } else
                    presenter.$taskList.append($dlItem);

                Util.setElementAsMdl($dlItem);
                tippy($dlItem.find('.mdl-button')[0]);
                const progress = $dlItem.find('.mdl-progress')[0];

                if (dlTaskList.working == taskKeys[i]) {
                    const num = DlNotification.getStageNum(task.stage);
                    progress.MaterialProgress.setProgress(num);
                } else
                    progress.MaterialProgress.setBuffer(90);
            }

            Util.setElementAsMdl(presenter.$taskList);
            presenter.setOnClickCancel();
        }
    }

    class Presenter {
        constructor(){
            this.$input = $('#file-location .mdl-textfield');
            this.$taskList = $('#task-list ul');
            this.$pathInput = $('#path-input');
            this.$bpsInput = $('#bit-rate-input');
            this.$sufInput =$('#suf-input');
            this.store = new Store();
            this.bpsArr = ['64kbps', '128kbps', '160kbps', '256kbps', '320kbps'];
            this.sufArr = ['mp3', 'm4a', 'aac', 'wav', 'flac'];
            this.$bitRateMenu = $('#bit-rate .mdl-menu');
            this.$sufMenu = $('#suffix .mdl-menu');
            this.suf = this.store.get('suffix') || 'mp3';
            this.bps = this.store.get('kbps') || '128kbps';
        }

        init(){
            $('#dpdn').on('click', e => {
                const focusedWindow = remote.BrowserWindow.getFocusedWindow();
                const option = {
                    properties: ['openDirectory'],
                    title: 'ダウンロードフォルダ',
                    defaultPath: '.'
                };

                remote.dialog.showOpenDialog(focusedWindow, option, filename => {
                    if (filename) {
                        this.store.set('output_path', filename[0]);
                        DlNotification.showCancelNtf('保存先を更新しました');
                        console.log(this.store.get('output_path'));
                    }
                });
                return false;
            });

            $('input').focus(e => {
                $(e).blur();
                return false;
            });

            const suf = this.store.get('suffix') || 'mp3';
            const bps = this.store.get('kbps') || '128kbps';
            console.log(suf, bps);
            this.$pathInput.val(this.store.get('output_path'));
            this.$bpsInput.val(bps);
            this.$sufInput.val(suf);
            this.buildRateMenu();
            this.buildSufMenu();

            tippy('#open-dir-btn');
            $('#open-dir-btn').on('click', ()=> {
                ProcessCommunicatorFromDL.callOpenFile();
                return false;
            });
        }

        buildSufMenu(){
            for (let i = 0; i < this.sufArr.length; i++) {
                const disabled = this.sufArr[i] === this.suf ? 'disabled' : '';
                $('<li class="mdl-menu__item mdl-pre-update" '+ disabled +'>'+ this.sufArr[i] +'</li>').on('click', e => {
                    this.$sufInput.val(this.sufArr[i]);
                    this.suf = this.sufArr[i];
                    this.store.set('suffix', this.sufArr[i]);
                    this.$sufMenu.empty();
                    this.buildSufMenu();
                }).appendTo(this.$sufMenu);
            }
            Util.setElementAsMdl(this.$sufMenu);
        }

        buildRateMenu(){
            for (let i = 0; i < this.bpsArr.length; i++) {
                const disabled = this.bpsArr[i] === this.bps ? 'disabled' : '';
                $('<li class="mdl-menu__item mdl-pre-update" '+ disabled +'>'+ this.bpsArr[i] +'</li>').on('click', (e)=> {
                    this.$bpsInput.val(this.bpsArr[i]);
                    this.bps = this.bpsArr[i];
                    this.store.set('kbps', this.bpsArr[i]);
                    this.$bitRateMenu.empty();
                    this.buildRateMenu();
                }).appendTo(this.$bitRateMenu);
            }
            Util.setElementAsMdl(this.$bitRateMenu);
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
            const self = this;
            this.$taskList.find('.cancel-btn').on('click', e =>{
                const $li = $(e).parents('li');
                const timeStamp = $li.attr('data-time-stamp');
                console.log('キャンセル timeStamp', timeStamp);
                self.removeItem($li);

                DlNotification.showCancelNtf('キャンセルしました');
                ipcRenderer.send('cancelDl', timeStamp);
            });
        }

        removeItem(li){
            li.animate({opacity: '0'}, 500, ()=> {
                li.animate({height: '0'}, 500, ()=> {
                    li.remove();
                });
            });
            const newLi = this.$taskList.find('li:not(#non-list)');
            if (newLi.length)
                newLi.find('.mdl-progress')[0].MaterialProgress.setBuffer(100);
        }

        updateStage(command, timeStamp){
            const $li = this.$taskList.find('li[data-time-stamp="'+ timeStamp +'"]');
            if (!$li.length) //レンダラ側でキャンセル動作と、メインからのsendがバッティングしうる⇒$liが見つからない場合がある
                return;
            const stage = DlNotification.getStageStr(command);
            const num = DlNotification.getStageNum(command);
            $li.find('.mdl-progress')[0].MaterialProgress.setProgress(num);
            $li.find('.stage').html(stage);
        }

        onGetFfmpegEnd(data){
            const $li = this.$taskList.find('li[data-time-stamp="'+ data.timeStamp +'"]');
            this.updateStage('ffmpegEnd', data.timeStamp);
            this.removeItem($li);
            const msg = data.title +' '+ Util.getMDWithWeekDay(moment(data.ft, 'YYYYMMDDhhmmss'));
            DlNotification.showSuccessNtf('ダウンロード完了', msg);
        }

        onGetFfmpegError(data){
            const $li = this.$taskList.find('li[data-time-stamp="'+ data.timeStamp +'"]');
            this.updateStage('ffmpegError', data.timeStamp);
            this.removeItem($li);
            console.log(data.ft);
            const msg = data.title +' '+ Util.getMDWithWeekDay(moment(data.ft, 'YYYYMMDDhhmmss'));
            DlNotification.showFailedNtf('処理に失敗しました', msg);
        }

        onGetFfmpegProgress(data){
            console.log('timeStamp', data.timeStamp);
            const $li = this.$taskList.find('li[data-time-stamp="'+ data.timeStamp +'"]');
            if (!$li.length) {
                console.log('てってれー');
                return;
            } //レンダラ側でキャンセル動作と、メインからのsendがバッティングしうる⇒$liが見つからない場合がある

            const num = new DlNotification(Util).calcProgressNum(data);
            const stage = DlNotification.getStageStr('ffmpegPrg', num);
            console.log('numnum', num);
            $li.find('.mdl-progress')[0].MaterialProgress.setProgress(num);
            $li.find('.stage').html(stage);
        }
    }

    const presenter = new Presenter();
    new IpcClient(DlNotification, FirebaseClient);
    Conductor.init();
});