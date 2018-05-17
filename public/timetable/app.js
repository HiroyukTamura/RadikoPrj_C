'use strict';
require('bootstrap');
const dialogPolyfill = require('dialog-polyfill');
require('bootstrap-notify');

!function(){
    window.jQuery = window.$= require("jquery");
    const moment = require('moment');/*グローバルに定義してはいけない??*/
    let ereaChecker;
    let domFrame;
    let conductor;
    let searcher;
    let ipcConn;

    $(window).on('load', ()=> {
        console.log('onload');
        ipcConn = new ProcessCommunicator();
        ereaChecker = new EreaChecker();
        domFrame = new DomFrame();
        conductor = new OperationConductor();
        searcher = new ProgramSearcherCustom();

        conductor.initialOperate();

        $(window).on('click', (e)=> {
            console.log('Im clicked' , e.clientX, e.clientY);
            // searcher.onClickWindow(event);
            if (domFrame.$dialog.prop('open')) {
                const rect = domFrame.$dialog[0].getBoundingClientRect();
                if (!(rect.left < e.clientX && e.clientX < rect.right && rect.bottom > e.clientY && e.clientY > rect.top)) {
                    domFrame.$dialog[0].close();
                    e.stopPropagation();
                }
            } else {
                const $clickedEle = searcher.$dropDown.find('.mouseover');
                if ($clickedEle.length) {
                    searcher.resetSuggestion($clickedEle.html());
                    e.stopPropagation();
                }
            }
        });
    });

    class OperationConductor{
        initialOperate(){
            domFrame.init();
            ereaChecker.check().then((ereaId => {
                return new ProgramListGetter(domFrame.currentM).setAreaUrl(ereaId).request();
            })).then((data) => {
                new TimeTableDom(data).init();
                domFrame.setOnCardClickListener();
                domFrame.show();
            }).catch(err => {
                //todo エラー処理
                console.log(err);
            });
            domFrame.scrollTopOffset();
            domFrame.initDateMenu();
            domFrame.setOnClickListenersForFrame();
            Util.setElementAsMdl($(document));
            searcher.init();
        }

        changeDate(){
            domFrame.removeAllDoms();
            domFrame.updateDateMenu(true);
            ereaChecker.check().then((ereaId => {
                localStorage.setItem('ereaId', ereaId);
                return new ProgramListGetter(domFrame.currentM).setAreaUrl(ereaId).request();
            })).then((data) => {
                new TimeTableDom(data).init();
                domFrame.setOnCardClickListener();
                domFrame.show();
            }).catch(err => {
                //todo エラー処理
                console.log(err);
            });
        }

        startChangeToStationTable(stationId, stationName){
            domFrame.setOnLoadingMode();
            domFrame.resetAllDoms();

            new ProgramListGetter(domFrame.currentM)
                .setStationUrl(stationId)
                .request()
                .then((data)=>{
                    new StationTableDom(data).init();
                    domFrame.setOnCardClickListener();
                    domFrame.updateDateMenu(false);
                    domFrame.show();
                    domFrame.scrolltMostRihgt();
                    const $cont = $('.mdl-layout__content');
                    $cont.scrollLeft($cont.width());
                }).catch((e)=>{
                    console.log(e);
                    //todo エラー処理
                });
            domFrame.disableStMenuItem(stationId);
        }
    }

    class DomFrame {
        constructor(){
            this.tabBar = $('.mdl-layout__tab-bar');
            this.$root =  $('.mdl-layout__content');
            this.$header = $('#header-table-out');
            // this.$header = $('#header-table-out > span');
            this.headerWid = this.$header.find('span').width()/2;
            this.$footer = $('#footer-table-out');
            this.footerWid = this.$footer.find('span').width()/2;
            this.$timeTable =$('#mix-table');
            this.$spinner = $('.mdl-spinner');
            // this.$mdlTabs =$('.mdl-layout__tab');
            this.$calendarMenu = $('#calendar-menu');
            this.$stationMenu =$('#station-menu');
            this.$grid =$('#grid');
            this.currentM = moment();
            this.$dialog = $('.mdl-dialog');
            Util.setUpDialog(dialogPolyfill, this.$dialog[0]);
        }

        init() {
            const self = this;
            this.$root.scroll(function () {
                self.centerHeadAndFoot(this.$root);
            });
            $(window).resize(function() {
                self.centerHeadAndFoot(this.$root);
            });
            this.centerHeadAndFoot();
        }

        centerHeadAndFoot() {
            console.log('スクロール発火');
            const left = this.$root.scrollLeft();
            this.tabBar.scrollLeft(left);
            const offset = $(window).width()/2 + left;
            this.$header.find('span').css('left', offset - this.headerWid);
            this.$footer.find('span').css('left', offset - this.footerWid);
        }

        scrollTopOffset(){
            this.$root.scrollTop(72);
        }

        scrolltMostRihgt(){
            this.$root.scrollLeft(this.$root.width());
        }

        show(){
            this.$spinner.removeClass('is-active');
            this.$timeTable.show();
            $('.mdl-layout__tab').show();
            $('.optional-btn').removeAttr('disabled');
        }

        setOnLoadingMode(){
            $('.mdl-layout__tab').hide();
            this.$timeTable.hide();
            this.$spinner.addClass('is-active');
            $('.optional-btn').prop('disabled', true);
        }

        resetAllDoms(){
            $('.mdl-layout__tab').remove();
            this.$grid.children().remove();
            this.$header.hide();
            this.$footer.hide();
        }

        removeAllDoms(){
            this.$timeTable.hide();
            this.$grid.empty();
            this.$spinner.addClass('is-active');
            $('.mdl-layout__tab').remove();
            this.$stationMenu.empty()
        }

        setOnClickListenersForFrame(){
            const self =this;
            $('#header-table-out').on('click', function () {
                self.currentM.add(-1, 'd');
                conductor.changeDate();
            });
            $('#footer-table-out').on('click', function () {
                self.currentM.add(1, 'd');
                conductor.changeDate();
            });
            $('#calendar-menu .mdl-menu__item').on('click', function () {
                console.log($(this).attr('id'));
                if ($(this).prop('disabled'))
                    return false;
                $(this).parents('.mdl-menu__container')
                    .removeClass('is-visible');
                const ymd = $(this).attr('date');
                self.currentM = moment(ymd, 'YYYYMMDD');
                conductor.changeDate();
            });
            Util.setDialogListeners(this.$dialog[0]);
            $('#dl-btm').on('click', function () {
                self.$dialog[0].close();
                //todo ダウンロード！！
                const ft = self.$dialog.attr('ft');
                const stationId = self.$dialog.attr('station');
                const title = self.$dialog.attr('data-title');
                const to = self.$dialog.attr('to');
                ProcessCommunicator.callDL(ft, to, stationId, title);
            });
        }

        setOnClickPostGetPrg(){
            $('.mdl-layout__tab').on('click', function () {
                const id = $(this).attr('id');
                const name = $(this).attr('data-name');
                console.log(id);
                // const menuItem = $('#station-menu .mdl-menu__item[station="'+ id +'"]');
                // menuItem.prop('disabled', true);
                conductor.startChangeToStationTable(id, name);
                return false;//tagがaなので必要
            });
            this.setOnStMenuItemClick();
        }

        setOnStMenuItemClick(){
            const self = this;
            $('#station-menu .mdl-menu__item').on('click', function () {
                const id = $(this).attr('station');
                const name = $(this).attr('data-name');
                console.log(id);
                //ここでliをdisabledにしても、なぜかリセットされてしまうので、後ほどdisabledする
                if (!$(this).prop('disabled')) {
                    $(this).parents('.mdl-menu__container').removeClass('is-visible');
                }
                conductor.startChangeToStationTable(id, name);
            });
        }

        disableStMenuItem(selectedId){
            let menuList = [];
            this.$stationMenu.children().each((i, ele) =>{
                const stationId = $(ele).attr('station');
                const name =  $(ele).attr('data-name');
                const disabled = selectedId === stationId ? 'disabled' : '';
                const html = '<li class="mdl-menu__item mdl-pre-upgrade" station="'+ stationId +'" data-name="'+ name +'" '+ disabled +'>'+ name +'</li>';
                menuList.push(html);
            });
            this.$stationMenu.children().remove();
            for (let i = 0; i < menuList.length; i++)
                this.$stationMenu.append($(menuList[i]));
            Util.setElementAsMdl(this.$stationMenu);

            this.setOnStMenuItemClick();
        }

        static setToolbarTitle(val, stationId){
            if (stationId) {
                const logoUrl = 'http://radiko.jp/station/logo/'+ stationId +'/logo_medium.png';
                $('.mdl-layout-title img').attr('src', logoUrl).show();
                $('.mdl-layout-title span').html('');
            } else {
                $('.mdl-layout-title img').hide();
                $('.mdl-layout-title span').html(val);
            }
        }

        initDateMenu(){
            const momentOpe = domFrame.currentM.clone();

            for (let i = 0; i < 7; i++) {
                let val = Util.getMDWithWeekDay(momentOpe);
                const menuLi = $('<li class="mdl-menu__item mdl-pre-upgrade" date="'+ momentOpe.format('YYYYMMDD') +'">'+ val +'</li>');
                if (i === 0)
                    menuLi.addClass('current')
                        .attr('disabled', true);
                this.$calendarMenu.prepend(menuLi);
                momentOpe.add(-1, 'd');
            }
        }

        updateDateMenu(setFooterAndHeader){
            console.log(domFrame.currentM.format('YYYYMMDD'));
            this.$calendarMenu.find('.mdl-menu__item.current').removeAttr("disabled").removeClass('current');
            const currentLi = this.$calendarMenu.find('.mdl-menu__item[date="'+ domFrame.currentM.format('YYYYMMDD') +'"]')
                .addClass('current')
                .attr('disabled', true);
            if (!setFooterAndHeader)
                return;
            const index = currentLi.index();
            if (index === 0)
                this.$header.hide();
            else
                this.$header.show();
            if (index === 6)
                this.$footer.hide();
            else
                this.$footer.show();
        }

        setOnCardClickListener(){
            const self = this;
            $('.prg-card-w').on('click', function (e) {
                e.preventDefault();
                console.log('click');

                if (self.$dialog.prop('open'))
                    return false;

                // '<span class="desc">'+ desc +'</span>\n'+
                // '<span class="pfm">'+ pfm +'</span>\n'+
                // '<span class="img">'+ img +'</span>\n'+
                const html = $(this).find('.prg-title').html();
                const ft = $(this).find('.info_group .ft').html();
                const to = $(this).find('.info_group .to').html();
                const info = $(this).find('.info_group .info').html();
                const desc = $(this).find('.info_group .desc').html();
                const pfm = $(this).find('.info_group .pfm').html();
                const img = $(this).find('.info_group .img').html();
                const hp = $(this).find('.info_group .url').html();
                const prgId = $(this).attr('prgid');

                self.$dialog.find('.prg-logo').removeAttr('src').attr('src', img);
                self.$dialog.find('.title').html(html);
                self.$dialog.find('.performer').html(pfm);
                self.$dialog.find('.hp a').html(hp);
                self.$dialog.find('.date').html(DomFrame.getDialogDate(ft, to));
                self.$dialog.find('.desc')
                    .empty()
                    .append(Util.wrapHtml(desc));
                self.$dialog.find('.info')
                    .empty()
                    .html(Util.wrapHtml(info));
                self.$dialog.attr('ft', ft)
                    .attr('station', $(this).attr('station'))
                    .attr('data-title', html)
                    .attr('to', to);

                if ($(this).hasClass('cant-dl')) {
                    self.$dialog.find('#dl-btm');
                }

                const dlBtn = self.$dialog.find('#dl-btm');
                const errMsg = self.$dialog.find('.error-msg');
                if ($(this).hasClass('cant-dl')) {
                    dlBtn.hide();
                    errMsg.html('この番組はタイムフリー非対応です').show();
                } else if (moment(ft, 'YYYYMMDDhhmmss').diff(moment()) > 0) {
                    dlBtn.hide();
                    errMsg.html('この番組はまだ配信されていません').show();
                } else if (moment(to, 'YYYYMMDDhhmmss').diff(moment()) > 0){
                    dlBtn.hide();
                    errMsg.html('放送中の番組はダウンロードできません').show();
                } else {
                    dlBtn.show();
                    errMsg.html('').hide();
                }

                self.$dialog[0].showModal();

                return false;
            });
        }

        static getDialogDate(ft, to){
            const startM = moment(ft, 'YYYYMMDDhhmmss');
            const endM = moment(to, 'YYYYMMDDhhmmss');
            const date = startM.format('M/D') +'('+ Util.getWeekDays()[startM.day()] +')';
            const time = startM.format('HH:mm') + ' - '+endM.format('HH:mm');
            return date + ' ' + time;
        }
    }

    class StationTableDom extends DomUtil{
        constructor(data){
            super();
            const $station = $(data).find('station');
            this.stationId = $station.attr('id');
            this.stationName =  $station.find('name').eq(0).html();
            this.$prgs =  $station.find('progs');
        }

        init(){
            this.setColumnLen(7);
            DomFrame.setToolbarTitle(this.stationName, this.stationId);
            this.setGridCss();
            this.setGridCells();
            this.inputTabs();
            this.inputCards();
        }

        //これ本来はDomFrameに移譲するべきでは？
        inputTabs(){
            const opeM = this.currentM.clone();
            const tabBar = $('.mdl-layout__tab-bar');
            for (let i = 0; i < 7; i++) {
                const md = Util.getMDWithWeekDay(opeM);
                const $item = $('<a href="javascript: void(0)" class="mdl-layout__tab mdl-pre-upgrade" data-ymd="'+ opeM.format('YYYYMMDD') +'">'+ md +'</a>');
                if (opeM.day() === 0)
                    $item.addClass('holiday');
                tabBar.append($item);
                opeM.add(-1, 'd');
            }
            tabBar.find('.mdl-layout__tab').on('click', (e)=>{
                self.currentM = moment($(e).attr('data-ymd'), 'YYYYMMDD');
                conductor.changeDate();
                return false;//target == a href
            });
        }

        inputCards(){
            const opeM = this.currentM.clone();
            opeM.add(-7, 'd');
            for (let i = 0; i < 7; i++) {
                const $prg = this.$prgs.find('date:contains('+ opeM.format('YYYYMMDD') +')')
                    .parent().find('prog');
                this.inputEachCard($prg, 7-1-i, this.stationId);
                opeM.add(1, 'd');
            }
        }
    }

    class TimeTableDom extends DomUtil{
        constructor(data){
            super();
            this.$stations = $(data).find('stations station');
        }

        init(){
            this.setColumnLen(this.$stations.length);

            const toolbarTitle = Util.getMDWithWeekDay(this.currentM);
            DomFrame.setToolbarTitle(toolbarTitle);
            this.setGridCss();
            this.setGridCells();
            this.inputCards();
            domFrame.setOnClickPostGetPrg();
            Util.setElementAsMdl($(document));
        }

        inputCards() {
            console.log(this.$stations);
            const tabBar = $('.mdl-layout__tab-bar');
            const stationMenu = $('#station-menu');

            this.$stations.each((i, ele) => {
                const stationId = $(ele).attr('id');
                const name = $(ele).find('name').html();
                const progs = $(ele).find('progs');
                const ymd = progs.find('date').html();
                domFrame.currentM = moment(ymd, 'YYYYMMDD');
                // const canRec = $(ele).find('failed_record').html();

                //Tabbarの画像をセット
                const logoUrl = 'http://radiko.jp/station/logo/'+ stationId +'/logo_medium.png';
                const html = $(
                    '<a href="javascript: void(0)" class="mdl-layout__tab mdl-pre-upgrade" id="'+ stationId +'" data-name="'+ name +'">\n' +
                        '<img src="'+ logoUrl +'" alt="'+ name +'">\n' +
                    '</a>');
                tabBar.append(html);

                //menu作成
                const menuLi = $('<li class="mdl-menu__item mdl-pre-upgrade" station="'+ stationId +'" data-name="'+ name +'">'+ name +'</li>');
                stationMenu.append(menuLi);

                this.inputEachCard(progs.find('prog'), i, stationId);
            });
        }
    }

    class ProgramSearcherCustom extends ProgramSearcher {
        goSubmit(key){
            console.log('goSubmit');
            window.location.href = '../search/index.html?key='+key;
        }
    }
}();

















