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
            this.$keyInput =$('#keyword');
            this.momentOpe = conductor.currentM.clone();
        }

        initializeSearchBar(){
            this.initDateMenu('#dp-ul .mdl-menu__item', '#date-form .mdl-menu__container', '#date-input', '#dp-btn');
            this.momentOpe.add(-1, 'd');
            this.initDateMenu('#end-dp-ul .mdl-menu__item', '#end-form .mdl-menu__container', '#end-input', '#end-dp-btn');
            this.initKeyInput();
            this.setOnClickBtnListener();
        }

        initDateMenu(menuItemSel, menuContSel, inputSel, btnSel){
            const $dateMenuItem =$(menuItemSel);
            const $menuContainer = $(menuContSel);
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

            $dateMenuItem.on('click', function () {
                $menuContainer.removeClass('is-visible')
                    .find('.is-selected')
                    .removeAttr('disabled')
                    .removeClass('is-selected');
                $(this).attr('disabled', true)
                    .addClass('is-selected');
                $dateInput.val($(this).html());
            });
            $dateInput.on('click', function () {
                $dpBtn.click();
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