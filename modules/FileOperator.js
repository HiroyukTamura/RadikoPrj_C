module.exports = class FileExplorerOpener {
    open(){
        const cd = exec('explorer');
        cd.on('error', function (err) {
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