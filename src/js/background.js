/* global chrome, fisher, ga */

require('./ga');

window.fisher = {};

const utils = require('./utils');
window.fisher.utils = utils;

const Yandex = require('./yandex');
window.fisher.yandex = new Yandex();

const storage = require('./storage');
window.fisher.storage = storage;

const downloader = require('./downloader');
window.fisher.downloader = downloader;

const version = chrome.runtime.getManifest().version;

let distributionUrl;

ga('create', 'UA-65530110-1', 'auto');
ga('set', 'checkProtocolTask', null); // разрешает протокол "chrome-extension"
ga('set', 'page', '/home');
ga('send', 'event', 'load', version);

window.onerror = (message, file, line, col, error) => {
    const relativePattern = /chrome-extension:\/\/[^\/]+/g;
    const stack = error.stack.replace(relativePattern, '').replace(/\n/g, '');
    console.error(error.stack);
    ga('send', 'event', 'onerror', `${version}: ${stack}`);
};

chrome.browserAction.setBadgeBackgroundColor({
    color: [100, 100, 100, 255]
});
fisher.utils.updateBadge();

chrome.runtime.onInstalled.addListener(details => { // установка или обновление расширения
    storage.init();
    if (details.reason === 'install') {
        ga('send', 'event', 'install', version);
    } else if (details.reason === 'update' && details.previousVersion !== version) {
        ga('send', 'event', 'update', `${details.previousVersion} > ${version}`);
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if ('status' in changeInfo && changeInfo.status === 'loading') { // переход по новому URL
        fisher.utils.updateTabIcon(tab);
    }
});

chrome.tabs.onActivated.addListener(activeInfo => { // переключение вкладки
    chrome.tabs.get(activeInfo.tabId, tab => {
        fisher.utils.updateTabIcon(tab);
    });
});

chrome.runtime.onMessage.addListener(function (request) {
    if (!request || request.action !== 'downloadCurrentTrack' || !('link' in request)) {
        return;
    }
    const page = fisher.utils.getUrlInfo(fisher.yandex.baseUrl + request.link);
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
        fisher.utils.getDownload(delta.id).then(() => chrome.downloads.setShelfEnabled(true));
        // не нашёл способа перехватывать ошибки, когда другое расширение отключает анимацию загрузок
        return;
    }
    fisher.utils.getDownload(delta.id).then(download => {
        const entity = downloader.getEntityByBrowserDownloadId(delta.id);
        if (entity) {
            // не попадут: архив с обновлением,
            // трек и обложка при удалённой сущности в процессе сохранения BLOB (теоретически, но маловероятно)
            if (delta.state.current === 'complete') {
                entity.status = downloader.STATUS.FINISHED;
                fisher.utils.updateBadge();
            } else if (delta.state.current === 'interrupted') {
                entity.attemptCount++;
                entity.loadedBytes = 0;
                if (entity.attemptCount < 3) {
                    fisher.utils.delay(10000).then(() => {
                        entity.status = downloader.STATUS.WAITING;
                        downloader.download();
                    });
                } else {
                    entity.status = downloader.STATUS.INTERRUPTED;
                    let errorDetails = '';
                    if (entity.type === downloader.TYPE.TRACK) {
                        errorDetails = entity.track.id;
                    } else if (entity.type === downloader.TYPE.COVER) {
                        errorDetails = entity.url;
                    }
                    console.error(download.error, errorDetails);
                    ga('send', 'event', 'error', download.error, errorDetails);
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
        return fisher.utils.checkUpdate();
    } else {
        throw new Error('Updater notifications are disabled');
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
}).catch(e => console.info(e));
