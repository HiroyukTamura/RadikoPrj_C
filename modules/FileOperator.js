module.exports = class FileExplorerOpener {
    constructor() {
        const Store = require('electron-store');
        this.exec = require('child_process').exec;
        this.store = new Store();
        this.path = this.store.get('output_path');
    }
    open(){
        console.log(this.path);
        const cd = this.exec('start .', {cwd: this.path});
        cd.on('error', function (err) {
            console.log(err);
            Sender.sendExplorerErr();
            sendError('ExplorerErr', err);
        });
        cd.on('close', function (err) {
            console.warn('close', err);
        });
        cd.stdout.on('data', data =>{
            console.log(data);
        });
        cd.stderr.on('data', data => {
            console.log(data);
        });
    }
};