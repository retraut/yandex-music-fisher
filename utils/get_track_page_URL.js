/* global yandex, utils */

(() => {
    'use strict';

    const getTrackPageUrl = trackId => {
        yandex.getTrack(trackId).then(json => {
            const track = json.track;
            const artists = utils.parseArtists(track.artists).artists.join(', ');
            let title = track.title;
            if (track.version) {
                title += ' (' + track.version + ')';
            }
            console.log(artists + ' - ' + title);
            if (track.error) {
                console.info(track.error);
                return;
            }
            track.albums.forEach(album => console.log(`${yandex.baseUrl()}/album/${album.id}/track/${trackId}`));
        }).catch(error => console.error(error));
    };

    window.getTrackPageUrl = getTrackPageUrl;

})();
