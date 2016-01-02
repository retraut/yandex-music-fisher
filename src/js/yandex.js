/* global utils, storage, ga */

(() => {
    'use strict';

    let yandex = {};

    yandex.baseUrl = () => `https://music.yandex.${storage.current.domain}`;

    yandex.getTrackUrl = trackId => {
        let url = `${yandex.baseUrl()}/api/v2.0/handlers/track/${trackId}/download`;
        return utils.ajax(url, 'json').then(json => {
            if (json.codec !== 'mp3') {
                ga('send', 'event', 'test', json.codec + ' codec', trackId);
            }
            if (json.gain) {
                ga('send', 'event', 'test', 'gain', trackId);
            }
            return utils.ajax(json.src + '&format=json', 'json');
        }).then(json => {
            let salt = 'XGRlBW9FXlekgbPrRHuSiA';
            let md5 = window.md5(salt + json.path.substr(1) + json.s);
            return 'https://' + json.host + '/get-mp3/' + md5 + '/' + json.ts + json.path;
        });
    };

    yandex.getTrackOldUrl = storageDir => {
        let url = `https://storage.mds.yandex.net/download-info/${storageDir}/2?format=json`;
        return utils.ajax(url, 'json').then(json => {
            let salt = 'XGRlBW9FXlekgbPrRHuSiA';
            var md5 = window.md5(salt + json.path.substr(1) + json.s);
            return 'https://' + json.host + '/get-mp3/' + md5 + '/' + json.ts + json.path;
        });
    };

    yandex.getTrack = trackId => {
        let url = `${yandex.baseUrl()}/handlers/track.jsx?track=${trackId}`;
        return utils.ajax(url, 'json');
    };

    yandex.getArtist = artistId => {
        let url = `${yandex.baseUrl()}/handlers/artist.jsx?artist=${artistId}&what=albums`;
        return utils.ajax(url, 'json');
    };

    yandex.getAlbum = albumId => {
        let url = `${yandex.baseUrl()}/handlers/album.jsx?album=${albumId}`;
        return utils.ajax(url, 'json');
    };

    yandex.getPlaylist = (username, playlistId) => {
        let url = `${yandex.baseUrl()}/handlers/playlist.jsx?owner=${username}&kinds=${playlistId}`;
        return utils.ajax(url, 'json').then(json => json.playlist);
    };

    yandex.getLabel = labelId => {
        let url = `${yandex.baseUrl()}/handlers/label.jsx?sort=year&id=${labelId}`;
        return utils.ajax(url, 'json');
    };

    window.yandex = yandex;

})();
