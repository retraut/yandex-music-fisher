const output = document.getElementById('output');

let backgroundPage;

async function showGithubStatistics() {
    const DISTRIBUTION_ASSET_INDEX = 0;
    const releases = await fetch('https://api.github.com/repos/egoroof/yandex-music-fisher/releases')
        .then(backgroundPage.fisher.utils.parseJsonResponse);

    let totalDownloadCount = 0;

    output.innerHTML += 'GitHub statistics';
    releases.forEach((release) => {
        output.innerHTML += `<br>${release.name}: ${release.assets[DISTRIBUTION_ASSET_INDEX].download_count}`;
        totalDownloadCount += release.assets[DISTRIBUTION_ASSET_INDEX].download_count;
    });
    output.innerHTML += `<br>Total: ${totalDownloadCount}<br><br>`;
}

async function showBitbucketStatistics() {
    const info = await fetch('https://bitbucket.org/api/2.0/repositories/egoroof/yandex-music-fisher/downloads')
        .then(backgroundPage.fisher.utils.parseJsonResponse);

    let totalDownloadCount = 0;

    output.innerHTML += 'Bitbucket statistics';
    info.values.forEach((download) => {
        output.innerHTML += `<br>${download.name}: ${download.downloads}`;
        totalDownloadCount += download.downloads;
    });
    output.innerHTML += `<br>Total: ${totalDownloadCount}<br><br>`;
}

function getBackgroundPage() {
    return new Promise((resolve) => {
        chrome.runtime.getBackgroundPage(resolve);
    });
}

async function loadPage() {
    backgroundPage = await getBackgroundPage();
    showGithubStatistics();
    showBitbucketStatistics();
}

loadPage();
