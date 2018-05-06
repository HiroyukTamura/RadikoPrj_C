console.log('js読み込み');

window.onload = function() {
    console.log('onload');
    const tabBar = $('.mdl-layout__tab-bar');
    const timeBar = $('.column-head');
    $('.mdl-layout__content').scroll(function () {
        console.log('スクロール発火');
        const left = $(this).scrollLeft();
        const top = $(this).scrollTop();
        tabBar.scrollLeft(left);
        timeBar.css('top', -top+56+48);
        //x軸方向にスクロール
    });
};