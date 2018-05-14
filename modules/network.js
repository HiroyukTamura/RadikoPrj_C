class ProgramListGetter {
    constructor(requestM){
        this.ymd = requestM.format('YYYYMMDD');
        this.URL = null;
    }

    setStationUrl(stationId){
        this.URL = 'http://radiko.jp/v3/program/weekly/'+ stationId + '.xml';
        return this;
    }

    setAreaUrl(areaId){
        this.URL = 'http://radiko.jp/v3/program/date/'+ this.ymd +'/'+ areaId + '.xml';
        return this;
    }

    request(){
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.URL,
            }).done((data, textStatus, jqXHR) => {
                resolve(data);
            }).fail((jqXHR, textStatus, errorThrown) => {
                console.log('fail', jqXHR.status, textStatus);
                reject(errorThrown);
            });
        });
    }
}

class EreaChecker {
    constructor(){
        this.URL = 'http://radiko.jp/area';
    }

    check(){
        return new Promise((resolve, reject) => {
            $.ajax({
                url: this.URL,
                cache: false,
            }).done((data, textStatus, jqXHR) => {
                try {
                    const html = $(data.split("'")[1]);
                    const erea = html.attr('class');
                    resolve(erea);
                } catch (e) {
                    reject(e);
                }
            })
                .fail((jqXHR, textStatus, errorThrown) => {
                    console.log('fail', jqXHR.status, textStatus);
                    reject(errorThrown);
                });
        });
    }
}