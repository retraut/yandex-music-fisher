const output = document.getElementById('output');

let backgroundPage;

function getBackgroundPage() {
    return new Promise((resolve) => {
        chrome.runtime.getBackgroundPage(resolve);
    });
}

async function loadPage() {
    backgroundPage = await getBackgroundPage();
}

document.getElementById('trackIdInput').addEventListener('input', async function (event) {
    const trackId = parseInt(event.target.value, 10);

    let response;

    try {
        response = await backgroundPage.fisher.yandex.getTrack(trackId);
    } catch (e) {
        output.innerHTML = 'Network error';
    }

    const track = response.track;

    if ('error' in track) {
        output.innerHTML = `Track error: ${track.error}`;
        return;
    }

    const artists = backgroundPage.fisher.utils.parseArtists(track.artists).artists.join(', ');

    let title = track.title;

    if ('version' in track) {
        title += ` (${track.version})`;
    }
    output.innerHTML = `${artists} - ${title}`;
    track.albums.forEach((album) => {
        const url = `${backgroundPage.fisher.yandex.baseUrl}/album/${album.id}/track/${trackId}`;

        output.innerHTML += `<br><a href="${url}" target="_blank">${url}</a>`;
    });
});

loadPage();
