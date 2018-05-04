window.onload = function() {
    const tabBar = $('.mdl-layout__tab-bar');
    const timeBar = $('.column-head');
    $('.mdl-layout__content').scroll(function () {
        const left = $(this).scrollLeft();
        const top = $(this).scrollTop();
        tabBar.scrollLeft(left);
        timeBar.scrollTop(top);
        //x軸方向にスクロール
    });
};