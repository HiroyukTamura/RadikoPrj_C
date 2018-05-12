'use strict';

!function () {
    let conductor;
    let searchDom;
    let startDropDown;
    let endDropDown;
    let requestOperator;
    localStorage.setItem('ereaId', 'JP13');//todo これ後で消すこと
    window.onload = function () {
        conductor = new Conductor();
        conductor.init();
        searchDom = new SearchDom();
        requestOperator = new RequestOperator();
        searchDom.initializeSearchBar();
    };

    class Conductor {
        init(){
            this.currentM = moment();
        }
    }

    class SearchDom {
        constructor(){
            this.$keyInput =$('#keyword');
            this.momentOpe = conductor.currentM.clone();
            this.noInput = true;
        }

        initializeSearchBar(){
            this.initDateMenu('#dp-ul .mdl-menu__item', '#date-form .mdl-menu__container', '#date-input', '#dp-btn');
            startDropDown = new StartDropDown('#dp-ul .mdl-menu__item', '#date-form .mdl-menu__container', '#date-input', '#dp-btn', this.momentOpe)
                .init()
                .setOnDateSelected();
            endDropDown = new EndDropDown('#end-dp-ul .mdl-menu__item', '#end-form .mdl-menu__container', '#end-input', '#end-dp-btn', this.momentOpe)
                .init()
                .setOnDateSelected();
            // this.initDateMenu('#end-dp-ul .mdl-menu__item', '#end-form .mdl-menu__container', '#end-input', '#end-dp-btn');
            this.initKeyInput();
            this.setOnClickBtnListener();
        }

        initDateMenu(menuItemSel, menuContSel, inputSel, btnSel){
            const $dateMenuItem =$(menuItemSel);
            const $dateInput =$(inputSel);
            const $dpBtn = $(btnSel);

            this.momentOpe.add(-6, 'd');
            for (let i = 0; i < 7; i++) {
                const val = this.momentOpe.format('M/D') +'('+ Util.getWeekDays()[this.momentOpe.day()] +')';
                if (i === 0)
                    $dateInput.val(val);
                const ymd = this.momentOpe.format('YYYYMMDD');
                $dateMenuItem.eq(i/*「全て」の分*/).attr('date', ymd).html(val);
                this.momentOpe.add(1, 'd');
            }//この時点でmomentOpeは初期状態+1日となる

            $dateInput.on('click', function () {
                $dpBtn.click();
                return false;
            });
        }

        initKeyInput(){
            const self = this;
            this.$keyInput.on('keyup', function(){
                if (self.noInput) {
                    $(this).attr('required', 'required');
                    self.noInput = false;
                }
                if (!$(this).val().length) {
                    console.log('こっち');
                    return false;
                }
            });
        }

        setOnClickBtnListener(){
            const self = this;
            $('#first-row .btn').on('click', function() {
                const keyInput = self.$keyInput;
                if (!keyInput.val().length) {
                    if (self.noInput) {
                        self.$keyInput.attr('required', 'required');
                        self.noInput = false;
                        keyInput.parents('.mdl-textfield').addClass('is-invalid');
                    }
                    return false;
                }
                let startM = moment(startDropDown.getSelectedYmd(), 'YYYYMMDD');
                let endM = moment(endDropDown.getSelectedYmd(), 'YYYYMMDD');
                console.log(startM, endM);
                requestOperator.requestMeta = new SearchRequestMeta(startM, endM, keyInput.val());
                requestOperator
                    .onPreRequest()
                    .requestJson();
            });
            return this;
        }
    }

    class DropDown {
        constructor(menuItemSel, menuContSel, inputSel, btnSel, moment){
            this.$dateMenuItem =$(menuItemSel);
            this.$menuContainer = $(menuContSel);
            this.$dateInput =$(inputSel);
            this.$dpBtn = $(btnSel);
            this.momentOpe = moment.clone()
        }
        init(){
            const self = this;
            this.momentOpe.add(-6, 'd');
            for (let i = 0; i < 7; i++) {
                const val = this.momentOpe.format('M/D') +'('+ Util.getWeekDays()[this.momentOpe.day()] +')';
                if (i === 6)
                    this.$dateInput.val(val);
                const ymd = this.momentOpe.format('YYYYMMDD');
                this.$dateMenuItem.eq(i/*「全て」の分*/).attr('date', ymd).html(val);
                this.momentOpe.add(1, 'd');
            }//この時点でmomentOpeは初期状態+1日となる

            this.$dateInput.on('click', function () {
                self.$dpBtn.click();
                return false;
            });
            return this;
        }

        setOnDateSelected(){
            throw ('this method must override');
        }

        onDateSelectedAsDefault($selected){
            this.$menuContainer.removeClass('is-visible')
                .find('.is-selected')
                .removeAttr('disabled')
                .removeClass('is-selected');
            $selected.attr('disabled', true)
                .addClass('is-selected');
            this.$dateInput.val($selected.html());
        }

        getDateMenuItem(){
            return this.$dateMenuItem;
        }

        getSelectedYmd(){
            return this.$menuContainer.find('.is-selected').attr('date');
        }
    }

    class StartDropDown extends DropDown {
        setOnDateSelected(){
            const self = this;
            this.getDateMenuItem().on('click', function () {
                self.onDateSelectedAsDefault($(this));
                const index = $(this).index();
                const selectedEnd = endDropDown.getDateMenuItem().parent().find('.is-selected');
                if (index > selectedEnd.index()) {
                    endDropDown.getDateMenuItem().eq(index).click();
                }
                for (let i = 0; i < 7; i++) {
                    if (i < index) {
                        endDropDown.getDateMenuItem().eq(i).hide();
                    } else {
                        endDropDown.getDateMenuItem().eq(i).show();
                    }
                }
            });
            return this;
        }
    }

    class EndDropDown extends DropDown {
        setOnDateSelected(){
            const self = this;
            this.getDateMenuItem().on('click', function () {
                self.onDateSelectedAsDefault($(this));
            });
            return this;
        }
    }

    class RequestOperator{
        constructor(){
            this.$spinner = $('#spinner-1st');
            this.$resultGroup = $('.result');
            this.$cardGroup =$('#card-group');
            this.$cardGroupIn = $('#card-group-in');
            this.$btmSpinWrapper = $('#bottom-spinner');
            this.$errResult =$('#err-result');
            this.$nonResult =$('#non-result');
            this.$suggestResult =$('#suggest-word');
            this.$suggestA = this.$suggestResult.find('a');
            this.uid = Util.generateUid();
            this.requestMeta = null;

            this.init();
        }

        init (){
            this.$suggestA.on('click', function () {
                const value = $(this).html();
                searchDom.$keyInput.val(value);
                return false;
            });
            const self = this;
            const secondRow = $('#second-row');
            const headerRow = $('.mdl-layout__header-row');
            $('.mdl-layout__content').scroll(function (e) {
                if (self.$btmSpinWrapper.is(":visible")
                    && $(this).height()+ headerRow.height() - self.$btmSpinWrapper.offset().top > 32 /*半分以上スピナーラッパーが表示されたら*/){
                    self.requestMeta.pageIndex++;
                    self.requestJson();
                    self.$btmSpinWrapper.css('display', 'none');
                }
            });
        }

        onPreRequest(){
            this.$resultGroup.hide();
            this.$spinner.addClass('is-active');
            this.$cardGroupIn.empty();
            return this;
        }

        /**
         * StorageにereaIdが保存されていることを前提とする。
         */
        requestJson(){
            const ereaId = localStorage.getItem('ereaId');
            const url = 'http://radiko.jp/v3/api/program/search?' +
                'key=' + encodeURIComponent(this.requestMeta.key) +
                '&filter=' + 'past'+
                '&start_day=' + this.requestMeta.startM.format('YYYY-MM-DD') +
                '&end_day=' + this.requestMeta.endM.format('YYYY-MM-DD') +
                '&area_id=' + ereaId +
                '&region_id=&' +
                'cul_area_id=' + ereaId +
                '&page_idx='+ this.requestMeta.pageIndex +
                '&uid='+ this.uid +
                '&row_limit='+ this.requestMeta.rowLimit+
                '&app_id=pc' +
                '&action_id=1' +
                '&action_rank=1';
            $.getJSON(url)
                .done(data =>{
                    this.onGetJson(data);
                })
                .fail((jqXHR, textStatus, errorThrown) =>{
                    console.log(textStatus, errorThrown, jqXHR);
                    this.noticeFailure();
                });
        }

        onGetJson(data){
            console.log(JSON.stringify(data));
            const self = this;
            if (!data['meta']['result_count']) {
                if (data['meta']['suisengo']) {
                    this.noticeSuggest(data['meta']['suisengo'])
                } else {
                    this.noticeNonResult();
                }
            } else {
                $.each(data.data, function(i, ele) {
                    const timeVal = ele['start_time_s'].splice(2, 0, ':') +' - '+  ele['end_time_s'].splice(2, 0, ':');
                    const dateVal = RequestOperator.generateTimeVal(ele['program_date']);
                    $('<div class="mdl-card mdl-shadow--2dp mdl-pre-upgrade item">\n' +
                        '<div class="station-logo">\n' +
                            '<img src="http://radiko.jp/station/logo/'+ ele['station_id'] +'/logo_medium.png" alt="'+ ele['station_id'] +'">\n' +
                        '</div>\n' +
                        '<img src="'+ ele['img'] +'" class="prg-logo" alt="番組ロゴ">\n' +
                        '<div class="details">\n' +
                            '<h4 class="prg-title mdl-pre-upgrade">'+ ele['title'] +'</h4>\n' +
                            '<p class="prg-time mdl-pre-upgrade">'+ '<span>'+ dateVal +'</span>' + timeVal +'</p>\n' +
                            '<p class="prg-pfm mdl-pre-upgrade">'+ ele['performer'] +'</p>\n' +
                        '</div>\n' +
                    '</div>')
                        .on('click', function () {
                            console.log('clicked');
                        }).hover(function () {
                            $(this).addClass('is-hovered').removeClass('mdl-shadow--2dp').addClass('mdl-shadow--6dp');
                        }, function () {
                            $(this).removeClass('is-hovered').addClass('mdl-shadow--2dp').removeClass('mdl-shadow--6dp');
                        }).appendTo(self.$cardGroupIn);
                });
                Util.setElementAsMdl(self.$cardGroupIn);
                this.noticeCards();

                if (data['meta']['row_limit'] * (data['meta']['page_idx']+1) < data['meta']['result_count']) {
                    self.$btmSpinWrapper.css('display', 'flex');
                } else {
                    self.$btmSpinWrapper.css('display', 'none');
                    const groupWidth = self.$cardGroupIn.width();
                    const columnNum = Math.floor(groupWidth / (300+16*2/*カード幅+マージン*/));
                    const dummyNum = columnNum -data.data.length % columnNum;
                    for (let i = 0; i < dummyNum; i++)
                        $('<div class="mdl-card mdl-shadow--2dp mdl-pre-upgrade item dummy"></div>')
                            .appendTo(self.$cardGroupIn);
                }
            }
        }

        noticeFailure(){
            this.hideAllResult();
            this.$errResult.show();
        }

        noticeNonResult(){
            this.hideAllResult();
            this.$nonResult.show();
        }

        noticeSuggest(word){
            this.hideAllResult();
            this.$suggestResult.show();
            this.$suggestA.html(word);
        }

        noticeCards(){
            this.hideAllResult();
            this.$cardGroup.show();
        }

        /**
         * {@link #noticeFailure}と{@link noticeNonResult}付属。
         */
        hideAllResult(){
            this.$spinner.removeClass('is-active');
            this.$cardGroup.hide();
            this.$errResult.hide();
            this.$nonResult.hide();
            this.$suggestResult.hide();
        }

        /**
         * @see <a href="../../doc/SearchResult2.json"></a>
         * @param prgDate ex. 20120517
         */
        static generateTimeVal(prgDate){
            const momentM = moment(prgDate, 'YYYYMMDD');
            return momentM.format('M/D') +'('+ Util.getWeekDays()[momentM.day()] +')';
            // return val +' '+ startHhSs.splice(2, 0, ':') +' - '+  endHhSs.splice(2, 0, ':');
        }
    }

    class SearchRequestMeta{
        constructor(startM, endM, key) {
            this.startM = startM;
            this.endM = endM;
            this.key = key;
            this.pageIndex = 0;
            this.rowLimit = 12;
        }
    }
}();