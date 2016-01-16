/* global chrome, externalAPI */

(() => {
    'use strict';

    const injectCode = func => {
        const script = document.createElement('script');
        script.textContent = `'use strict';try{(${func})();}catch(e){console.log('Fisher injected error',e);};`;
        document.head.appendChild(script);
        script.parentNode.removeChild(script);
    };

    const dispatchCurrentTrackUrl = () => {
        let link;
        const track = externalAPI.getCurrentTrack();
        if (track && track.link) {
            link = track.link;
        }
        document.dispatchEvent(new CustomEvent('fisher_injected_event', {
            detail: {
                link: link
            }
        }));
    };

    chrome.runtime.onMessage.addListener(message => {
        if (message === 'getCurrentTrackUrl') {
            injectCode(dispatchCurrentTrackUrl);
        }
    });

    document.addEventListener('fisher_injected_event', e => chrome.runtime.sendMessage(e.detail));

})();
