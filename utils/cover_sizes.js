(() => {
    'use strict';
    'use strong';

    const MIN_SIZE = 10;
    const MAX_SIZE = 2000;
    const SIZE_INCREMENT = 5;
    const coverUrl = 'https://avatars.yandex.net/get-music-content/d880c58e.a.2256742-1/';
    const options = {
        method: 'HEAD',
        mode: 'cors'
    };

    let chain = Promise.resolve();
    let correctSizes = [];

    console.log('Requesting...');

    for (let i = MIN_SIZE; i <= MAX_SIZE; i += SIZE_INCREMENT) {
        const size = `${i}x${i}`;
        chain = chain.then(() => fetch(coverUrl + size, options))
            .then(response => {
                if (response.ok) {
                    correctSizes.push(size);
                }
            }).catch(e => console.error(e));
    }

    chain.then(() => {
        if (correctSizes.length) {
            console.log('Sizes:', correctSizes);
        } else {
            console.log('No correct sizes were found');
        }
    });

})();
