module.exports = class ProgramSearcher {
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
};