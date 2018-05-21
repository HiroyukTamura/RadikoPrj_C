const $ = require('jquery');
const tippy = require('tippy.js');
require('bootstrap-notify');
const FirebaseClient = require('../../modules/FirebaseClient');
const IpcClient = require('../../modules/IpcClient');
const DlNotification = require('../../modules/DlNotification');
const Util = require('../../modules/Util');
const {EreaChecker} = require('../../modules/Network');

window.eval = global.eval = function () {
    throw new Error(`Sorry, this app does not support window.eval().`)
};

$(()=>{
    const moment = require('moment');

    class Conductor {
        init(){
            const areaId = EreaChecker.getAreaIdFromStorage();
            console.log(areaId);
            if (!areaId || areaId === 'undefined')
                new EreaChecker().check().then(areaId => {
                    console.log('こっち', areaId);
                    return new InfoClient(areaId).request();
                }).then(data => {
                    Conductor.onGetInfoData(data);
                }).catch(e => {
                    new FirebaseClient().sendError(e, Conductor.init.name, this.constructor.name);
                    console.log(e);
                    $('#notice-radiko .error-big').show();
                });
            else
                new InfoClient(areaId).request().then(data => {
                    Conductor.onGetInfoData(data);
                }).catch(e => {
                    new FirebaseClient().sendError(e, Conductor.init.name, this.constructor.name);
                    console.log(e);
                    $('#notice-radiko .error-big').show();
                });
            this.getOriginalInfo();
        }

        static onGetInfoData(data){
            console.log(data);
            const $infos = $(data).find('info');
            for (let i = 0; i < $infos.length; i++) {
                console.log(i);
                const $info = $infos.eq(i);
                const date = $info.find('date').html();
                const mo = moment(date, 'YYYY.MM.DD');
                if (moment().diff(mo, 'months') >= 1)
                    break;

                const dateVal = mo.format('YYYY年M月D日') +'('+ Util.getWeekDays()[mo.day()] +')';
                const title = $info.find('title').html();
                const body = Util.wrapHtml($info.find('body').html()).html();

                presenter.appendRdkInfoItem(dateVal, title, body);
            }
        }

        getOriginalInfo(){
            const fbClient = new FirebaseClient();
            fbClient.getNotice().then(snapshot => {
                this.onGetOriginalInfo(snapshot);
            }).catch(e => {
                console.log(e);
                fbClient.sendError(e, 'getOriginalInfo', this.constructor.name);
                Presenter.showOriginalInfoErr('データの取得に失敗しました');
            });
        }

        onGetOriginalInfo(snapshot){
            if (snapshot.empty)
                Presenter.showOriginalInfoErr('お知らせはありません');
            else
                snapshot.forEach(doc => {
                    const date = moment(doc.id, 'YYYYMMDD').format('YYYY年M月D日');
                    const value = doc.get('value');
                    presenter.inputCardInfo(doc.get('title'), value, date);
                });
        }
    }

    class Presenter {
        constructor(){
            this.$rdkNtfW = $('#notice-radiko');
            this.$input = $('#comment');
            this.$noticeSec = $('#notice');
            // this.$sendBtn = $('#send-btn');
            tippy('#send-btn');
            this.setBtnClick();
        }

        setBtnClick(){
            $('#send-btn').on('click', ()=>{
                const val = this.$input.val();
                if (!val) {
                    this.$input.parent().addClass('is-invalid');
                    return false;
                }
                const fbClient = new FirebaseClient();
                fbClient.setUserData();
                fbClient['comment'] = val;

                fbClient.writeData('contact-comment').then(()=>{
                    DlNotification.showCancelNtf('送信しました');
                }).catch(e => {
                    console.log(e);
                    DlNotification.showFailedNtf('処理に失敗しました');
                });
                return false;
            });
        }

        appendRdkInfoItem(dateVal, title, body){
            $(
                '<div class="mdl-card mdl-shadow--2dp mdl-pre-upgrade">' +
                    '<p class="news-detail__date">'+ dateVal +'</p>' +
                    '<h4 class="news-detail__title">'+ title +'</h4>' +
                '<div class="news-detail__content">'+ body +'</div>'
            ).appendTo(this.$rdkNtfW);
        }

        inputCardInfo(title, val, date){
            $(
                '<div class="mdl-card mdl-shadow--2dp">\n' +
                    '<h4>'+ title +'</h4>\n' +
                        '<div class="news-detail__content">'+ val +'</div>\n' +
                    '<p class="date-btm">'+ date+'</p>\n' +
                '</div>'
            ).appendTo(this.$noticeSec);
        }

        static showOriginalInfoErr(msg){
            $('#notice.error-big p').html(msg);
            $('#notice.error-big').show();
        }
    }

    class InfoClient {
        constructor(areaId){
            console.log(areaId);
            this.URL ='http://radiko.jp/v2/information2/'+ areaId + '.xml';
        }

        request(){
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: this.URL,
                    cache: false
                }).done((data, textStatus, jqXHR) => {
                    resolve(data);
                }).fail((jqXHR, textStatus, errorThrown) => {
                    console.log('fail', jqXHR.status, textStatus);
                    reject(errorThrown);
                })
            })
        }
    }

    const presenter = new Presenter();
    new IpcClient();
    new Conductor().init();
});