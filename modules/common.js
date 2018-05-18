const moment = require('moment');
const ipcRenderer = require('electron').ipcRenderer;

class Util{
    static getWeekDays(){
        return ['日', '月', '火', '水', '木', '金', '土']
    }

    static setElementAsMdl($clone) {
        let ele = $clone.find(".mdl-pre-upgrade");
        for (let i = 0; i < ele.length; i++) {
            componentHandler.upgradeElement(ele.eq(i)[0]);
        }
    }

    static generateUid(){
        let rnd = Math.floor(Math.random() * 1000000000) + "" + (new Date()).getTime();
        return MD5_hexhash(rnd);
    }

    static setUpDialog(dialogPolyfill, dialog){
        if (!dialog.showModal) {
            dialogPolyfill.registerDialog(dialog);
        }
    }

    static setDialogListeners(dialog){
        dialog.addEventListener('close', function(e) {

        });
        $('.cancel-btn').on('click', function () {
            dialog.close();
        });
    }

    static showDialogDlBtn($dialog){
        $dialog.find('.mdl-spinner').hide();
        $dialog.find('#dl-btm').show();
    }

    static showDialogErrOnBtn($dialog, msg){
        $dialog.find('.mdl-spinner').hide();
        $dialog.find('.error-msg').html(msg).show();
    }

    static getErrMsgNetWork(){
        return '通信に失敗しました'
    }

    static getErrMsgUnknown(){
        return '処理に失敗しました'
    }

    static getErrMsgUnAvailable(){
        return 'この番組はタイムフリーに対応していません';
    }

    /**
     * @returns {number} 1=>DLボタン発見 0=>エラーボタン発見 -1=>エラー(ページの構造が変わったか??)
     */
    static isCanAvialble($dom){
        if ($dom.find('#now-programs-list > div.live-detail__body.group > div.live-detail__text > p.live-detail__play.disabled > a').length)
            return 1;
        if ($dom.find('#now-programs-list > div.live-detail__body.group > div.live-detail__text > p.live-detail__plan').length)
            return 0;
        return -1;
    }

    static unescapeHTML(str) {
        let s = this.replaceAll(str, "&gt;", '>');
        s = this.replaceAll(s, "&lt;", '<');
        s = this.replaceAll(s, '&nbsp;', ' ');
        s = this.replaceAll(s, "&#13;", '\r');
        s = this.replaceAll(s, "&#10;", '\n');

        return s;
    }

    static wrapHtml(str){
        return $('<span>').html(this.unescapeHTML(str));
    }

    static replaceAll(str, before, after) {
        let result = str;
        do {
            str = result;
            result = str.replace(before, after);
        } while (str !== result);
        return result;
    };


    static dangerNotify(msg){
        $.notify({
            message: msg
        },{
            type: 'danger'
        });
    }
    
    static successNotify(msg) {
        $.notify({
            message: msg
        },{
            type: 'success'
        });
    }

    static getMDWithWeekDay(momentOpe){
        return momentOpe.format('M/D') +'('+ Util.getWeekDays()[momentOpe.day()] +')';
    }
}

class DlNotification {
    constructor(stationId, ft, title) {
        this.stationId = stationId;
        this.ft = ft;
        this.title = title;
        const momentM = moment(ft, 'YYYYMMDDhhmmss');
        this.dateVal = momentM.format('M/D') +'('+ Util.getWeekDays()[momentM.day()] +')';
        this.msg = this.dateVal +'  '+ title;
        this.ntf = null;
    }

    showNtf(){
        this.ntf = $.notify({
            title: 'データを取得しています...',
            message: this.msg,
            progress: 0,
        },{
            type: 'progress-ntf',
            placement: {
                from: "bottom",
                align: "right"
            },
            // icon_type: 'img',
            showProgressbar: true,
            delay: 0,
            template:
            '<div data-notify="container" class="col-xs-12 col-sm-4 alert alert-{0} progress-ntf" role="alert">' +
                '<button type="button" aria-hidden="true" class="close" data-notify="dismiss">×</button>' +
                '<div>' +
                    // '<img data-notify="icon" class="pull-right">' +
                    '<div>'+
                        '<span data-notify="title">{1}</span>' +
                        '<span data-notify="message">{2}</span>' +
                    '</div>'+
                    '<div class="progress" data-notify="progressbar">' +
                        '<div class="progress-bar progress-bar-{0}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;"></div>' +
                    '</div>' +
                '</div>'+
            '</div>'
        });
    }

    updateAs3rd(){
        this.ntf.update({
            title: 'ダウンロードを開始します...',
            progress: 20
        })
    }

    updateAsPrg(data){
        this.ntf.update({
            title: 'データを再構成しています...(これには時間がかかることがあります)',
            progress: DlNotification.calcProgressNum(data)
        })
    }

    static calcProgressNum(data){
        const totalSec = moment(data.to, 'YYYYMMDDhhmmss').diff(moment(data.ft, 'YYYYMMDDhhmmss'), 'seconds');
        return 30 + Math.round(70 * data.ffmpegPrg / totalSec)
    }

    updateAs4th(){
        this.ntf.update({
            title: 'メタデータを書き込んでいます...',
            progress: 30
        })
    }

    updateAsSuccess(){
        this.ntf.update({
            title: 'ダウンロード完了',
            progress: 100,
        });
        this.ntf.update({
            delay: 5000/*5000がデフォルト値*/,
            allow_dismiss: false
        });
    }

    updateAsFailed(msg = '処理に失敗しました'){
        this.ntf.update({
            title: msg,
            progress: 0,
            type: 'progress-fail'
            // type: 'danger',
            // delay: 5000/*5000がデフォルト値*/,
            // allow_dismiss: false
        });
    }

    static showDuplicatedNtf(){
        $.notify({
            message: 'この番組は現在ダウンロード中です'
        },{
            type: 'danger',
            allow_dismiss: false,
            placement: {
                from: "bottom",
                align: "right"
            }
        });
    }

    static showFailedNtf(title, message) {
        if (message) {
            $.notify({
                icon: '../../img/exclamation-triangle.svg',
                title: title,
                message: message
            },{
                type: 'minimalist',
                icon_type: 'image',
                delay: 0,
                allow_dismiss: true,
                placement: {
                    from: "bottom",
                    align: "right"
                },
                template:
                '<div data-notify="container" class="col-xs-12 col-sm-4 alert alert-{0} red" role="alert">' +
                '<button type="button" aria-hidden="true" class="close" data-notify="dismiss">×</button>' +
                '<div>' +
                '<div>'+
                '<span data-notify="title">{1}</span>' +
                '<span data-notify="message">{2}</span>' +
                '</div>'+
                '<img data-notify="icon" class="img-circle pull-right">' +
                '</div>'+
                '</div>'
            });
        } else {
            $.notify({
                icon: '../../img/exclamation-triangle.svg',
                title: title,
            },{
                type: 'minimalist',
                icon_type: 'image',
                delay: 0,
                allow_dismiss: true,
                placement: {
                    from: "bottom",
                    align: "right"
                },
                template:
                '<div data-notify="container" class="col-xs-12 col-sm-4 alert alert-{0} red one-row" role="alert">' +
                    '<button type="button" aria-hidden="true" class="close" data-notify="dismiss">×</button>' +
                    '<div>' +
                        '<div>'+
                            '<span data-notify="title">{1}</span>' +
                        '</div>'+
                        '<img data-notify="icon" class="img-circle pull-right">' +
                    '</div>'+
                '</div>'
            });
        }
    }

    static showSuccessNtf(title, message) {
        $.notify({
            icon: '../../img/check-circle.svg',
            title: title,
            message: message
        },{
            type: 'minimalist',
            icon_type: 'image',
            allow_dismiss: true,
            placement: {
                from: "bottom",
                align: "right"
            },
            template: this.getHtmlTemplate()
        });
    }

    static getHtmlTemplate(){
        return '<div data-notify="container" class="col-xs-12 col-sm-4 alert alert-{0} blue" role="alert">' +
            '<div>' +
                '<div>'+
                    '<span data-notify="title">{1}</span>' +
                    '<span data-notify="message">{2}</span>' +
                '</div>'+
                '<img data-notify="icon" class="img-circle pull-right">' +
            '</div>'+
        '</div>'
    }

    static showCancelNtf(title) {
        $.notify({
            icon: '../../img/check-circle.svg',
            title: title
        },{
            type: 'minimalist',
            icon_type: 'image',
            delay: 5000,
            allow_dismiss: false,
            placement: {
                from: "bottom",
                align: "right"
            },
            template:
            '<div data-notify="container" class="col-xs-12 col-sm-4 alert alert-{0} blue one-row" role="alert">' +
                '<button type="button" aria-hidden="true" class="close" data-notify="dismiss">×</button>' +
                '<div>' +
                    '<div>'+
                        '<span data-notify="title">{1}</span>' +
                    '</div>'+
                    '<img data-notify="icon" class="img-circle pull-right">' +
                '</div>'+
            '</div>'
        });
    }

    static getStageStr(stage, num){
        switch (stage) {
            case 'UNSET':
                return 'ダウンロードの開始を待っています...(0%)';
            case 'pageReached':
                return 'ダウンロード中...(20%)';
            case 'ffmpegStart':
                return 'メタデータを書き込んでいます...(30%)';
            case 'ffmpegPrg':
                return 'データをMP3に変換しています('+ num +'%)<br>(これには時間がかかることがあります)...';
            default:
                return'';
        }
    }

    static getStageNum(stage){
        switch (stage) {
            case 'UNSET':
                return 0;
            case 'pageReached':
                return 20;
            case 'ffmpegStart':
                return 30;
            case 'ffmpegEnd':
                return 100;
            case 'ffmpegError':
                return 0;
        }
    }
}

class ProcessCommunicator{
    constructor(){
        this.setOnReceiveListeners();
        this.ntfList = [];
    }

    relaseNtf(stationId, ft){
        for (let i = 0; i < this.ntfList.length; i++) {
            if (this.ntfList[i].stationId === stationId && this.ntfList[i].ft === ft) {
                this.ntfList.splice(i, 1);
                return;
            }
        }
    }

    getNtf(stationId, ft){
        let ntf = null;
        this.ntfList.forEach(function (ele) {
            if (ele.stationId === stationId && ele.ft === ft)
                ntf = ele;
        });
        if (ntf === null) {
            //todo エラー送信
            console.warn('ntf==null');
        }
        return ntf;
    }

    static callDL(ft, to, stationId, title, img){
        const data = {
            ft: ft,
            to: to,
            stationId: stationId,
            title: title,
            img: img
        };
        ipcRenderer.send('startDlWithFt', data);
    }

    setOnReceiveListeners(){
        ipcRenderer.on('startDlWithFt-REPLY', (event, arg) => {
            this.onGetStartDlWithFtReply(arg);
            // }).on('isDownloadable', (event, data) => {
            //     this.onGetIsDownloadable(data);
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
        }).on('ffmpegPrg', (event, data) => {
            this.onGetFfmpegProgress(data);
        }).on('unhandledRejection', (event, data) => {
            DlNotification.showCancelNtf('処理に失敗しました');
        }).on('unhandledRejection', (efvent, data) => {
            DlNotification.showCancelNtf('処理に失敗しました');
        });
    }

    onGetStartDlWithFtReply(arg){
        console.log(arg);
        if (arg.duplicated) {
            DlNotification.showDuplicatedNtf();
        } else {
            let ntf = new DlNotification(arg.stationId, arg.ft, arg.title);
            ntf.showNtf();
            this.ntfList.push(ntf);
        }
    }

    // onGetIsDownloadable(data){
    //     const ntf = this.getNtf(data.stationId, data.ft);
    //     if (!ntf) return;
    //
    //     if (data.status === 'SUCCESS') {
    // console.log('yeah! let\' DL!!');
    // this.$status.circleProgress({
    //     value: 0.4
    // });
    // const msg = ProcessCommunicator.generateNtfVal(data);
    // Util.successNotify('データを確認しています...\n'+ msg);
    //     ntf.updateAs2nd();
    // } else {
    //     const msg = data.status === 'UNKNOWN' ? '処理に失敗しました' : data.status;
    //     ntf.updateAsFailed(msg);
    // }

    // const msg = data.status === 'UNKNOWN' ? '処理に失敗しました' : data.status;
    // Util.dangerNotify(msg);
    // this.rollbackStatus(data);
    // }

    onGetFfmpegStart(data){
        const ntf = this.getNtf(data.stationId, data.ft);
        if (ntf)
            ntf.updateAs4th();
    }

    onGetFfmpegError(data) {
        console.log(data);
        const ntf = this.getNtf(data.stationId, data.ft);
        if (ntf)
            ntf.updateAsFailed();
        this.relaseNtf(data.stationId, data.ft);
    }

    onGetFfmpegEnd(data) {
        const ntf = this.getNtf(data.stationId, data.ft);
        if (ntf)
            ntf.updateAsSuccess();
        this.relaseNtf(data.stationId, data.ft);
    }

    onGetPageReached(data) {
        const ntf = this.getNtf(data.stationId, data.ft);
        if (ntf)
            ntf.updateAs3rd();
    }

    onGetFfmpegProgress(data) {
        const ntf = this.getNtf(data.stationId, data.ft);
        if (ntf) {
            ntf.updateAsPrg(data);
        }
    }
}

String.prototype.splice = function(start, delCount, newSubStr) {
    return this.slice(0, start) + newSubStr + this.slice(start + Math.abs(delCount));
};

class ProgramSearcher {
    constructor(){
        this.$dropDown = $('#suggest-drop-down');
        this.$input = $('#prg-search');
    }

    init(){
        const self = this;
        this.$input.on('keyup', function (e) {
            console.log(e.type, e.which);
            if (e.which === 38) {
                //↑キー
                const $keyFocused = self.$dropDown.find('.key-focused');
                if (!$keyFocused.length) {
                    self.$dropDown.find('div').last().addClass('key-focused');
                } else if ($keyFocused.is(':first-child')) {
                    $keyFocused.removeClass('key-focused');
                    self.$dropDown.find('div').last().addClass('key-focused');
                } else {
                    $keyFocused.removeClass('key-focused');
                    $keyFocused.prev().addClass('key-focused');
                }
            } else if (e.which === 40) {
                //↓キー
                const $keyFocused = self.$dropDown.find('.key-focused');
                if (!$keyFocused.length) {
                    self.$dropDown.find('div').eq(0).addClass('key-focused');
                } else if ($keyFocused.is(':last-child')) {
                    $keyFocused.removeClass('key-focused');
                    self.$dropDown.find('div').eq(0).addClass('key-focused');
                } else {
                    $keyFocused.removeClass('key-focused');
                    $keyFocused.next().addClass('key-focused');
                }
            } else if (e.which === 13) {
                //エンターキー
                const $keyFocused = self.$dropDown.find('.key-focused');
                if ($keyFocused.length) {
                    self.resetSuggestion($keyFocused.text());
                    // self.$dropDown.hide();
                    // $keyFocused.removeClass('key-focused');
                } else {
                    self.goSubmit(self.$input.val());
                }
            } else {
                const key = $(this).val();
                if (key.length)
                    self.requestSuggestion(key);
                else {
                    self.$dropDown.removeClass('has-val')
                        .hide();
                }
            }
        });
    }

    requestSuggestion(key){
        const self = this;
        const url = 'http://radiko.jp/v3/api/program/search/suggest?' +
            'key=' + encodeURIComponent(key) +
            '&filter=&start_day=&end_day=&area_id=&cul_area_id=' +
            '&uid=' + Util.generateUid() +
            '&row_limit=8&page_idx=0&app_id=pc';

        console.log(url);
        $.getJSON(url)
            .done(data =>{
                self.$dropDown.empty();
                data['data'].forEach(val => {
                    self.$dropDown.append($('<div index="'+ val['action_rank'] +'">'+ val.key +'</div>'));
                });
                self.$dropDown
                    .addClass('has-val')
                    .show();
                self.$dropDown.find('div').hover(function () {
                    $(this).addClass('mouseover');
                }, function () {
                    $(this).removeClass('mouseover');
                });
            })
            .fail((jqXHR, textStatus, errorThrown) =>{
                console.log(textStatus, errorThrown, jqXHR);
                self.$dropDown.hide();
            });
    }

    onClickWindow(){
        const $clickedEle = this.$dropDown.find('.mouseover');
        if ($clickedEle.length) {
            this.resetSuggestion($clickedEle.html());
        }
    }

    resetSuggestion(val){
        if (val)
            this.$input.val(val);
        this.$input.parents('.mdl-textfield')
            .addClass('is-focused')
            .focus();
        this.$dropDown.empty();
    }
    
    goSubmit(key){
        throw ('this method must override');
    }
}