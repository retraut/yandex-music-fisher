const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const isFirefox = process.argv[2] === '--firefox';
const isOpera = process.argv[2] === '--opera';

const platform = (isFirefox) ? 'firefox' : (isOpera) ? 'opera' : 'chromium';
const distFolder = path.join(__dirname, 'dist', platform);

module.exports = {
    context: path.join(__dirname, 'src'),
    entry: {
        background: './background/background.js',
        content: './content.js',
        options: './options/options.js',
        popup: './popup/popup.js'
    },
    output: {
        path: path.join(distFolder, 'bundle'),
        filename: '[name].bundle.js'
    },
    module: {
        loaders: [{
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel-loader'
        }]
    },
    plugins: [
        new CopyWebpackPlugin([{
            from: 'vendor',
            to: path.join(distFolder, 'vendor')
        }, {
            from: 'popup',
            to: path.join(distFolder, 'popup')
        }, {
            from: 'options',
            to: path.join(distFolder, 'options')
        }, {
            from: 'background',
            to: path.join(distFolder, 'background')
        }], {
            ignore: ['*.js']
        })
    ]
};
