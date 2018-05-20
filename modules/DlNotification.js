module.exports = class DlNotification {
    constructor(stationId, ft, title) {
        this.moment = require('moment');
        require('bootstrap-notify');
        this.stationId = stationId;
        this.ft = ft;
        this.title = title;
        const momentM = this.moment(ft, 'YYYYMMDDhhmmss');
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
        const totalSec = this.moment(data.to, 'YYYYMMDDhhmmss').diff(this.moment(data.ft, 'YYYYMMDDhhmmss'), 'seconds');
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
};