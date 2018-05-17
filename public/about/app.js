const $ = require('jquery');
const tippy = require('tippy.js');
require('bootstrap-notify');

$(function(){
    const moment = require('moment');

    class Conductor {
        init(){
            const areaId = EreaChecker.getAreaIdFromStorage();
            console.log(areaId);
            if (!areaId || areaId === 'undefined') {
                new EreaChecker().check().then((areaId) => {
                    console.log('こっち', areaId);
                    return new InfoClient(areaId).request();
                }).then(data => {
                    Conductor.onGetInfoData(data);
                }).catch(e =>{
                    //todo エラー送信
                    console.log(e);
                    $('#notice-radiko .error-big').show();
                });
            } else {
                console.log('なぜだ？');
                new InfoClient(areaId).request().then(data => {
                    Conductor.onGetInfoData(data);
                }).catch(e => {
                    //todo エラー送信
                    console.log(e);
                    $('#notice-radiko .error-big').show();
                });
            }
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
    }

    class Presenter{
        constructor(){
            this.$rdkNtfW = $('#notice-radiko');
            this.$input = $('#comment');
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
                fbClient.writeUserData(val);
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
    }

    class InfoClient{
        constructor(areaId){
            console.log(areaId);
            this.URL ='http://radiko.jp/v2/information2/'+ areaId + '.xml';
        }

        request(){
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: this.URL,
                    cache: false,
                }).done((data, textStatus, jqXHR) => {
                    resolve(data);
                }).fail((jqXHR, textStatus, errorThrown) => {
                    //todo エラー送信
                    console.log('fail', jqXHR.status, textStatus);
                    $('#notice-radiko .error-big').show();
                    reject(errorThrown);
                })
            })
        }
    }

    class FirebaseClient{
        constructor(){
            const config = {
                apiKey: "AIzaSyC3PLY3nwjXPxWAUB10wvIoWAxO_Fn5R7I",
                authDomain: "radiko-7e63e.firebaseapp.com",
                databaseURL: "https://radiko-7e63e.firebaseio.com",
                projectId: "radiko-7e63e",
                storageBucket: "radiko-7e63e.appspot.com",
                messagingSenderId: "1032750813236"
            };
            firebase.initializeApp(config);
            this.db = firebase.firestore();
        }

        writeUserData(comment) {
            //todo ここでOSの種類などをメインプロセスから取得する
            const time = moment().format('YYYYMMDDhhmmss');
            this.db.collection("contact-comment").doc(time).set({
                comment: comment,
                ereaId: EreaChecker.getAreaIdFromStorage(),
                type: 'DESK_TOP'
            })
            .then(()=> {
                Util.dangerNotify('ご意見ありがとうございました！');
            })
            .catch(error => {
                //todo エラー送信
                Util.dangerNotify('送信に失敗しました');
            });
        }
    }

    const fbClient = new FirebaseClient();
    const presenter = new Presenter();
    new Conductor().init();
});