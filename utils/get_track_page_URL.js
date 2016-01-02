/* global yandex, utils */

(() => {
    'use strict';

    let getTrackPageUrl = trackId => {
        yandex.getTrack(trackId).then(json => {
            let track = json.track;
            let artists = utils.parseArtists(track.artists).artists.join(', ');
            let title = track.title;
            if (track.version) {
                title += ' (' + track.version + ')';
            }
            console.log(artists + ' - ' + title);
            if (track.error) {
                console.info(track.error);
                return;
            }
            track.albums.forEach(album => console.log(`https://music.yandex.ru/album/${album.id}/track/${trackId}`));
        }).catch(error => console.error(error));
    };

    window.getTrackPageUrl = getTrackPageUrl;

})();
