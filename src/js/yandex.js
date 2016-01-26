/* global fisher */

const md5 = require('blueimp-md5');
const options = {
    redirect: 'error',
    credentials: 'include'
};

function generateDownloadLink(info) {
    const salt = 'XGRlBW9FXlekgbPrRHuSiA';
    const hash = md5(salt + info.path.substr(1) + info.s);

    return `https://${info.host}/get-mp3/${hash}/${info.ts + info.path}`;
}

class Yandex {

    constructor(domain = 'ru') {
        this.setDomain(domain);
    }

    setDomain(domain = 'ru') {
        this.baseUrl = `https://music.yandex.${domain}`;
    }

    getTrackUrl(trackId) {
        const url = `${this.baseUrl}/api/v2.0/handlers/track/${trackId}/download`;

        return fetch(url, options)
            .then(fisher.utils.parseJsonResponse)
            .then((info) => fetch(`${info.src}&format=json`, options))
            .then(fisher.utils.parseJsonResponse)
            .then(generateDownloadLink);
    }

    getTrackOldUrl(storageDir) {
        const url = `https://storage.mds.yandex.net/download-info/${storageDir}/2?format=json`;

        return fetch(url, options)
            .then(fisher.utils.parseJsonResponse)
            .then(generateDownloadLink);
    }

    getTrack(trackId) {
        const url = `${this.baseUrl}/handlers/track.jsx?track=${trackId}`;

        return fetch(url, options)
            .then(fisher.utils.parseJsonResponse);
    }

    getArtist(artistId) {
        const url = `${this.baseUrl}/handlers/artist.jsx?artist=${artistId}&what=albums`;

        return fetch(url, options)
            .then(fisher.utils.parseJsonResponse);
    }

    getAlbum(albumId) {
        const url = `${this.baseUrl}/handlers/album.jsx?album=${albumId}`;

        return fetch(url, options)
            .then(fisher.utils.parseJsonResponse);
    }

    getPlaylist(username, playlistId) {
        const url = `${this.baseUrl}/handlers/playlist.jsx?owner=${username}&kinds=${playlistId}`;

        return fetch(url, options)
            .then(fisher.utils.parseJsonResponse)
            .then((json) => json.playlist);
    }

    getLabel(labelId) {
        const url = `${this.baseUrl}/handlers/label.jsx?sort=year&id=${labelId}`;

        return fetch(url, options)
            .then(fisher.utils.parseJsonResponse);
    }
}

module.exports = Yandex;
