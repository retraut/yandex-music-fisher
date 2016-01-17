/* global chrome, externalAPI */

(() => {
    'use strict';

    const injectCode = (func, action) => {
        const script = document.createElement('script');
        script.textContent = `'use strict';try{(${func})('${action}');}catch(e){console.log('Fisher injected error',e);};`;
        document.head.appendChild(script);
        script.parentNode.removeChild(script);
    };

    const dispatchCurrentTrackUrl = action => {
        let link;
        const track = externalAPI.getCurrentTrack();
        if (track && track.link) {
            link = track.link;
        }
        document.dispatchEvent(new CustomEvent('fisher_injected_event', {
            detail: {
                action: action,
                link: link
            }
        }));
    };

    chrome.runtime.onMessage.addListener(action => {
        switch (action) {
            case 'getCurrentTrackUrl':
            case 'downloadCurrentTrack':
                injectCode(dispatchCurrentTrackUrl, action);
                break;
        }
    });

    document.addEventListener('fisher_injected_event', e => chrome.runtime.sendMessage(e.detail));

})();
