/* global chrome */

(() => {
    'use strict';

    const storage = {
        defaults: {
            downloadThreadCount: 4,
            shouldDownloadCover: true,
            albumCoverSize: '600x600',
            albumCoverSizeId3: '400x400',
            enumerateAlbums: true,
            enumeratePlaylists: false,
            shouldNotifyAboutUpdates: true,
            singleClickDownload: false,
            backgroundDownload: false,
            downloadHighestBitrate: true
        },
        current: {}
    };

    storage.init = () => {
        const keys = Object.keys(storage.defaults);
        chrome.storage.local.get(keys, items => {
            for (let i = 0; i < keys.length; i++) {
                if (items[keys[i]] === undefined) {
                    storage.reset(keys[i]);
                }
            }
        });
    };

    storage.load = () => new Promise(resolve => {
        chrome.storage.local.get(params => {
            storage.current = params;
            storage.current.domain = 'ru';
            resolve();
        });
    });

    storage.reset = param => {
        const defaultValue = storage.defaults[param];
        const data = {};
        data[param] = defaultValue;
        chrome.storage.local.set(data, storage.load);
    };

    storage.resetAll = () => new Promise(resolve => {
        const data = {};
        for (const param in storage.defaults) {
            if (storage.defaults.hasOwnProperty(param)) {
                data[param] = storage.defaults[param];
            }
        }
        chrome.storage.local.clear(() => {
            chrome.storage.local.set(data, resolve);
        });
    });

    window.storage = storage;

})();
