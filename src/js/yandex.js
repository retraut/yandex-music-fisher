/* global fisher */

const md5 = require('blueimp-md5');
const options = {
    redirect: 'error',
    credentials: 'include'
};

class yandex {

    static get baseUrl() {
        return `https://music.yandex.${fisher.storage.current.domain}`;
    }

    static getTrackUrl(trackId) {
        const url = `${this.baseUrl}/api/v2.0/handlers/track/${trackId}/download/m?hq=1`;

        return fetch(url, options)
            .then(fisher.utils.parseJsonResponse)
            .then((info) => fetch(`${info.src}&format=json`, options))
            .then(fisher.utils.parseJsonResponse)
            .then((info) => {
                const salt = 'XGRlBW9FXlekgbPrRHuSiA';
                const hash = md5(salt + info.path.substr(1) + info.s);

                return `https://${info.host}/get-mp3/${hash}/${info.ts + info.path}`;
            });
    }

    static getTrack(trackId) {
        const url = `${this.baseUrl}/handlers/track.jsx?track=${trackId}`;

        return fetch(url, options)
            .then(fisher.utils.parseJsonResponse);
    }

    static getArtist(artistId) {
        const url = `${this.baseUrl}/handlers/artist.jsx?artist=${artistId}&what=albums`;

        return fetch(url, options)
            .then(fisher.utils.parseJsonResponse);
    }

    static getAlbum(albumId) {
        const url = `${this.baseUrl}/handlers/album.jsx?album=${albumId}`;

        return fetch(url, options)
            .then(fisher.utils.parseJsonResponse);
    }

    static getPlaylist(username, playlistId) {
        const url = `${this.baseUrl}/handlers/playlist.jsx?owner=${username}&kinds=${playlistId}`;

        return fetch(url, options)
            .then(fisher.utils.parseJsonResponse)
            .then((json) => json.playlist);
    }

    static getLabel(labelId) {
        const url = `${this.baseUrl}/handlers/label.jsx?sort=year&id=${labelId}`;

        return fetch(url, options)
            .then(fisher.utils.parseJsonResponse);
    }
}

module.exports = yandex;
