const $ = require('jquery');
const app = require('electron').remote.app;
const IpcConn = require('../../modules/IpcClient');
const IpcRenderer = require('electron').ipcRenderer;

window.eval = global.eval = function () {
    throw new Error(`Sorry, this app does not support window.eval().`)
};

$(()=>{
    const $progress = $('#progress');
    const $span = $('#prg-msg span');
    IpcRenderer.on('dlInstallerPrg', (event, percent) =>{
        $span.html('ChromeInstallerをダウンロードしています...' + percent + '%');
        $progress[0].MaterialProgress.setProgress(percent);
    }).on('UnzipInstallPrg', (event, percent) =>{
        $span.html('RadiCutを初期化しています...'+ percent +'%');
        $progress[0].MaterialProgress.setProgress(percent);
    });
    const val = 'ver '+ app.getVersion();
    $('#version').html(val);
});