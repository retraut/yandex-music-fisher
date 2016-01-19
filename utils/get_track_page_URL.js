/* global yandex, utils */

(() => {
    'use strict';
    'use strong';

    const getTrackPageUrl = trackId => {
        yandex.getTrack(trackId).then(json => {
            const track = json.track;
            if ('error' in track) {
                console.info(track.error);
                return;
            }
            const artists = utils.parseArtists(track.artists).artists.join(', ');
            let title = track.title;
            if ('version' in track) {
                title += ' (' + track.version + ')';
            }
            console.log(artists + ' - ' + title);
            track.albums.forEach(album => console.log(`${yandex.baseUrl()}/album/${album.id}/track/${trackId}`));
        }).catch(error => console.error(error));
    };

    window.getTrackPageUrl = getTrackPageUrl;

})();
