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
            this.$dateMenuItem.on('click', _=> {
                this.$menuContainer.removeClass('is-visible');
                this.$menuContainer.prop('disabled', true);
                this.$dateInput.val($(this).html());
            });
            this.$dateInput.on('click', function () {
                self.$dateMenuItem.trigger('click');
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
                if (!val.length) {
                    return false;
                }
            });
        }
    }
}();