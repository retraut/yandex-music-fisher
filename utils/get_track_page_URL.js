/* global fisher */

(() => {
    'use strict';
    'use strong';

    function getTrackPageUrl(trackId) {
        fisher.yandex.getTrack(trackId).then(json => {
            const track = json.track;
            if ('error' in track) {
                console.info(track.error);
                return;
            }
            const artists = fisher.utils.parseArtists(track.artists).artists.join(', ');
            let title = track.title;
            if ('version' in track) {
                title += ` (${track.version})`;
            }
            console.log(artists + ' - ' + title);
            track.albums.forEach(album => console.log(`${fisher.yandex.baseUrl}/album/${album.id}/track/${trackId}`));
        }).catch(e => console.error(e));
    }

    window.getTrackPageUrl = getTrackPageUrl;

})();
