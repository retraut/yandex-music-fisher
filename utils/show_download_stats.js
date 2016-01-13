(() => {
    'use strict';

    function parseResponse(response) {
        if (!response.ok) {
            throw new Error(`${response.status} (${response.statusText})`);
        }
        return response.json();
    }

    fetch('https://api.github.com/repos/egoroof/yandex-music-fisher/releases')
        .then(parseResponse)
        .then(releases => {
            console.log('GitHub statistics');
            let totalDownloadCount = 0;
            releases.forEach(release => {
                console.log(release.name, release.assets[0].download_count);
                totalDownloadCount += release.assets[0].download_count;
            });
            console.log('total', totalDownloadCount);
        }).catch(e => console.error(e));

    fetch('https://bitbucket.org/api/2.0/repositories/egoroof/yandex-music-fisher/downloads')
        .then(parseResponse)
        .then(info => {
            console.log('Bitbucket statistics');
            let totalDownloadCount = 0;
            info.values.forEach(download => {
                console.log(download.name, download.downloads);
                totalDownloadCount += download.downloads;
            });
            console.log('total', totalDownloadCount);
        }).catch(e => console.error(e));

})();
