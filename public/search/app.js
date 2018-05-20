'use strict';
const ipcRenderer = require('electron').ipcRenderer;
window.jQuery = window.$= require("jquery");
require('bootstrap');
const dialogPolyfill = require('dialog-polyfill');
const ProgramSearcher = require('../../modules/ProgramSearcher');
const ProcessCommunicator = require('../../modules/ProcessCommunicator');
const IpcClient = require('../../modules/IpcClient');
const DlNotification = require('../../modules/DlNotification');
const FirebaseClient = require('../../modules/FirebaseClient');
const Util = require('../../modules/Util');

require('bootstrap-notify');

$(()=>{
    class Conductor {
        constructor(){
            this.currentM = moment();
            this.$dialog = $('.mdl-dialog');
        }

        init(){
            const self = this;
            Util.setUpDialog(dialogPolyfill, this.$dialog[0]);
            Util.setDialogListeners(this.$dialog[0]);
            $('#dl-btm').on('click', function () {
                self.$dialog[0].close();
                const ft = self.$dialog.attr('ft');
                const stationId = self.$dialog.attr('station');
                const title = self.$dialog.attr('data-title');
                const to = self.$dialog.attr('to');
                const img = self.$dialog.attr('data-img');
                console.log(to);
                ipcComm.callDL(ft, to, stationId, title, img);
            });
        }

        static checkUrlParam(){
            const key = SearchDom.getUrlParam('key');
            if(key){
                searchDom.$keyInput.val(SearchDom.getUrlParam('key'))
                    .parents('.mdl-textfield')
                    .addClass('is-dirty');
                $('#date-form .mdl-menu__item').eq(0).click();
                searchDom.$searchBtn.click();
            }
        }

        setOnClickForWindow(){
            const self = this;
            window.onclick = function (e) {
                //サジェスト以外をクリックしたらサジェストを非表示に
                if (suggester.$dropDown.is(':visible')) {
                    const rect = suggester.$dropDown[0].getBoundingClientRect();
                    if (!(rect.left < e.clientX && e.clientX < rect.right && rect.bottom > e.clientY && e.clientY > rect.top)) {
                        suggester.$dropDown.hide();
                        return false;
                    }
                } else if (self.$dialog.prop('open')) {
                    const rect = self.$dialog[0].getBoundingClientRect();
                    if (!(rect.left < e.clientX && e.clientX < rect.right && rect.bottom > e.clientY && e.clientY > rect.top)) {
                        self.$dialog[0].close();
                        return false;
                    }
                }
                return true;
            }
        }
    }

    class SearchDom {
        constructor(){
            this.$keyInput =$('#prg-search');
            this.$suggestDiv = $('#suggest-drop-down');
            this.$searchBtn = $('#first-row .btn');
            this.momentOpe = conductor.currentM.clone();
            this.noInput = true;
        }

        initializeSearchBar(){
            // this.initDateMenu('#dp-ul .mdl-menu__item', '#date-form .mdl-menu__container', '#date-input', '#dp-btn');
            startDropDown = new StartDropDown('#dp-ul .mdl-menu__item', '#date-form .mdl-menu__container', '#date-input', '#dp-btn', this.momentOpe)
                .init()
                .setOnDateSelected();
            endDropDown = new EndDropDown('#end-dp-ul .mdl-menu__item', '#end-form .mdl-menu__container', '#end-input', '#end-dp-btn', this.momentOpe)
                .init()
                .setOnDateSelected();
            // this.initDateMenu('#end-dp-ul .mdl-menu__item', '#end-form .mdl-menu__container', '#end-input', '#end-dp-btn');
            this.initKeyInput();
            this.setOnClickBtnListener();

            this.initSuggester();
        }

        initSuggester(){
            suggester = new Suggester();
            suggester.init();
            const self = this;
            this.$suggestDiv.on('click', function (e) {
                e.preventDefault();
                suggester.onClickWindow();//todo ここでinputにフォーカスを当てたいが当たらない
                return false;
            });

            window.onresize = function () {
                self.$suggestDiv.width(self.$keyInput.width());
            };

            // //サジェスト以外をクリックしたらサジェストを非表示に
            // window.onclick = function (e) {
            //     if (suggester.$dropDown.is(':visible')) {
            //         const rect = suggester.$dropDown[0].getBoundingClientRect();
            //         if (!(rect.left < e.clientX && e.clientX < rect.right && rect.bottom < e.clientY && e.clientY < rect.top)) {
            //             suggester.$dropDown.hide();
            //             return false;
            //         }
            //     }
            //     return true;
            // };
        }

        initDateMenu(menuItemSel, menuContSel, inputSel, btnSel){
            const $dateMenuItem =$(menuItemSel);
            const $dateInput =$(inputSel);
            const $dpBtn = $(btnSel);

            this.momentOpe.add(-8, 'd');
            for (let i = 0; i < 8; i++) {
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
            })
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

        static getUrlParam(key){
            const url = new URL(window.location.href);
            return url.searchParams.get(key);
        }

        setOnClickBtnListener(){
            const self = this;
            this.$searchBtn.on('click', function() {
                const keyInput = self.$keyInput;
                if (!keyInput.val().length) {
                    if (self.noInput) {
                        self.$keyInput.attr('required', 'required');
                        self.noInput = false;
                        keyInput.parents('.mdl-textfield').addClass('is-invalid');
                    }
                    return false;
                }
                if (self.$suggestDiv.length)
                    self.$suggestDiv.remove();
                let startM = moment(startDropDown.getSelectedYmd(), 'YYYYMMDD');
                let endM = moment(endDropDown.getSelectedYmd(), 'YYYYMMDD');
                console.log(startM, endM);
                requestOperator.requestMeta = new SearchRequestMeta(startM, endM, keyInput.val());
                requestOperator
                    .onPreRequest()
                    .requestJson();

                return false;
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
            this.momentOpe.add(-7, 'd');
            const index = this.$menuContainer.find('.is-selected').index();
            for (let i = 0; i < 8; i++) {
                const val = this.momentOpe.format('M/D') +'('+ Util.getWeekDays()[this.momentOpe.day()] +')';
                if (i === index)
                    this.$dateInput.val(val);
                const ymd = this.momentOpe.format('YYYYMMDD');
                this.$dateMenuItem.eq(i/*「全て」の分*/).attr('date', ymd).html(val);
                this.momentOpe.add(1, 'd');
            }//この時点でmomentOpeは初期状態+1日となる

            this.$dateInput.on('click', function () {
                self.$dpBtn.click();
                return false;
            }).focusin(function () {
                $(this).blur();
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
                return false;
            });
            return this;
        }
    }

    class EndDropDown extends DropDown {
        setOnDateSelected(){
            const self = this;
            this.getDateMenuItem().on('click', function () {
                self.onDateSelectedAsDefault($(this));
                return false;
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
                $.each(data.data, function(i) {
                    new Card(this).$card.appendTo(self.$cardGroupIn);
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

    class Suggester extends ProgramSearcher {
        goSubmit(){
            searchDom.$searchBtn.click();
        }
    }

    class Card {
        constructor(ele){
            this.stationId = ele['station_id'];
            this.performer = ele['performer'];
            this.title = ele['title'];
            this.imgUrl = ele['img'];
            this.prgDate = ele['program_date'];
            this.startTimeS = ele['start_time_s'];
            this.endTimeS = ele['end_time_s'];
            this.info = ele['info'];
            this.desc = ele['description'];
            this.tsNg = ele['ts_in_ng'];
            this.$card = this.createCardWithListener();
        }

        createCardWithListener(){
            const self = this;
            const timeVal = this.startTimeS.splice(2, 0, ':') +' - '+  this.endTimeS.splice(2, 0, ':');
            const dateVal = RequestOperator.generateTimeVal(this.prgDate);
            const cantDl = this.tsNg == 2 ? 'cant-dl' : '';

            return $(
                '<div class="mdl-card mdl-shadow--2dp mdl-pre-upgrade item '+ cantDl +'">\n' +
                    '<div class="station-logo">\n' +
                        '<img src="http://radiko.jp/station/logo/'+ this.stationId +'/logo_medium.png" alt="'+ this.stationId +'">\n' +
                    '</div>\n' +
                    '<img src="'+ this.imgUrl +'" class="prg-logo" alt="番組ロゴ">\n' +
                        '<div class="details">\n' +
                        '<h4 class="prg-title mdl-pre-upgrade">'+ this.title +'</h4>\n' +
                        '<p class="prg-time mdl-pre-upgrade">'+ '<span>'+ dateVal +'</span>' + timeVal +'</p>\n' +
                        '<p class="prg-pfm mdl-pre-upgrade">'+ this.performer +'</p>\n' +
                    '</div>\n' +
                '</div>')
                .on('click', function () {
                    if (conductor.$dialog.prop('open'))
                        return;
                    
                    console.log('clicked');
                    conductor.$dialog.find('.prg-logo')
                        .removeAttr('src')
                        .attr('src', self.imgUrl);
                    conductor.$dialog.find('.title').html(self.title);
                    conductor.$dialog.find('.performer').html(self.performer);
                    // conductor.$dialog.find('.hp').hide();
                    conductor.$dialog.find('.desc')
                        .empty()
                        .append(Util.wrapHtml(self.desc));
                    conductor.$dialog.find('.info')
                        .empty()
                        .html(Util.wrapHtml(self.info));

                    const dlBtn = conductor.$dialog.find('#dl-btm');
                    const errMsg = conductor.$dialog.find('.error-msg');
                    if (self.tsNg == 2) {
                        dlBtn.hide();
                        errMsg.html('この番組はタイムフリー非対応です').show();
                    } else {
                        dlBtn.show();
                        errMsg.html('').hide();
                    }

                    const ft = self.prgDate + '' +self.startTimeS + '00';
                    const to = self.prgDate + '' +self.endTimeS + '00';
                    console.log(ft);
                    conductor.$dialog.attr('ft', ft)
                        .attr('to', to)
                        .attr('station', self.stationId)
                        .attr('data-title', self.title)
                        .attr('data-img', self.imgUrl);

                    conductor.$dialog[0].showModal();

                    return false;
                }).hover(function () {
                    if (self.tsNg != 2)
                        $(this).addClass('is-hovered').removeClass('mdl-shadow--2dp').addClass('mdl-shadow--6dp');
                }, function () {
                    if (self.tsNg != 2)
                        $(this).removeClass('is-hovered').addClass('mdl-shadow--2dp').removeClass('mdl-shadow--6dp');
                });
        }
    }


    const moment = require('moment');
    let startDropDown;
    let endDropDown;
    let suggester;
    const ipcComm = new ProcessCommunicator(DlNotification);
    new IpcClient(DlNotification, FirebaseClient);
    $('form').on('submit', function () {
        return false;
    });
    const conductor = new Conductor();
    conductor.init();
    const searchDom = new SearchDom();
    const requestOperator = new RequestOperator();
    searchDom.initializeSearchBar();
    conductor.setOnClickForWindow();
    Conductor.checkUrlParam();
});