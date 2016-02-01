const path = require('path');

module.exports = {
    entry: {
        // extension files
        background: './src/js/background.js',
        content: './src/js/content.js',
        popup: './src/popup/popup.js',
        options: './src/options/options.js',

        // helpers
        cover_sizes: './src/helpers/cover_sizes.js',
        get_track_page_url: './src/helpers/get_track_page_url.js'
    },
    output: {
        path: path.join(__dirname, 'src', 'bundle'),
        filename: '[name].bundle.js'
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader'
            }
        ]
    }
};
