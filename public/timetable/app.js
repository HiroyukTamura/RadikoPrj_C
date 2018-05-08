console.log('js読み込み');

window.onload = function() {
    console.log('onload');
    const tabBar = $('.mdl-layout__tab-bar');
    $('.mdl-layout__content').scroll(function () {
        console.log('スクロール発火');
        const left = $(this).scrollLeft();
        tabBar.scrollLeft(left);
        //x軸方向にスクロール
    });

    const ereaChecker = new EreaChecker();
    ereaChecker.check().then((ereaId => {
        return new ProgramListGetter(ereaId).request();
    })).then((data) => {
        new TimeTableDom(data).init();
    }).catch(err => {
        //todo エラー処理
        console.log(err);
    })
};

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
        this.$stations.each((i, ele) => {
            const id = $(ele).attr('id');
            const name = $(ele).find('name').html();
            const progs = $(ele).find('progs');
            const ymd = progs.find('date').html();
            const canRec = $(ele).find('failed_record');
            if (canRec != 0)
                console.log(canRec);
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
                const timeStr = startM.format('HH:mm') + ' - '+endM.format('HH:mm');
                const durMin = Math.round(parseInt(durSec)/60);
                const cardHtml = $(
                    '<div class="prg-card-w mdl-card shadow-sm rounded mdl-button mdl-js-button" style="flex-grow: '+ durMin +'">\n'+
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
                let rowIndex = startM.hour()-5+1;//1始まり
                if (rowIndex<0)
                    rowIndex += 24;
                const cell = this.$grid.find('.cell[column="'+ (i+2/*時間軸分と1始まり*/) +'"][row="'+ rowIndex +'"]');
                cell.append(cardHtml);

                // for (let k = 0; k < endM.diff(startM, 'hours')+1; k++) {
                //
                // }
            });
        });
    }
}