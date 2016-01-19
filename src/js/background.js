/* global chrome, storage, utils, downloader, ga, yandex */

(() => {
    'use strict';
    'use strong';

    let distributionUrl;

    ga('create', 'UA-65530110-1', 'auto');
    ga('set', 'checkProtocolTask', null); // разрешает протокол "chrome-extension"
    ga('set', 'page', '/home');
    ga('send', 'event', 'load', chrome.runtime.getManifest().version);

    window.onerror = (message, file, line, col, error) => {
        const relativePattern = /chrome-extension:\/\/[^\/]+/g;
        const report = chrome.runtime.getManifest().version + ': ' + error.stack.replace(relativePattern, '').replace(/\n/g, '');
        utils.getActiveTab()
            .then(activeTab => ga('send', 'event', 'onerror', report, activeTab.url))
            .catch(() => ga('send', 'event', 'onerror', report));
    };

    chrome.browserAction.setBadgeBackgroundColor({
        color: [100, 100, 100, 255]
    });
    utils.updateBadge();

    chrome.runtime.onInstalled.addListener(details => { // установка или обновление расширения
        storage.init();
        const version = chrome.runtime.getManifest().version;
        if (details.reason === 'install') {
            ga('send', 'event', 'install', version);
        } else if (details.reason === 'update' && details.previousVersion !== version) {
            ga('send', 'event', 'update', details.previousVersion + ' > ' + version);
        }
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if ('status' in changeInfo && changeInfo.status === 'loading') { // переход по новому URL
            utils.updateTabIcon(tab);
        }
    });

    chrome.tabs.onActivated.addListener(activeInfo => {
        chrome.tabs.get(activeInfo.tabId, tab => { // переключение вкладки
            if ('lastError' in chrome.runtime) { // консоль
                return;
            }
            utils.updateTabIcon(tab);
        });
    });

    chrome.runtime.onMessage.addListener(function (request) {
        if (!request || request.action !== 'downloadCurrentTrack' || !('link' in request)) {
            return;
        }
        const page = utils.getUrlInfo(yandex.baseUrl() + request.link);
        downloader.downloadTrack(page.trackId);
    });

    chrome.commands.onCommand.addListener(command => {
        if (command === 'download_playing_track') {
            chrome.tabs.query({
                url: chrome.runtime.getManifest().content_scripts[0].matches,
                audible: true
            }, tabs => tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, 'downloadCurrentTrack')));
        }
    });

    chrome.downloads.onChanged.addListener(delta => {
        if (!('state' in delta)) { // состояние не изменилось (начало загрузки)
            utils.getDownload(delta.id).then(() => chrome.downloads.setShelfEnabled(true));
            // не нашёл способа перехватывать ошибки, когда другое расширение отключает анимацию загрузок
            return;
        }
        utils.getDownload(delta.id).then(download => {
            const entity = downloader.getEntityByBrowserDownloadId(delta.id);
            if (entity) {
                // не попадут: архив с обновлением,
                // трек и обложка при удалённой сущности в процессе сохранения BLOB (теоретически, но маловероятно)
                if (delta.state.current === 'complete') {
                    entity.status = downloader.STATUS.FINISHED;
                    utils.updateBadge();
                } else if (delta.state.current === 'interrupted') {
                    entity.attemptCount++;
                    entity.loadedBytes = 0;
                    if (entity.attemptCount < 3) {
                        utils.delay(10000).then(() => {
                            entity.status = downloader.STATUS.WAITING;
                            downloader.download();
                        });
                    } else {
                        entity.status = downloader.STATUS.INTERRUPTED;
                        const error = {
                            message: download.error,
                            details: ''
                        };
                        if (entity.type === downloader.TYPE.TRACK) {
                            error.details = entity.track.id;
                        } else if (entity.type === downloader.TYPE.COVER) {
                            error.details = entity.url;
                        }
                        utils.logError(error);
                    }
                }
                window.URL.revokeObjectURL(download.url);
            }
            chrome.downloads.erase({
                id: delta.id
            });
            downloader.activeThreadCount--;
            downloader.download();
        });
    });

    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
        if (notificationId !== 'yandex-music-fisher-update') {
            return;
        }
        if (buttonIndex === 0) {
            chrome.downloads.showDefaultFolder();
            chrome.notifications.clear(notificationId);
            chrome.downloads.download({
                url: distributionUrl,
                conflictAction: 'overwrite',
                saveAs: false
            });
        } else if (buttonIndex === 1) {
            chrome.tabs.create({
                url: 'https://github.com/egoroof/yandex-music-fisher/releases'
            });
        }
    });

    storage.load().then(() => {
        if (storage.current.shouldNotifyAboutUpdates) {
            return utils.checkUpdate();
        } else {
            throw new Error('Update notifications are disabled');
        }
    }).then(updateInfo => {
        distributionUrl = updateInfo.distUrl;
        chrome.notifications.create('yandex-music-fisher-update', {
            type: 'basic',
            iconUrl: '/img/icon.png',
            title: 'Yandex Music Fisher',
            message: 'Доступно обновление ' + updateInfo.version,
            contextMessage: 'Обновления устанавливаются вручную!',
            buttons: [{
                title: 'Скачать обновление',
                iconUrl: '/img/download.png'
            }, {
                title: 'Просмотреть изменения'
            }],
            isClickable: false
        });
    }).catch(err => console.log(err));

})();
