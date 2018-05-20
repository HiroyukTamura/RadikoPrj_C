module.exports = class FileExplorerOpener {
    constructor(sender) {
        this.sender = sender;
        const Store = require('electron-store');
        this.exec = require('child_process').exec;
        this.store = new Store();
        this.path = this.store.get('output_path');
    }

    open(){
        console.log(this.path);
        const cd = this.exec('start .', {cwd: this.path});
        cd.on('error', (err) => {
            console.log(err);
            if (!this.sender)
                return;
            this.sender.sendExplorerErr();
            this.sender.sendErrorLog(err, 'open', this.constructor.name);
        });
        cd.on('close', err => {
            console.warn('close', err);
        });
        cd.stdout.on('data', data => {
            console.log(data);
        });
        cd.stderr.on('data', data => {
            console.log(data);
        });
    }
};