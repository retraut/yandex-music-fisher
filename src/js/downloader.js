/* global chrome, fisher, ga, ID3Writer */

require('../vendor/browser-id3-writer-1.2.0.min');

const downloader = {
    TYPE: Object.freeze({
        TRACK: 'track',
        ALBUM: 'album',
        PLAYLIST: 'playlist',
        COVER: 'cover'
    }),
    STATUS: Object.freeze({
        WAITING: 'waiting',
        LOADING: 'loading',
        FINISHED: 'finished',
        INTERRUPTED: 'interrupted'
    }),
    PATH_LIMIT: 50,
    downloads: new Map(),
    downloadsCounter: 0,
    activeThreadCount: 0
};

downloader.runAllThreads = () => {
    for (let i = 0; i < fisher.storage.current.downloadThreadCount; i++) {
        downloader.download();
    }
};

downloader.download = () => {
    fisher.utils.updateBadge();
    if (downloader.activeThreadCount < 0) {
        downloader.activeThreadCount = 0; // выравнивание при сбоях
    }
    if (downloader.activeThreadCount >= fisher.storage.current.downloadThreadCount) {
        return; // достигнуто максимальное количество потоков загрузки
    }
    const entity = downloader.getWaitingEntity();
    if (!entity) { // в очереди нет загрузок
        return;
    }
    entity.status = downloader.STATUS.LOADING;
    downloader.activeThreadCount++;
    let coverArrayBuffer;
    let trackAlbum;
    let trackUrl;
    let chain = Promise.resolve();

    const onInterruptEntity = error => {
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
            ga('send', 'event', 'error', error, errorDetails);
            console.error(error, entity);
        }
        downloader.activeThreadCount--;
        downloader.download();
    };

    const onProgress = event => {
        entity.loadedBytes = event.loaded;
    };

    const onChromeDownloadStart = downloadId => {
        if ('lastError' in chrome.runtime) {
            onInterruptEntity(chrome.runtime.lastError.message);
        } else {
            chrome.downloads.setShelfEnabled(false);
            entity.browserDownloadId = downloadId;
        }
    };

    const saveTrack = trackArrayBuffer => {
        if (!downloader.downloads.has(entity.index)) { // загрузку отменили
            return;
        }
        const writer = new ID3Writer(trackArrayBuffer);
        const artists = fisher.utils.parseArtists(entity.track.artists);
        if ('title' in entity) {
            writer.setFrame('TIT2', entity.title);
        }
        if (artists.artists.length) {
            writer.setFrame('TPE1', artists.artists);
        }
        if ('title' in trackAlbum) {
            writer.setFrame('TALB', trackAlbum.title);
        }
        if ('durationMs' in entity.track) {
            writer.setFrame('TLEN', entity.track.durationMs);
        }
        if ('year' in trackAlbum) {
            writer.setFrame('TYER', trackAlbum.year);
        }
        if (artists.composers.length) {
            writer.setFrame('TCOM', artists.composers);
        }
        if ('trackPosition' in entity) {
            writer.setFrame('TRCK', entity.trackPosition);
        }
        if ('albumPosition' in entity && entity.albumCount > 1) {
            writer.setFrame('TPOS', entity.albumPosition);
        }
        const albumArtist = fisher.utils.parseArtists(trackAlbum.artists).artists.join(', ');
        if (albumArtist) {
            writer.setFrame('TPE2', albumArtist);
        }
        const genre = trackAlbum.genre;
        if (genre) {
            writer.setFrame('TCON', [genre[0].toUpperCase() + genre.substr(1)]);
        }
        if ('lyrics' in entity && typeof entity.lyrics === 'string') {
            writer.setFrame('USLT', entity.lyrics);
        }
        if (coverArrayBuffer) {
            writer.setFrame('APIC', coverArrayBuffer);
        }
        writer.addTag();

        chrome.downloads.download({
            url: writer.getURL(),
            filename: entity.savePath,
            conflictAction: 'overwrite',
            saveAs: false
        }, onChromeDownloadStart);
    };

    const onInterruptEntityExcept404 = error => {
        if (error === '404 (Not found)') { // обложки с выбранном размером нет - игнорируем её
            if (entity.type === downloader.TYPE.TRACK) { // продолжаем загрузку трека без обложки
                console.info('Cover is not found', entity);
                chain = chain.then(() => fisher.utils.fetchBuffer(trackUrl, onProgress))
                    .catch(onInterruptEntity)
                    .then(saveTrack);
            }
        } else {
            onInterruptEntity(error);
        }
    };

    if (entity.type === downloader.TYPE.TRACK) {
        trackAlbum = entity.track.albums[0];
        if ('coverUri' in trackAlbum) {
            // пример альбома без обложки: https://music.yandex.ru/album/2236232/track/23652415
            const coverUrl = 'https://' + trackAlbum.coverUri.replace('%%', fisher.storage.current.albumCoverSizeId3);
            chain = chain.then(() => fisher.utils.fetchBuffer(coverUrl))
                .catch(onInterruptEntityExcept404)
                .then(arrayBuffer => {
                    coverArrayBuffer = arrayBuffer;
                });
        }
        if (fisher.storage.current.downloadHighestBitrate) {
            chain = chain.then(() => fisher.yandex.getTrackUrl(entity.track.id));
        } else {
            chain = chain.then(() => fisher.yandex.getTrackOldUrl(entity.track.storageDir));
        }
        chain.then(url => {
                trackUrl = url;
                return fisher.utils.fetchBuffer(trackUrl, onProgress);
            })
            .catch(onInterruptEntity)
            .then(saveTrack);
    } else if (entity.type === downloader.TYPE.COVER) {
        fisher.utils.fetchBuffer(entity.url, onProgress)
            .catch(onInterruptEntityExcept404)
            .then(arrayBuffer => {
                if (!downloader.downloads.has(entity.index)) { // загрузку отменили
                    return;
                }
                const blob = new Blob([arrayBuffer], {type: 'image/jpeg'});
                const localUrl = window.URL.createObjectURL(blob);
                chrome.downloads.download({
                    url: localUrl,
                    filename: entity.filename,
                    conflictAction: 'overwrite',
                    saveAs: false
                }, onChromeDownloadStart);
            });
    }
};

downloader.downloadTrack = trackId => {
    ga('send', 'event', 'track', trackId);
    fisher.yandex.getTrack(trackId).then(json => {
        const track = json.track;
        if ('error' in track) {
            console.error(`Track error: ${track.error}`, track);
            return;
        }

        const trackEntity = {
            type: downloader.TYPE.TRACK,
            status: downloader.STATUS.WAITING,
            index: downloader.downloadsCounter++,
            track: track,
            artists: fisher.utils.parseArtists(track.artists).artists.join(', '),
            title: track.title,
            savePath: null,
            lyrics: null,
            loadedBytes: 0,
            attemptCount: 0,
            browserDownloadId: null
        };
        if ('version' in track) {
            trackEntity.title += ` (${track.version})`;
        }
        if (json.lyric.length && json.lyric[0].fullLyrics) {
            trackEntity.lyrics = json.lyric[0].fullLyrics;
        }

        const shortArtists = trackEntity.artists.substr(0, downloader.PATH_LIMIT);
        const shortTitle = trackEntity.title.substr(0, downloader.PATH_LIMIT);
        trackEntity.savePath = fisher.utils.clearPath(shortArtists + ' - ' + shortTitle + '.mp3', false);

        downloader.downloads.set(trackEntity.index, trackEntity);
        downloader.download();
    }).catch(e => console.error(e));
};

downloader.downloadAlbum = (albumId, artistOrLabelName) => {
    ga('send', 'event', 'album', albumId);
    fisher.yandex.getAlbum(albumId).then(album => {
        if (!album.trackCount) {
            return;
        }
        const albumEntity = {
            type: downloader.TYPE.ALBUM,
            index: downloader.downloadsCounter++,
            duration: 0,
            size: 0,
            artists: fisher.utils.parseArtists(album.artists).artists.join(', '),
            title: album.title,
            tracks: [],
            cover: null
        };

        if ('version' in album) {
            albumEntity.title += ' (' + album.version + ')';
        }
        let saveDir = '';
        if (artistOrLabelName) {
            const shortName = artistOrLabelName.substr(0, downloader.PATH_LIMIT);
            saveDir += fisher.utils.clearPath(shortName, true) + '/';
        }
        const shortAlbumArtists = albumEntity.artists.substr(0, downloader.PATH_LIMIT);
        const shortAlbumTitle = albumEntity.title.substr(0, downloader.PATH_LIMIT);
        if ('year' in album) {
            saveDir += fisher.utils.clearPath(`${album.year} - ${shortAlbumArtists} - ${shortAlbumTitle}`, true);
        } else {
            saveDir += fisher.utils.clearPath(`${shortAlbumArtists} - ${shortAlbumTitle}`, true);
        }

        if (fisher.storage.current.shouldDownloadCover && 'coverUri' in album) {
            albumEntity.cover = {
                type: downloader.TYPE.COVER,
                index: albumEntity.index,
                status: downloader.STATUS.WAITING,
                url: 'https://' + album.coverUri.replace('%%', fisher.storage.current.albumCoverSize),
                filename: saveDir + '/cover.jpg',
                loadedBytes: 0,
                attemptCount: 0
            };
        }

        album.volumes.forEach((volume, i) => {
            const trackNameCounter = {}; // пример: https://music.yandex.ru/album/512639
            volume.forEach((track, j) => {
                if ('error' in track) {
                    console.error(`Track error: ${track.error}`, track);
                    return;
                }

                albumEntity.size += track.fileSize;
                albumEntity.duration += track.durationMs;
                const trackPosition = j + 1;
                const albumPosition = i + 1;
                const trackEntity = {
                    type: downloader.TYPE.TRACK,
                    index: albumEntity.index,
                    status: downloader.STATUS.WAITING,
                    track: track,
                    artists: fisher.utils.parseArtists(track.artists).artists.join(', '),
                    title: track.title,
                    savePath: null,
                    loadedBytes: 0,
                    attemptCount: 0,
                    trackPosition: trackPosition,
                    albumPosition: albumPosition,
                    albumCount: album.volumes.length,
                    browserDownloadId: null
                };
                if ('version' in track) {
                    trackEntity.title += ` (${track.version})`;
                }
                let shortTrackTitle = trackEntity.title.substr(0, downloader.PATH_LIMIT);

                let savePath = saveDir + '/';
                if (album.volumes.length > 1) {
                    // пример: https://music.yandex.ru/album/2490723
                    savePath += 'CD' + albumPosition + '/';
                }

                if (fisher.storage.current.enumerateAlbums) {
                    // нумеруем все треки
                    savePath += fisher.utils.addExtraZeros(trackPosition, volume.length) + '. ';
                } else {
                    // если совпадают имена - добавляем номер
                    if (shortTrackTitle in trackNameCounter) {
                        trackNameCounter[shortTrackTitle]++;
                        shortTrackTitle += ' (' + trackNameCounter[shortTrackTitle] + ')';
                    } else {
                        trackNameCounter[shortTrackTitle] = 1;
                    }
                }

                trackEntity.savePath = savePath + fisher.utils.clearPath(shortTrackTitle + '.mp3', false);
                albumEntity.tracks.push(trackEntity);
            });
        });

        if (!albumEntity.tracks.length) {
            return;
        }

        downloader.downloads.set(albumEntity.index, albumEntity);
        downloader.runAllThreads();
    }).catch(e => console.error(e));
};

downloader.downloadPlaylist = (username, playlistId) => {
    ga('send', 'event', 'playlist', username, playlistId);
    fisher.yandex.getPlaylist(username, playlistId).then(playlist => {
        if (!playlist.trackCount) {
            return;
        }
        const playlistEntity = {
            type: downloader.TYPE.PLAYLIST,
            index: downloader.downloadsCounter++,
            duration: 0,
            size: 0,
            title: playlist.title,
            tracks: []
        };
        const shortPlaylistTitle = playlist.title.substr(0, downloader.PATH_LIMIT);
        const saveDir = fisher.utils.clearPath(shortPlaylistTitle, true);
        const trackNameCounter = {}; // пример https://music.yandex.ru/users/dimzon541/playlists/1002

        playlist.tracks.forEach((track, i) => {
            if ('error' in track) {
                console.error(`Track error: ${track.error}`, track);
                return;
            }
            playlistEntity.size += track.fileSize;
            playlistEntity.duration += track.durationMs;
            const trackEntity = {
                type: downloader.TYPE.TRACK,
                index: playlistEntity.index,
                status: downloader.STATUS.WAITING,
                track: track,
                artists: fisher.utils.parseArtists(track.artists).artists.join(', '),
                title: track.title,
                savePath: null,
                loadedBytes: 0,
                attemptCount: 0,
                browserDownloadId: null
            };
            if ('version' in track) {
                trackEntity.title += ` (${track.version})`;
            }
            const shortTrackArtists = trackEntity.artists.substr(0, downloader.PATH_LIMIT);
            const shortTrackTitle = trackEntity.title.substr(0, downloader.PATH_LIMIT);
            let name = shortTrackArtists + ' - ' + shortTrackTitle;

            let savePath = saveDir + '/';
            if (fisher.storage.current.enumeratePlaylists) {
                // нумеруем все треки
                savePath += fisher.utils.addExtraZeros(i + 1, playlist.tracks.length) + '. ';
            } else {
                // если совпадают имена - добавляем номер
                if (name in trackNameCounter) {
                    trackNameCounter[name]++;
                    name += ' (' + trackNameCounter[name] + ')';
                } else {
                    trackNameCounter[name] = 1;
                }
            }

            trackEntity.savePath = savePath + fisher.utils.clearPath(name + '.mp3', false);
            playlistEntity.tracks.push(trackEntity);
        });

        if (!playlistEntity.tracks.length) {
            return;
        }

        downloader.downloads.set(playlistEntity.index, playlistEntity);
        downloader.runAllThreads();
    }).catch(e => console.error(e));
};

downloader.getWaitingEntity = () => {
    let foundEntity;
    downloader.downloads.forEach(entity => {
        if (foundEntity) {
            return;
        }
        const isAlbum = entity.type === downloader.TYPE.ALBUM;
        const isCover = isAlbum && entity.cover;
        const isPlaylist = entity.type === downloader.TYPE.PLAYLIST;
        const isTrack = entity.type === downloader.TYPE.TRACK;

        if (isCover && entity.cover.status === downloader.STATUS.WAITING) {
            foundEntity = entity.cover;
        } else if (isAlbum || isPlaylist) {
            entity.tracks.forEach(track => {
                if (foundEntity) {
                    return;
                }
                if (track.status === downloader.STATUS.WAITING) {
                    foundEntity = track;
                }
            });
        } else if (isTrack) {
            if (entity.status === downloader.STATUS.WAITING) {
                foundEntity = entity;
            }
        }
    });
    return foundEntity;
};

downloader.getDownloadCount = () => {
    let count = 0;
    downloader.downloads.forEach(entity => {
        const isAlbum = entity.type === downloader.TYPE.ALBUM;
        const isCover = isAlbum && entity.cover;
        const isPlaylist = entity.type === downloader.TYPE.PLAYLIST;
        const isTrack = entity.type === downloader.TYPE.TRACK;

        if (isCover && entity.cover.status !== downloader.STATUS.FINISHED) {
            count++;
        }
        if (isAlbum || isPlaylist) {
            entity.tracks.forEach(track => {
                if (track.status !== downloader.STATUS.FINISHED) {
                    count++;
                }
            });
        } else if (isTrack && entity.status !== downloader.STATUS.FINISHED) {
            count++;
        }
    });
    return count;
};

downloader.getEntityByBrowserDownloadId = browserDownloadId => {
    let foundEntity;
    downloader.downloads.forEach(entity => {
        if (foundEntity) {
            return;
        }
        const isAlbum = entity.type === downloader.TYPE.ALBUM;
        const isCover = isAlbum && entity.cover;
        const isPlaylist = entity.type === downloader.TYPE.PLAYLIST;
        const isTrack = entity.type === downloader.TYPE.TRACK;

        if (isCover && entity.cover.browserDownloadId === browserDownloadId) {
            foundEntity = entity.cover;
        } else if (isAlbum || isPlaylist) {
            entity.tracks.forEach(track => {
                if (foundEntity) {
                    return;
                }
                if (track.browserDownloadId === browserDownloadId) {
                    foundEntity = track;
                }
            });
        } else if (isTrack) {
            if (entity.browserDownloadId === browserDownloadId) {
                foundEntity = entity;
            }
        }
    });
    return foundEntity;
};

module.exports = downloader;
