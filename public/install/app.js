const $ = require('jquery');
const app = require('electron').remote.app;

window.eval = global.eval = function () {
    throw new Error(`Sorry, this app does not support window.eval().`)
};

$(()=>{
    const val = 'ver '+ app.getVersion();
    $('#version').html(val);
});