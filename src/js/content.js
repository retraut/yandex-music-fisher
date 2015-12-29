/* global chrome, externalAPI, Mu */

(() => {
    'use strict';

    const IS_RADIO = location.hostname.match(/^radio\.yandex\.(ru|by|kz|ua)$/);

    let injectCode = function (func) {
        let script = document.createElement('script');
        script.textContent = '"use strict";try {(' + func + ')(); } catch(e) {console.log("injected error", e);};';
        (document.head || document.documentElement).appendChild(script);
        script.parentNode.removeChild(script);
    };

    let getCurrentTrackUrl = function () {
        let link;
        let track = externalAPI.getCurrentTrack();
        if (track && track.link) {
            link = track.link;
        }
        document.dispatchEvent(new CustomEvent('fisher_injected_event', {
            detail: {
                link: link
            }
        }));
    };

    chrome.runtime.onMessage.addListener(function (message) {
        // расширение прислало сообщение
        if (message === 'getCurrentTrackUrl') {
            injectCode(getCurrentTrackUrl);
        }
    });

    document.addEventListener('fisher_injected_event', function (e) {
        // ловим события со страницы и отправляем расширению
        chrome.runtime.sendMessage(e.detail);
    });

    if (IS_RADIO) {
        injectCode(function () { // временный патч
            var repo = Mu.blocks.di.repo;
            repo.seq = repo.flow;

            repo.seq.like = repo.seq.sendFeedback.bind(repo.seq, 'like', null, null);
            repo.seq.unlike = repo.seq.sendFeedback.bind(repo.seq, 'unlike', null, null);
            repo.seq.dislike = repo.seq.sendFeedback.bind(repo.seq, 'dislike', null, null);
            repo.seq.undislike = repo.seq.sendFeedback.bind(repo.seq, 'undislike', null, null);

            repo.fav.isFavorite = function (data) {
                return data.entry.track.liked;
            };
            Mu.blocks.di.runInit('externalAPI', new Mu.ExternalAPI());
        });
    }

})();
