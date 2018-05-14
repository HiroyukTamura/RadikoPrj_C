'use strict';

!function(){
    window.jQuery = window.$= require("jquery");
    require('bootstrap');
    const ipcRenderer = require('electron').ipcRenderer;
    const dialogPolyfill = require('dialog-polyfill');
    const circleProgress = require('jquery-circle-progress');
    const notify = require('bootstrap-notify');
    const moment = require('moment');/*グローバルに定義してはいけない??*/
    let ereaChecker;
    let domFrame;
    let conductor;
    let searcher;
    let ipcConn;

    window.onload = function() {
        console.log('onload');
        ipcConn = new ProcessCommunicator();
        ereaChecker = new EreaChecker();
        domFrame = new DomFrame();
        conductor = new OperationConductor();
        searcher = new ProgramSearcherCustom();

        conductor.initialOperate();
        window.onclick = function (e) {
            console.log('Im clicked' , e.clientX, e.clientY);
            // searcher.onClickWindow(event);
            if (domFrame.$dialog.prop('open')) {
                const rect = domFrame.$dialog[0].getBoundingClientRect();
                if (!(rect.left < e.clientX && e.clientX < rect.right && rect.bottom > e.clientY && e.clientY > rect.top)) {
                    domFrame.$dialog[0].close();
                    return false;
                }
                return true;
            }
            const $clickedEle = searcher.$dropDown.find('.mouseover');
            if ($clickedEle.length) {
                searcher.resetSuggestion($clickedEle.html());
                return false;
            }
            return true;
        };
    };

    class OperationConductor{
        initialOperate(){
            domFrame.init();
            ereaChecker.check().then((ereaId => {
                return new ProgramListGetter(ereaId, domFrame.currentM).request();
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
            domFrame.updateDateMenu();
            ereaChecker.check().then((ereaId => {
                localStorage.setItem('ereaId', ereaId);
                return new ProgramListGetter(ereaId, domFrame.currentM).request();
            })).then((data) => {
                new TimeTableDom(data).init();
                domFrame.setOnCardClickListener();
                domFrame.show();
            }).catch(err => {
                //todo エラー処理
                console.log(err);
            });
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

        show(){
            this.$spinner.removeClass('is-active');
            this.$timeTable.show();
            $('.mdl-layout__tab').show();
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
            $('#station-menu .mdl-menu__item').on('click', function () {
                console.log($(this).attr('station'));
                if (!$(this).prop('disabled'))
                    $(this).parents('.mdl-menu__container').removeClass('is-visible');
            });
            Util.setDialogListeners(this.$dialog[0]);
            $('#dl-btm').on('click', function () {
                self.$dialog[0].close();
                //todo ダウンロード！！
                const ft = self.$dialog.attr('ft');
                const stationId = self.$dialog.attr('station');
                const title = self.$dialog.attr('data-title');
                ProcessCommunicator.callDL(ft, stationId, title);
            });
            // this.$dialog[0].addEventListener('close', function(e) {
            //     if (this.returnValue === 'download') {
            //         console.log('download');
            //     }
            //     return false;
            // });
            // $('#dl-btm').on('click', function () {
            //     self.$dialog[0].close();
            // });
            // $('.cancel-btn').on('click', function () {
            //     self.$dialog[0].close();
            // });
        }

        initDateMenu(){
            const momentOpe = domFrame.currentM.clone();

            for (let i = 0; i < 7; i++) {
                let val = momentOpe.format('M/D') +'('+ Util.getWeekDays()[momentOpe.day()] +')';
                const menuLi = $('<li class="mdl-menu__item mdl-pre-upgrade" date="'+ momentOpe.format('YYYYMMDD') +'">'+ val +'</li>');
                if (i === 0)
                    menuLi.addClass('current')
                        .attr('disabled', true);
                this.$calendarMenu.prepend(menuLi);
                momentOpe.add(-1, 'd');
            }
        }

        updateDateMenu(){
            console.log(domFrame.currentM.format('YYYYMMDD'));
            this.$calendarMenu.find('.mdl-menu__item.current').removeAttr("disabled").removeClass('current');
            const currentLi = this.$calendarMenu.find('.mdl-menu__item[date="'+ domFrame.currentM.format('YYYYMMDD') +'"]')
                .addClass('current')
                .attr('disabled', true);
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
                    .attr('data-title', html);

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
                } else if (moment(to, 'YYYYMMDDhhmmss').diff(moment())){
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

    class ProgramListGetter {
        constructor(ereaId, requestM){
            const ymd = requestM.format('YYYYMMDD');
            this.URL = 'http://radiko.jp/v3/program/date/'+ ymd +'/'+ ereaId + '.xml';
        }

        request(){
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: this.URL,
                }).done((data, textStatus, jqXHR) => {
                    resolve(data);
                }).fail((jqXHR, textStatus, errorThrown) => {
                        console.log('fail', jqXHR.status, textStatus);
                        reject(errorThrown);
                });
            });
        }
    }

    class EreaChecker {
        constructor(){
            this.URL = 'http://radiko.jp/area';
        }

        check(){
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: this.URL,
                    cache: false,
                }).done((data, textStatus, jqXHR) => {
                    try {
                        const html = $(data.split("'")[1]);
                        const erea = html.attr('class');
                        resolve(erea);
                    } catch (e) {
                        reject(e);
                    }
                })
                    .fail((jqXHR, textStatus, errorThrown) => {
                        console.log('fail', jqXHR.status, textStatus);
                        reject(errorThrown);
                    });
            });
        }
    }

    class TimeTableDom {
        constructor(data){
            this.data = data;
            this.columnWidth = 258;//px scssより引用
            this.$stations = $(data).find('stations station');
            this.$grid = $('#grid');
            // this.$dialog = $('.mdl-dialog');
        }

        init(){
            this.setGridCss();
            this.setGridCells();
            this.inputCards();
            Util.setElementAsMdl($(document));
        }

        setGridCss(){
            let cells = '';
            for (let i = 0; i < this.$stations.length; i++)
                cells += '.. ';
            const rowArea = "'"+ cells +"'";
            let str = '';
            for (let i = 0; i < 24; i++)
                str += rowArea;

            let columnsStr = this.columnWidth/2 + "px ";//時間軸
            for (let i = 0; i < this.$stations.length; i++)
                columnsStr += (this.columnWidth + "px ");
            this.$grid.css('grid-template-areas', str)
                .css('grid-template-columns', columnsStr);
        }

        setGridCells() {
            //セル作成
            for (let i = 1; i < 25; i++) {
                for (let j = 1; j < this.$stations.length+2/*時間軸の分*/; j++) {
                    let cell;
                    if (j === 1) {
                        let time = i+4;
                        if (time < 10)
                            time = 0 + time.toString();
                        const val = '<div class="time">'+ time +'</div>';
                        cell = '<div class="cell item--hour'+ time +'" row="'+ i +'" column="'+ j +'" style="grid-row:'+ i +' / span 1; grid-column:'+ j +'/ span 1;">'+ val +'</div>';
                    } else
                        cell = '<div class="cell" row="'+ i +'" column="'+ j +'" style="grid-row:'+ i +' / span 1; grid-column:'+ j +'/ span 1;"></div>';
                    this.$grid.append(cell);
                }
            }
        }

        inputCards() {
            console.log(this.$stations);
            const tabBar = $('.mdl-layout__tab-bar');
            const stationMenu = $('#station-menu');
            const self = this;

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
                    '<a href="#" class="mdl-layout__tab mdl-pre-upgrade" id="'+ stationId +'">\n' +
                        '<img src="'+ logoUrl +'" alt="'+ name +'">\n' +
                    '</a>');
                tabBar.append(html);

                //menu作成
                const menuLi = $('<li class="mdl-menu__item mdl-pre-upgrade" station="'+ stationId +'">'+ name +'</li>');
                stationMenu.append(menuLi);

                progs.find('prog').each((j, ele)=> {
                    const id = $(ele).attr('id');
                    const ft = $(ele).attr('ft');
                    const to = $(ele).attr('to');
                    const durSec = $(ele).attr('dur');
                    const title = $(ele).find('title').html();
                    const url = $(ele).find('url').html();
                    const info = $(ele).find('info').html();
                    const desc = $(ele).find('desc').html();
                    const pfm = $(ele).find('pfm').html();
                    const img = $(ele).find('img').html();
                    const tsIn = $(ele).find('ts_in_ng').html();

                    const startM = moment(ft, 'YYYYMMDDHHmmss');
                    const endM = moment(to, 'YYYYMMDDHHmmss');
                    const startHour = startM.hour();
                    // const endHour = endM.hour();
                    const timeStr = startM.format('HH:mm') + ' - '+endM.format('HH:mm');
                    const durMin = Math.round(parseInt(durSec)/60);
                    const $cardOrgin = $(
                        '<div class="prg-card-w mdl-card shadow-sm mdl-button mdl-js-button mdl-pre-upgrade" style="flex-grow: '+ durMin +'" prgid="'+ id +'" station="'+ stationId +'">\n'+
                            '<div class="top"></div>\n'+
                            '<li class="mdl-list__item mdl-list__item--two-line mdl-pre-upgrade">\n'+
                                '<span class="mdl-list__item-primary-content mdl-pre-upgrade">\n'+
                                '<span class="prg-title">'+ title +'</span>\n'+
                                '<span class="mdl-list__item-sub-title">'+ timeStr +'</span>\n'+
                                '</span>\n'+
                            '</li>\n'+
                            '<div class="bottom"></div>\n'+
                            '<div class="info_group">\n'+
                                '<span class="url">'+ url +'</span>\n'+
                                '<span class="info">'+ info +'</span>\n'+
                                '<span class="desc">'+ desc +'</span>\n'+
                                '<span class="pfm">'+ pfm +'</span>\n'+
                                '<span class="img">'+ img +'</span>\n'+
                                '<span class="ft">'+ ft +'</span>\n'+
                                '<span class="to">'+ to +'</span>\n'+
                            '</div>\n'+
                        '</div>'
                    );
                    if (tsIn == 2) {
                        $cardOrgin.addClass('cant-dl');
                    }

                    if (endM.diff(moment()) > 0) {
                        $cardOrgin.addClass('pre-start');
                    }

                    let startOpe = startM.clone();
                    let count = 0;
                    while (true) {

                        if (count > 5) {
                            console.log('count > 10');//todo エラー処理
                            break;
                        }

                        let cell;
                        let $card = $cardOrgin.clone();
                        const rowIndex = (startHour>=5 ? startHour-4 : startHour+24-4) + count;
                        cell = this.$grid.find('.cell[column="'+ (i+2/*時間軸分と1始まり*/) +'"][row="'+ rowIndex +'"]');

                        if (count > 0) {
                            TimeTableDom.fillInTopSpace(cell, $card);
                            $card.find('.prg-title').hide();
                            $card.find('.mdl-list__item-sub-title').hide();
                        }

                        $card.hover(function () {
                            $('.prg-card-w[prgid="'+ id +'"]').addClass("mouseover");
                        }, function () {
                            $('.prg-card-w[prgid="'+ id +'"]').removeClass("mouseover");
                        });

                        if (startM.hour() === endM.hour()) {
                            //ex. 12:00 ⇒ 12:40
                            $card.css('flex-grow', durMin%60);
                            cell.append($card);
                            break;
                        } else if(startOpe.hour() === endM.hour()) {
                            //ex. 12:00(StartOpe)⇒ 12:40
                            $card.css('flex-grow', endM.diff(startOpe, 'minutes'));
                            cell.append($card);
                            break;
                        } else if ((endM.hour() - startOpe.hour() === 1 && startOpe.minute() === 0 && endM.minute() === 0)
                            || (endM.day() - startOpe.day() === 1 && endM.hour()+24 - startOpe.hour() === 1 && startOpe.minute() === 0 && endM.minute() === 0)) {
                            //ex. 10:00(StartOpe) ⇒ 11:00 || 23:00 ⇒ 24:00
                            $card.css('flex-grow', 1);
                            cell.append($card);
                            break;
                        } else if (startOpe.minute() === 0 && endM.diff(startOpe, 'minutes') > 60) {
                            //ex. 10:00(StartOpe) ⇒ 12:30
                            $card.css('flex-grow', 1);
                            cell.append($card);
                        } else if ((endM.hour() - startOpe.hour() === 1 && endM.minute() === 0)
                            || (endM.day() - startOpe.day() === 1 && endM.hour()+24 - startOpe.hour() === 1 && endM.minute() === 0)){
                            //ex. 11:20(StartOpe) ⇒ 12:00 || 23:55 ⇒ 0:00
                            $card.css('flex-grow', endM.diff(startOpe, 'minutes'));
                            cell.append($card);
                            break;
                        } else {
                            //ex. 10:30(StartOpe)⇒ 12:30
                            let restMin = 60 - startOpe.minute();
                            $card.css('flex-grow', restMin);
                            cell.append($card);
                        }

                        startOpe.minute(0);
                        startOpe.add(1, 'hour');

                        count++;

                        TimeTableDom.fillInBottomSpace(cell, $card);
                    }
                });
            });
        }

        static fillInBottomSpace(cell, card){
            cell.css('padding-bottom', 0);
            card.css('margin-bottom', 0)
                .css('border-bottom-left-radius', 0)
                .css('border-bottom-right-radius', 0);
        }

        static fillInTopSpace(cell, card) {
            cell.css('padding-top', 0);
            card.css('margin-top', 0)
                .css('border-top-left-radius', 0)
                .css('border-top-right-radius', 0);
        }
    }

    class ProgramSearcherCustom extends ProgramSearcher {
        goSubmit(key){
            console.log('goSubmit');
            window.location.href = '../search/index.html?key='+key;
        }
    }
}();

















