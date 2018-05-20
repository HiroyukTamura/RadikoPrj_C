module.exports = class Util{
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

    static unEscapeHTML(str) {
        let s = this.replaceAll(str, "&gt;", '>');
        s = this.replaceAll(s, "&lt;", '<');
        s = this.replaceAll(s, '&nbsp;', ' ');
        s = this.replaceAll(s, "&#13;", '\r');
        s = this.replaceAll(s, "&#10;", '\n');

        return s;
    }

    static wrapHtml(str){
        return $('<span>').html(this.unEscapeHTML(str));
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
};