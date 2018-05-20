class DomUtil {
    constructor(data){
        this.data = data;
        this.columnWidth = 258;//px scssより引用
        this.columnLen = 0;
        this.$grid = $('#grid');
        this.moment = require('moment');
        this.currentM = this.moment($(this.data).find('srvtime'));
        if (this.currentM.hour() < 5)
            this.currentM.add(-1, 'd');
    }

    setGridCss(){
        let cells = '';
        for (let i = 0; i < this.columnLen; i++)
            cells += '.. ';
        const rowArea = "'"+ cells +"'";
        let str = '';
        for (let i = 0; i < 24; i++)
            str += rowArea;
        let columnsStr = this.columnWidth/2 + "px ";//時間軸
        for (let i = 0; i < this.columnLen; i++)
            columnsStr += (this.columnWidth + "px ");
        this.$grid.css('grid-template-areas', str)
            .css('grid-template-columns', columnsStr);
    }

    setGridCells(){
        //セル作成
        for (let i = 1; i < 25; i++) {
            for (let j = 1; j < this.columnLen+2/*時間軸の分*/; j++) {
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

    inputEachCard($prg, i, stationId){
        $prg.each((j, ele)=> {
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

            const startM = this.moment(ft, 'YYYYMMDDHHmmss');
            const endM = this.moment(to, 'YYYYMMDDHHmmss');
            const startHour = startM.hour();
            // const endHour = endM.hour();
            const timeStr = startM.format('HH:mm') + ' - '+endM.format('HH:mm');
            const durMin = Math.round(parseInt(durSec)/60);
            const $cardOrgin = $(
                '<div class="prg-card-w mdl-card shadow-sm mdl-button mdl-js-button mdl-pre-upgrade" style="flex-grow: '+ durMin +'" prgid="'+ id +'">\n'+
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
            if (stationId)
                $cardOrgin.attr('station', stationId);

            if (tsIn == 2) {
                $cardOrgin.addClass('cant-dl');
            }

            if (endM.diff(this.moment()) > 0) {
                $cardOrgin.addClass('pre-start');
            }

            let startOpe = startM.clone();
            let count = 0;
            while (true) {

                if (count > 5) {
                    console.log('count > 5');//todo エラー処理
                    break;
                }

                let cell;
                let $card = $cardOrgin.clone();
                const rowIndex = (startHour>=5 ? startHour-4 : startHour+24-4) + count;
                cell = this.$grid.find('.cell[column="'+ (i+2/*時間軸分と1始まり*/) +'"][row="'+ rowIndex +'"]');

                if (count > 0) {
                    DomUtil.fillInTopSpace(cell, $card);
                    $card.find('.prg-title').hide();
                    $card.find('.mdl-list__item-sub-title').hide();
                }

                $card.hover(function (){
                    $('.prg-card-w[prgid="'+ id +'"]').addClass("mouseover");
                }, function (){
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

                DomUtil.fillInBottomSpace(cell, $card);
            }
        });
    }

    setColumnLen(columnLen){
        this.columnLen = columnLen;
    }

    init(){
        throw ('this method must be override');
    }

    inputCards(){
        throw ('this method must be override');
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