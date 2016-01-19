/* global utils, storage */

(() => {
    'use strict';
    'use strong';

    const generateDownloadLink = info => {
        const salt = 'XGRlBW9FXlekgbPrRHuSiA';
        const md5 = window.md5(salt + info.path.substr(1) + info.s);
        return `https://${info.host}/get-mp3/${md5}/${info.ts + info.path}`;
    };

    const yandex = {};

    yandex.baseUrl = () => `https://music.yandex.${storage.current.domain}`;

    yandex.getTrackUrl = trackId => {
        const url = `${yandex.baseUrl()}/api/v2.0/handlers/track/${trackId}/download`;
        return utils.ajax(url, 'json', null)
            .then(info => utils.ajax(info.src + '&format=json', 'json', null))
            .then(generateDownloadLink);
    };

    yandex.getTrackOldUrl = storageDir => {
        const url = `https://storage.mds.yandex.net/download-info/${storageDir}/2?format=json`;
        return utils.ajax(url, 'json', null)
            .then(generateDownloadLink);
    };

    yandex.getTrack = trackId => {
        const url = `${yandex.baseUrl()}/handlers/track.jsx?track=${trackId}`;
        return utils.ajax(url, 'json', null);
    };

    yandex.getArtist = artistId => {
        const url = `${yandex.baseUrl()}/handlers/artist.jsx?artist=${artistId}&what=albums`;
        return utils.ajax(url, 'json', null);
    };

    yandex.getAlbum = albumId => {
        const url = `${yandex.baseUrl()}/handlers/album.jsx?album=${albumId}`;
        return utils.ajax(url, 'json', null);
    };

    yandex.getPlaylist = (username, playlistId) => {
        const url = `${yandex.baseUrl()}/handlers/playlist.jsx?owner=${username}&kinds=${playlistId}`;
        return utils.ajax(url, 'json', null)
            .then(json => json.playlist);
    };

    yandex.getLabel = labelId => {
        const url = `${yandex.baseUrl()}/handlers/label.jsx?sort=year&id=${labelId}`;
        return utils.ajax(url, 'json', null);
    };

    window.yandex = yandex;

})();
