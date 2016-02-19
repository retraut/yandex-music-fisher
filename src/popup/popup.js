const $ = document.getElementById.bind(document);

let backgroundPage;
let updateIntervalId;

window.onerror = (message, file, line, col, error) => backgroundPage.onerror(message, file, line, col, error);

function generateListView(entity) {
    const totalTrackSize = entity.size;
    const totalTrackCount = entity.tracks.length;
    const totalStatus = {
        waiting: 0,
        loading: 0,
        finished: 0,
        interrupted: 0
    };
    const isAlbum = entity.type === backgroundPage.fisher.downloader.TYPE.ALBUM;
    const isPlaylist = entity.type === backgroundPage.fisher.downloader.TYPE.PLAYLIST;

    let loadedTrackSize = 0;
    let loadedTrackCount = 0;

    entity.tracks.forEach((track) => {
        loadedTrackSize += track.loadedBytes;
        totalStatus[track.status]++;
        if (track.status === backgroundPage.fisher.downloader.STATUS.FINISHED) {
            loadedTrackCount++;
        }
    });

    const isLoading = totalStatus.loading > 0;
    const isInterrupted = !isLoading && totalStatus.interrupted > 0;
    const isFinished = !isInterrupted && totalStatus.finished === totalTrackCount;
    const isWaiting = !isFinished && totalStatus.waiting > 0;

    let name = '';
    let status = '';

    if (isAlbum) {
        name = `Альбом <strong>${entity.artists} - ${entity.title}</strong>`;
    } else if (isPlaylist) {
        name = `Плейлист <strong>${entity.title}</strong>`;
    }

    const loadedTrackSizeStr = backgroundPage.fisher.utils.bytesToStr(loadedTrackSize);
    const totalTrackSizeStr = backgroundPage.fisher.utils.bytesToStr(totalTrackSize);

    if (isLoading) {
        status = `<span class="text-primary">Загрузка [${loadedTrackSizeStr} из ${totalTrackSizeStr}]</span>`;
    } else if (isInterrupted) {
        status = `<span class="text-danger">Ошибка [скачано ${loadedTrackSizeStr} из ${totalTrackSizeStr}]</span> `;
        status += `<button type="button" class="btn btn-info btn-xs restore-btn" data-id="${entity.index}">`;
        status += `<i class="glyphicon glyphicon-repeat restore-btn" data-id="${entity.index}"></i></button>`;
    } else if (isFinished) {
        status = `<span class="text-success">Сохранён [${totalTrackSizeStr}]</span>`;
    } else if (isWaiting) {
        status = `<span class="text-muted">В очереди [${totalTrackSizeStr}]</span>`;
    }

    const loadedSizePercent = Math.floor(loadedTrackSize / totalTrackSize * 100);

    let view = '<div class="panel panel-default">';

    view += '<div class="panel-heading">';
    view +=     `${name}<br>`;
    view +=     `Скачано треков ${loadedTrackCount} из ${totalTrackCount} (${loadedSizePercent}%)`;
    view += '</div>';
    view += '<div class="panel-body">';
    view +=     status;
    view +=     `<button type="button" class="btn btn-xs btn-danger remove-btn" data-id="${entity.index}">`;
    view +=         `<i class="glyphicon glyphicon-remove" data-id="${entity.index}"></i>`
    view +=     `</button>`;
    view += '</div>';

    view += '</div>';
    return view;
}

function generateTrackView(entity) {
    const loadedSize = backgroundPage.fisher.utils.bytesToStr(entity.loadedBytes);
    const totalSize = backgroundPage.fisher.utils.bytesToStr(entity.track.fileSize);
    const isWaiting = entity.status === backgroundPage.fisher.downloader.STATUS.WAITING;
    const isLoading = entity.status === backgroundPage.fisher.downloader.STATUS.LOADING;
    const isFinished = entity.status === backgroundPage.fisher.downloader.STATUS.FINISHED;
    const isInterrupted = entity.status === backgroundPage.fisher.downloader.STATUS.INTERRUPTED;

    let status = '';

    if (isWaiting) {
        status = `<span class="text-muted">В очереди [${totalSize}]</span>`;
    } else if (isLoading) {
        status = `<span class="text-primary">Загрузка [${loadedSize} из ${totalSize}]</span>`;
    } else if (isFinished) {
        status = `<span class="text-success">Сохранён [${totalSize}]</span>`;
    } else if (isInterrupted) {
        status = `<span class="text-danger">Ошибка [скачано ${loadedSize} из ${totalSize}]</span> `;
        status += `<button type="button" class="btn btn-info btn-xs restore-btn" data-id="${entity.index}">`;
        status += `<i class="glyphicon glyphicon-repeat restore-btn" data-id="${entity.index}"></i></button>`;
    }

    let view = '<div class="panel panel-default">';

    view += '<div class="panel-heading">';
    view += `Трек <strong>${entity.artists} - ${entity.title}</strong>`;
    view += '</div>';
    view += '<div class="panel-body">';
    view += status;
    view += ` <button type="button" class="btn btn-danger btn-xs remove-btn" data-id="${entity.index}">`;
    view += `<i class="glyphicon glyphicon-remove remove-btn" data-id="${entity.index}"></i></button>`;
    view += '</div>';
    view += '</div>';
    return view;
}

function updateDownloader() {
    const downloads = backgroundPage.fisher.downloader.downloads;

    let content = '';

    if (!downloads.size) {
        content += '<div class="alert alert-info alert-empty-downloads">';
        content += '<strong>Загрузок нет</strong>';
        content += '<br /><br />';
        content += '<p>Для добавления перейдите на страницу трека, альбома, плейлиста или исполнителя на сервисе Яндекс.Музыка</p>';
        content += '</div>';
    }
    downloads.forEach((entity) => {
        const isAlbum = entity.type === backgroundPage.fisher.downloader.TYPE.ALBUM;
        const isPlaylist = entity.type === backgroundPage.fisher.downloader.TYPE.PLAYLIST;
        const isTrack = entity.type === backgroundPage.fisher.downloader.TYPE.TRACK;

        if (isTrack) {
            content = generateTrackView(entity) + content;
        } else if (isAlbum || isPlaylist) {
            content = generateListView(entity) + content;
        }
    });
    $('downloadContainer').innerHTML = content;
}

function startUpdater() {
    if (typeof updateIntervalId !== 'undefined') {
        return; // уже запущено обновление загрузчика
    }
    updateDownloader();
    updateIntervalId = setInterval(updateDownloader, 250);
}

$('addBtn').addEventListener('click', () => {
    $('downloadBtn').classList.remove('active');
    $('addBtn').classList.add('active');
    $('addContainer').classList.remove('hidden');
    $('downloadContainer').classList.add('hidden');
});

$('downloadBtn').addEventListener('click', () => {
    $('addBtn').classList.remove('active');
    $('downloadBtn').classList.add('active');
    $('addContainer').classList.add('hidden');
    $('downloadContainer').classList.remove('hidden');
    $('errorContainer').classList.add('hidden');
    startUpdater();
});

$('downloadFolderBtn').addEventListener('click', () => chrome.downloads.showDefaultFolder());
$('settingsBtn').addEventListener('click', () => chrome.runtime.openOptionsPage());

$('downloadContainer').addEventListener('mousedown', (e) => {
    const downloads = backgroundPage.fisher.downloader.downloads;
    const isRemoveBtnClick = e.target.classList.contains('remove-btn');
    const isRestoreBtnClick = e.target.classList.contains('restore-btn');

    if (!isRemoveBtnClick && !isRestoreBtnClick) {
        return;
    }

    const downloadId = parseInt(e.target.getAttribute('data-id'), 10);

    if (!downloads.has(downloadId)) {
        return;
    }

    const entity = downloads.get(downloadId);
    const isAlbum = entity.type === backgroundPage.fisher.downloader.TYPE.ALBUM;
    const isCover = isAlbum && entity.cover;
    const isPlaylist = entity.type === backgroundPage.fisher.downloader.TYPE.PLAYLIST;
    const isTrack = entity.type === backgroundPage.fisher.downloader.TYPE.TRACK;

    if (isRemoveBtnClick) {
        if (isCover && entity.cover.status === backgroundPage.fisher.downloader.STATUS.LOADING) {
            backgroundPage.fisher.downloader.activeThreadCount--;
        }
        if (isTrack) {
            if (entity.status === backgroundPage.fisher.downloader.STATUS.LOADING) {
                backgroundPage.fisher.downloader.activeThreadCount--;
            }
        } else if (isAlbum || isPlaylist) {
            entity.tracks.forEach((track) => {
                if (track.status === backgroundPage.fisher.downloader.STATUS.LOADING) {
                    backgroundPage.fisher.downloader.activeThreadCount--;
                }
            });
        }
        downloads.delete(downloadId);
        backgroundPage.fisher.downloader.runAllThreads();
    } else if (isRestoreBtnClick) {
        if (isCover && entity.cover.status === backgroundPage.fisher.downloader.STATUS.INTERRUPTED) {
            entity.cover.attemptCount = 0;
            entity.cover.status = backgroundPage.fisher.downloader.STATUS.WAITING;
            backgroundPage.fisher.downloader.download();
        }
        if (isTrack) {
            entity.attemptCount = 0;
            entity.status = backgroundPage.fisher.downloader.STATUS.WAITING;
            backgroundPage.fisher.downloader.download();
        } else if (isAlbum || isPlaylist) {
            entity.tracks.forEach((track) => {
                if (track.status === backgroundPage.fisher.downloader.STATUS.INTERRUPTED) {
                    track.attemptCount = 0;
                    track.status = backgroundPage.fisher.downloader.STATUS.WAITING;
                    backgroundPage.fisher.downloader.download();
                }
            });
        }
    }
});

$('startDownloadBtn').addEventListener('click', () => {
    const downloadType = $('startDownloadBtn').getAttribute('data-type');

    $('downloadBtn').click();
    $('addBtn').classList.add('disabled');
    switch (downloadType) {
        case 'track':
        {
            const trackId = $('startDownloadBtn').getAttribute('data-trackId');

            backgroundPage.fisher.downloader.downloadTrack(trackId);
            break;
        }
        case 'album':
        {
            const albumId = $('startDownloadBtn').getAttribute('data-albumId');

            backgroundPage.fisher.downloader.downloadAlbum(albumId, null);
            break;
        }
        case 'playlist':
        {
            const username = $('startDownloadBtn').getAttribute('data-username');
            const playlistId = $('startDownloadBtn').getAttribute('data-playlistId');

            backgroundPage.fisher.downloader.downloadPlaylist(username, playlistId);
            break;
        }
        case 'artistOrLabel':
        {
            const name = $('startDownloadBtn').getAttribute('data-name');
            const albumElems = document.getElementsByClassName('album');
            const compilationElems = document.getElementsByClassName('compilation');
            const allElems = [].slice.call(albumElems).concat([].slice.call(compilationElems));

            allElems.forEach((albumElem) => {
                if (albumElem.checked) {
                    backgroundPage.fisher.downloader.downloadAlbum(albumElem.value, name);
                }
            });
            break;
        }
    }
    startUpdater();
});

function hidePreloader() {
    $('preloader').classList.add('hidden');
    $('addContainer').classList.remove('hidden');
    $('downloadBtn').classList.remove('disabled');
}

function generateDownloadArtist(artist) {
    if (artist.tracks.length) {
        $('downloadTop10Tracks').classList.remove('hidden');
        $('downloadTop10Tracks').addEventListener('click', () => {
            artist.tracks.forEach((track) => {
                backgroundPage.fisher.downloader.downloadTrack(track.id);
            });
            $('downloadBtn').click();
        });
    }
    let albumContent = '';
    let compilationContent = '';

    artist.albums.forEach((album, i) => {
        if (!('year' in album)) {
            artist.albums[i].year = 0;
        }
    });
    const sortedAlbums = artist.albums.sort((a, b) => b.year - a.year);

    if (sortedAlbums.length) {
        const name = `Альбомы (${sortedAlbums.length})`;
        albumContent += `<h4 class="albums"><label><input type="checkbox" id="albumCheckbox" checked><b>${name}</b></label></h4>`;
    }
    let year = 0;

    albumContent += `<div class="panel panel-default panel-albums">`;
    sortedAlbums.forEach((album) => {
        if (album.year !== year) {
            year = album.year;
            albumContent += `<div class="panel-heading">`;
            albumContent += `<label class="label-year">${year === 0 ? 'Год не указан' : year}</label>`;
            albumContent += `</div>`
        }
        let title = `[${album.trackCount}] ${album.title}`;

        if ('version' in album) {
            title += ` (${album.version})`;
        }

        let coverUrl = (album.coverUri)
            ? `https://${album.coverUri.replace('%%', '70x70')}`
            : `data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAZABkAAD/7AARRHVja3kAAQAEAAAAAAAA/+EDMWh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8APD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS41LWMwMjEgNzkuMTU1NzcyLCAyMDE0LzAxLzEzLTE5OjQ0OjAwICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo4QzkwMERDMUNGMDkxMUU1QkRDM0M2MUI0RDFCRkU5OSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo4QzkwMERDMENGMDkxMUU1QkRDM0M2MUI0RDFCRkU5OSIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxNCAoTWFjaW50b3NoKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkU0MzQ3N0Y5Q0YwODExRTVCREMzQzYxQjREMUJGRTk5IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkU0MzQ3N0ZBQ0YwODExRTVCREMzQzYxQjREMUJGRTk5Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+/+4ADkFkb2JlAGTAAAAAAf/bAIQAGxoaKR0pQSYmQUIvLy9CRz8+Pj9HR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHRwEdKSk0JjQ/KCg/Rz81P0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dH/8AAEQgAZABkAwEiAAIRAQMRAf/EAEsAAQEAAAAAAAAAAAAAAAAAAAAEAQEAAAAAAAAAAAAAAAAAAAAAEAEAAAAAAAAAAAAAAAAAAAAAEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH//2Q==`
        ;

        albumContent += `<div class="panel-body">`;
        albumContent += `   <label>`;
        albumContent += `       <input type="checkbox" class="album media-checkbox" checked value="${album.id}">`;
        albumContent += `       <div class="media">`;
        albumContent += `           <div class="media-left">`;
        albumContent += `               <img class="media-object" width="35" height="35" src="${coverUrl}">`;
        albumContent += `           </div>`;
        albumContent += `           <div class="media-body">`;
        albumContent += `               ${title}`;
        albumContent += `           </div>`;
        albumContent += `       </div>`;
        albumContent += `   </label>`;
        albumContent += `</div>`;
    });
    albumContent += `</div>`;

    artist.alsoAlbums.forEach((album, i) => {
        if (!('year' in album)) { // пример https://music.yandex.ru/artist/64248
            artist.alsoAlbums[i].year = 0;
        }
    });
    const sortedCompilations = artist.alsoAlbums.sort((a, b) => b.year - a.year);

    compilationContent += `<div class="panel panel-default panel-compilations">`;
    if (sortedCompilations.length) {
        const name = `Сборники (${sortedCompilations.length})`;
        compilationContent += `<h4 class="compilations"><label><input type="checkbox" id="compilationCheckbox" checked><b>${name}</b></label></h4>`;
    }
    year = 0;
    sortedCompilations.forEach((album) => {
        if (album.year !== year) {
            year = album.year;
            compilationContent += `<div class="panel-heading">`;
            compilationContent += `     <label class="label-year">${year === 0 ? 'Год не указан' : year}</label>`;
            compilationContent += `</div>`
        }

        let title = `[${album.trackCount}] ${album.title}`;

        if ('version' in album) {
            title += ` (${album.version})`;
        }

        let coverUrl = (album.coverUri)
            ? `https://${album.coverUri.replace('%%', '70x70')}`
            : `data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAZABkAAD/7AARRHVja3kAAQAEAAAAAAAA/+EDMWh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8APD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS41LWMwMjEgNzkuMTU1NzcyLCAyMDE0LzAxLzEzLTE5OjQ0OjAwICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo4QzkwMERDMUNGMDkxMUU1QkRDM0M2MUI0RDFCRkU5OSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo4QzkwMERDMENGMDkxMUU1QkRDM0M2MUI0RDFCRkU5OSIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxNCAoTWFjaW50b3NoKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkU0MzQ3N0Y5Q0YwODExRTVCREMzQzYxQjREMUJGRTk5IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkU0MzQ3N0ZBQ0YwODExRTVCREMzQzYxQjREMUJGRTk5Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+/+4ADkFkb2JlAGTAAAAAAf/bAIQAGxoaKR0pQSYmQUIvLy9CRz8+Pj9HR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHRwEdKSk0JjQ/KCg/Rz81P0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dH/8AAEQgAZABkAwEiAAIRAQMRAf/EAEsAAQEAAAAAAAAAAAAAAAAAAAAEAQEAAAAAAAAAAAAAAAAAAAAAEAEAAAAAAAAAAAAAAAAAAAAAEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH//2Q==`
        ;

        compilationContent += `<div class="panel-body">`;
        compilationContent += `   <label>`;
        compilationContent += `       <input type="checkbox" class="compilation media-checkbox" checked value="${album.id}">`;
        compilationContent += `       <div class="media">`;
        compilationContent += `           <div class="media-left">`;
        compilationContent += `               <img class="media-object" width="35" height="35" src="${coverUrl}">`;
        compilationContent += `           </div>`;
        compilationContent += `           <div class="media-body">`;
        compilationContent += `               ${title}`;
        compilationContent += `           </div>`;
        compilationContent += `       </div>`;
        compilationContent += `   </label>`;
        compilationContent += `</div>`;

    });
    compilationContent += `</div>`;

    $('name').innerText = artist.artist.name;
    $('info').innerText = 'Дискография';
    $('albums').innerHTML = albumContent;
    $('compilations').innerHTML = compilationContent;

    if (sortedAlbums.length) {
        $('albumCheckbox').addEventListener('click', () => {
            const toggle = $('albumCheckbox');
            const albums = document.getElementsByClassName('album');

            for (let i = 0; i < albums.length; i++) {
                albums[i].checked = toggle.checked;
            }
        });
    }
    if (sortedCompilations.length) {
        $('compilationCheckbox').addEventListener('click', () => {
            const toggle = $('compilationCheckbox');
            const compilations = document.getElementsByClassName('compilation');

            for (let i = 0; i < compilations.length; i++) {
                compilations[i].checked = toggle.checked;
            }
        });
    }
    $('addContainer').style.fontSize = '12px';
}

function generateDownloadLabel(label) {
    let albumContent = '';

    label.albums.forEach((album, i) => {
        if (!('year' in album)) {
            label.albums[i].year = 0;
        }
    });
    const sortedAlbums = label.albums.sort((a, b) => b.year - a.year);

    if (sortedAlbums.length) {
        const name = `Альбомы (${sortedAlbums.length})`;
        albumContent += `<h4 class="albums"><label><input type="checkbox" id="albumCheckbox" checked><b>${name}</b></label></h4>`;
    }
    let year = 0;

    albumContent += `<div class="panel panel-default panel-albums">`;
    sortedAlbums.forEach((album) => {
        if (album.year !== year) {
            year = album.year;
            albumContent += `<div class="panel-heading">`;
            albumContent += `<label class="label-year">${year === 0 ? 'Год не указан' : year}</label>`;
            albumContent += `</div>`
        }
        const artists = backgroundPage.fisher.utils.parseArtists(album.artists).artists.join(', ');

        let title = `${album.title}`;

        if ('version' in album) {
            title += ` (${album.version})`;
        }

        let coverUrl = (album.coverUri)
            ? `https://${album.coverUri.replace('%%', '70x70')}`
            : `data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAZABkAAD/7AARRHVja3kAAQAEAAAAAAAA/+EDMWh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8APD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS41LWMwMjEgNzkuMTU1NzcyLCAyMDE0LzAxLzEzLTE5OjQ0OjAwICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo4QzkwMERDMUNGMDkxMUU1QkRDM0M2MUI0RDFCRkU5OSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo4QzkwMERDMENGMDkxMUU1QkRDM0M2MUI0RDFCRkU5OSIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxNCAoTWFjaW50b3NoKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkU0MzQ3N0Y5Q0YwODExRTVCREMzQzYxQjREMUJGRTk5IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkU0MzQ3N0ZBQ0YwODExRTVCREMzQzYxQjREMUJGRTk5Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+/+4ADkFkb2JlAGTAAAAAAf/bAIQAGxoaKR0pQSYmQUIvLy9CRz8+Pj9HR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHRwEdKSk0JjQ/KCg/Rz81P0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dH/8AAEQgAZABkAwEiAAIRAQMRAf/EAEsAAQEAAAAAAAAAAAAAAAAAAAAEAQEAAAAAAAAAAAAAAAAAAAAAEAEAAAAAAAAAAAAAAAAAAAAAEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH//2Q==`
        ;

        const name = `[${album.trackCount}] ${artists} - ${title}`;

        albumContent += `<div class="panel-body">`;
        albumContent += `   <label>`;
        albumContent += `       <input type="checkbox" class="album media-checkbox" checked value="${album.id}">`;
        albumContent += `       <div class="media">`;
        albumContent += `           <div class="media-left">`;
        albumContent += `               <img class="media-object" width="35" height="35" src="${coverUrl}">`;
        albumContent += `           </div>`;
        albumContent += `           <div class="media-body">`;
        albumContent += `               ${name}`;
        albumContent += `           </div>`;
        albumContent += `       </div>`;
        albumContent += `   </label>`;
        albumContent += `</div>`;
    });
    albumContent += `</div>`;

    $('name').innerText = label.label.name;
    $('info').innerText = 'Лейбл';
    $('albums').innerHTML = albumContent;

    if (sortedAlbums.length) {
        $('albumCheckbox').addEventListener('click', () => {
            const toggle = $('albumCheckbox');
            const albums = document.getElementsByClassName('album');

            for (let i = 0; i < albums.length; i++) {
                albums[i].checked = toggle.checked;
            }
        });
    }
    $('addContainer').style.fontSize = '12px';
}

function generateDownloadTrack(track) {
    const artists = backgroundPage.fisher.utils.parseArtists(track.artists).artists.join(', ');
    const size = backgroundPage.fisher.utils.bytesToStr(track.fileSize);
    const duration = backgroundPage.fisher.utils.durationToStr(track.durationMs);

    $('name').innerText = `${artists} - ${track.title}`;
    $('info').innerText = `Трек / ${size} / ${duration}`;
}

function generateDownloadAlbum(album) {
    const artists = backgroundPage.fisher.utils.parseArtists(album.artists).artists.join(', ');

    $('name').innerText = `${artists} - ${album.title}`;
    if (!album.trackCount) {
        $('info').innerText = 'Пустой альбом';
        $('startDownloadBtn').style.display = 'none';
        backgroundPage.console.info(`Empty album: ${album.id}`);
        return;
    }
    let size = 0;
    let duration = 0;

    album.volumes.forEach((volume) => {
        volume.forEach((track) => {
            if ('error' in track) {
                return;
            }
            size += track.fileSize;
            duration += track.durationMs;
        });
    });
    const sizeStr = backgroundPage.fisher.utils.bytesToStr(size);
    const durationStr = backgroundPage.fisher.utils.durationToStr(duration);

    $('info').innerText = `Альбом (${album.trackCount}) / ${sizeStr} / ${durationStr}`;
}

function generateDownloadPlaylist(playlist) {
    $('name').innerText = playlist.title;
    if (!playlist.trackCount) {
        $('info').innerText = 'Пустой плейлист';
        $('startDownloadBtn').style.display = 'none';
        backgroundPage.console.info(`Empty playlist: ${playlist.owner.login}#${playlist.kind}`);
        return;
    }
    let size = 0;
    let duration = 0;

    playlist.tracks.forEach((track) => {
        if ('error' in track) {
            return;
        }
        size += track.fileSize;
        duration += track.durationMs;
    });
    const sizeStr = backgroundPage.fisher.utils.bytesToStr(size);
    const durationStr = backgroundPage.fisher.utils.durationToStr(duration);

    $('info').innerText = `Плейлист (${playlist.trackCount}) / ${sizeStr} / ${durationStr}`;
}

function onAjaxFail(error) {
    backgroundPage.console.error(error);
    hidePreloader();
    $('addContainer').classList.add('hidden');
    $('addBtn').classList.add('disabled');
    $('errorContainer').classList.remove('hidden');
}

function getBackgroundPage() {
    return new Promise((resolve) => {
        chrome.runtime.getBackgroundPage(resolve);
    });
}

chrome.runtime.onMessage.addListener(async(request) => {
    if (!request || request.action !== 'getCurrentTrackUrl' || !('link' in request)) {
        hidePreloader();
        $('downloadBtn').click();
        $('addBtn').classList.add('disabled');
        return;
    }
    const url = backgroundPage.fisher.yandex.baseUrl + request.link;
    const page = backgroundPage.fisher.utils.getUrlInfo(url);
    const downloadBtn = $('startDownloadBtn');

    downloadBtn.setAttribute('data-type', 'track');
    downloadBtn.setAttribute('data-trackId', page.trackId);
    if (backgroundPage.fisher.storage.current.singleClickDownload) {
        hidePreloader();
        downloadBtn.click();
        return;
    }
    let json;

    try {
        json = await backgroundPage.fisher.yandex.getTrack(page.trackId);
    } catch (e) {
        onAjaxFail(e);
        return;
    }
    hidePreloader();
    generateDownloadTrack(json.track);
});

async function loadPopup() {
    backgroundPage = await getBackgroundPage();
    let activeTab;

    try {
        activeTab = await backgroundPage.fisher.utils.getActiveTab();
    } catch (e) {
        onAjaxFail(e);
        return;
    }

    const page = backgroundPage.fisher.utils.getUrlInfo(activeTab.url);
    const downloadBtn = $('startDownloadBtn');

    if (page.isPlaylist) {
        downloadBtn.setAttribute('data-type', 'playlist');
        downloadBtn.setAttribute('data-username', page.username);
        downloadBtn.setAttribute('data-playlistId', page.playlistId);
        if (backgroundPage.fisher.storage.current.singleClickDownload) {
            hidePreloader();
            downloadBtn.click();
            return;
        }
        let playlist;

        try {
            playlist = await backgroundPage.fisher.yandex.getPlaylist(page.username, page.playlistId);
        } catch (e) {
            onAjaxFail(e);
            return;
        }
        hidePreloader();
        generateDownloadPlaylist(playlist);
    } else if (page.isTrack) {
        downloadBtn.setAttribute('data-type', 'track');
        downloadBtn.setAttribute('data-trackId', page.trackId);
        if (backgroundPage.fisher.storage.current.singleClickDownload) {
            hidePreloader();
            downloadBtn.click();
            return;
        }
        let json;

        try {
            json = await backgroundPage.fisher.yandex.getTrack(page.trackId);
        } catch (e) {
            onAjaxFail(e);
            return;
        }
        hidePreloader();
        generateDownloadTrack(json.track);
    } else if (page.isAlbum) {
        downloadBtn.setAttribute('data-type', 'album');
        downloadBtn.setAttribute('data-albumId', page.albumId);
        if (backgroundPage.fisher.storage.current.singleClickDownload) {
            hidePreloader();
            downloadBtn.click();
            return;
        }
        let album;

        try {
            album = await backgroundPage.fisher.yandex.getAlbum(page.albumId);
        } catch (e) {
            onAjaxFail(e);
            return;
        }
        hidePreloader();
        generateDownloadAlbum(album);
    } else if (page.isArtist) {
        downloadBtn.setAttribute('data-type', 'artistOrLabel');
        let artist;

        try {
            artist = await backgroundPage.fisher.yandex.getArtist(page.artistId);
        } catch (e) {
            onAjaxFail(e);
            return;
        }
        hidePreloader();
        generateDownloadArtist(artist);
        downloadBtn.setAttribute('data-name', artist.artist.name);
    } else if (page.isLabel) {
        downloadBtn.setAttribute('data-type', 'artistOrLabel');
        let label;

        try {
            label = await backgroundPage.fisher.yandex.getLabel(page.labelId);
        } catch (e) {
            onAjaxFail(e);
            return;
        }
        hidePreloader();
        generateDownloadLabel(label);
        downloadBtn.setAttribute('data-name', label.label.name);
    } else if (page.isMusic || page.isRadio) {
        chrome.tabs.sendMessage(activeTab.id, 'getCurrentTrackUrl');
    } else {
        hidePreloader();
        $('downloadBtn').click();
        $('addBtn').classList.add('disabled');
    }
}

loadPopup();
