window.onload = function() {
    const tabBar = $('.mdl-layout__tab-bar');
    $('.page-content').scroll(function () {
        const left = $(this).scrollLeft();
        tabBar.scrollLeft(left);
    });
};