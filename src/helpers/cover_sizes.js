const MIN_SIZE = 10;
const MAX_SIZE = 2000;
const SIZE_INCREMENT = 5;
const coverUrl = 'https://avatars.yandex.net/get-music-content/d880c58e.a.2256742-1/';
const options = {
    method: 'HEAD',
    mode: 'cors'
};
const output = document.getElementById('output');

output.innerHTML += `MIN_SIZE = ${MIN_SIZE}<br>`;
output.innerHTML += `MAX_SIZE = ${MAX_SIZE}<br>`;
output.innerHTML += `SIZE_INCREMENT = ${SIZE_INCREMENT}<br>`;
output.innerHTML += `coverUrl = ${coverUrl}<br>`;

async function collectSizes() {
    output.innerHTML += '<br>Requesting...';

    for (let i = MIN_SIZE; i <= MAX_SIZE; i += SIZE_INCREMENT) {
        const size = `${i}x${i}`;
        const response = await fetch(coverUrl + size, options);

        if (response.ok) {
            output.innerHTML += `<br>${size}`;
        }
    }

    output.innerHTML += `<br>Finished!`;
}

collectSizes();
