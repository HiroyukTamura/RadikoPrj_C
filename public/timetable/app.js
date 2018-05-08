console.log('js読み込み');

window.onload = function() {
    console.log('onload');
    const domFrame = new DomFrame();
    domFrame.init();
    const self = this;

    const ereaChecker = new EreaChecker();
    ereaChecker.check().then((ereaId => {
        return new ProgramListGetter(ereaId).request();
    })).then((data) => {
        new TimeTableDom(data).init();
        domFrame.scrollTopOffset();
    }).catch(err => {
        //todo エラー処理
        console.log(err);
    });
};

class DomFrame {
    constructor(){
        this.tabBar = $('.mdl-layout__tab-bar');
        this.$root =  $('.mdl-layout__content');
        this.$header = $('#header-table-out > span');
        this.headerWid = this.$header.width()/2;
        this.$footer = $('#footer-table-out > span');
        this.footerWid = this.$footer.width()/2;
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
        this.$header.css('left', offset - this.headerWid);
        this.$footer.css('left', offset - this.footerWid);
    }

    scrollTopOffset(){
        this.$root.scrollTop(72);
    }
}

class ProgramListGetter {
    constructor(ereaId){
        const ymd = new moment().format('YYYYMMDD');
        this.URL = 'http://radiko.jp/v3/program/date/'+ ymd +'/'+ ereaId + '.xml';
    }

    request(){
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.URL,
            }).done((data, textStatus, jqXHR) => {
                resolve(data);
            })
            .fail((jqXHR, textStatus, errorThrown) => {
                console.log('fail', jqXHR.status, textStatus);
                reject(errorThrown);
            })
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
    }

    init(){
        this.setGridCss();
        this.setGridCells();
        this.inputCards();
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

        this.$stations.each((i, ele) => {
            const id = $(ele).attr('id');
            const name = $(ele).find('name').html();
            const progs = $(ele).find('progs');
            const ymd = progs.find('date').html();
            const canRec = $(ele).find('failed_record').html();
            if (canRec != 0)
                console.log(canRec);

            const logoUrl = 'https://radiko.jp/v2/static/station/logo/'+ id +'/lrtrim/224x100.png';/*todo urlを決め打ちしているので、url変更時にロゴ取得失敗の可能性*/
            const html = $(
                '<a href="#" class="mdl-layout__tab" id="'+ id +'">\n' +
                    '<img src="'+ logoUrl +'" alt="'+ name +'">\n' +
                '</a>');
            tabBar.append(html);

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

                const startM = moment(ft, 'YYYYMMDDHHmmss');
                const endM = moment(to, 'YYYYMMDDHHmmss');
                const startHour = startM.hour();
                const endHour = endM.hour();
                const timeStr = startM.format('HH:mm') + ' - '+endM.format('HH:mm');
                const durMin = Math.round(parseInt(durSec)/60);
                const $cardOrgin = $(
                    '<div class="prg-card-w mdl-card shadow-sm mdl-button mdl-js-button" style="flex-grow: '+ durMin +'" prgid="'+ id +'">\n'+
                        '<div class="top"></div>\n'+
                        '<li class="mdl-list__item mdl-list__item--two-line">\n'+
                            '<span class="mdl-list__item-primary-content">\n'+
                            '<span class="prg-title">'+ title +'</span>\n'+
                            '<span class="mdl-list__item-sub-title">'+ timeStr +'</span>\n'+
                            '</span>\n'+
                        '</li>\n'+
                        '<div class="bottom"></div>\n'+
                    '</div>'
                );
                // let rowIndex = startHour-5+1;//1始まり
                // if (rowIndex<0)
                //     rowIndex += 24;
                // const cell = this.$grid.find('.cell[column="'+ (i+2/*時間軸分と1始まり*/) +'"][row="'+ rowIndex +'"]');
                // cell.append(cardHtml);

                // if (endHour !== startHour) {
                //     cell.css('padding-bottom', 0);
                // }
                // let limit = (endHour<5 ? endHour : endHour+24) - startHour;
                // for (let k = 1; k < limit; k++) {
                //     const cellExtra = this.$grid.find('.cell[column="'+ (i+2/*時間軸分と1始まり*/) +'"][row="'+ (rowIndex+k) +'"]');
                //     cell.css('padding-top', 0);
                // }

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