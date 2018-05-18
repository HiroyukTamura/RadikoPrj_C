const $ = require('jquery');
const tippy = require('tippy.js');
require('bootstrap-notify');
const FirebaseClient = require('../../modules/FirebaseClient');

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
                // fbClient.writeUserData(val);
                ipcRenderer.send('sendContact', val);
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

    class ContactResultCatcher{
        constructor(){
            ipcRenderer.on('sendContact', (event, args) => {
                console.log('writeFbResult', args);
            });
        }
    }

    const presenter = new Presenter();
    const ipcClient = new ContactResultCatcher();
    new Conductor().init();
});