'use strict';

!function () {
    let conductor;
    let searchDom;
    window.onload = function () {
        conductor = new Conductor();
        conductor.init();
        searchDom = new SearchDom();
        searchDom.initializeSearchBar();
    };

    class Conductor {
        init(){
            this.currentM = moment();
        }
    }

    class SearchDom {
        constructor(){
            this.$dateMenuItem =$('#dp-ul .mdl-menu__item');
            this.$menuContainer = $('#date-form .mdl-menu__container');
            this.$dateInput =$('#date-input');
            this.$keyInput =$('#keyword');
            this.$dpBtn = $('#dp-btn');
            this.momentOpe = conductor.currentM.clone();
        }

        initializeSearchBar(){
            this.initDateMenu();
            this.initKeyInput();
            this.setOnClickBtnListener();
        }

        initDateMenu(){
            const self = this;
            this.momentOpe.add(-6, 'd');
            for (let i = 0; i < 7; i++) {
                let val = this.momentOpe.format('M/D') +'('+ Util.getWeekDays()[this.momentOpe.day()] +')';
                const ymd = this.momentOpe.format('YYYYMMDD');
                this.$dateMenuItem.eq(i+1/*「全て」の分*/).attr('date', ymd).html(val);
                this.momentOpe.add(1, 'd');
            }
            this.$dateMenuItem.on('click', function () {
                self.$menuContainer.removeClass('is-visible');
                self.$menuContainer.find('.is-selected')
                    .removeAttr('disabled')
                    .removeClass('is-selected');
                $(this).attr('disabled', true).addClass('is-selected');
                self.$dateInput.val($(this).html());
            });
            this.$dateInput.on('click', function () {
                self.$dpBtn.click();
                return false;
            });
        }

        initKeyInput(){
            let isFirst = false;
            this.$keyInput.on('keyup', function(){
                if (!isFirst) {
                    $(this).attr('required', 'required');
                    isFirst = true;
                }
                if (!$(this).val().length) {
                    console.log('こっち');
                    return false;
                }
            });
        }

        setOnClickBtnListener(){
            $('#first-row .btn').on('click', _=>{
                const val = this.$keyInput.val();
                if (!val.length)
                    return false;

            });
        }
    }

    class requestSearch{
        constructor(){

        }

        request(key, startDay){
            const url = 'http://radiko.jp/v3/api/program/search?' +
                'key=' + encodeURIComponent(key) +
                '&filter=&start_day=&end_day=&area_id=JP13&region_id=&cul_area_id=JP13&page_idx=&uid=7a29be9fb88934c2e749de20750b1de3&row_limit=12&app_id=pc&action_id=1&action_rank=1'
        }
    }
}();