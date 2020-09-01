'use strict';
// 生产环境
const merge = require('webpack-merge');
const path = require('path');
const webpack = require('webpack');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
// const CompressionPlugin = require('compression-webpack-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const commonConfig = require('./webpack.common.js');
// const SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin');
// const ManifestPlugin = require('webpack-manifest-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Jarvis = require('webpack-jarvis');

const publicConfig = {
    devtool: 'cheap-module-source-map',
    module: {
        rules: [
            {
                test: /\.(css|scss)$/,
                use: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: ['css-loader', 'postcss-loader', 'sass-loader']
                })
            },
            {
                test: /\.(png|jpg|gif|svg|svgz)$/,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 10000,
                            name: 'static/images/[name].[hash:7].[ext]'
                        }
                    }
                    // 'image-webpack-loader' // imageloader会导致svg动画失效，不建议使用
                ]
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(['dist/**/*.*', 'dist/*.*'], {
            root: path.join(__dirname, '../'),
            verbose: true,
            dry: false
        }),
        new HtmlWebpackPlugin({
            inject: true,
            filename: 'index.html',
            template: path.join(__dirname, '../src/index.html'),
            minify: {
                removeComments: true,
                collapseWhitespace: true,
                removeRedundantAttributes: true,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                keepClosingSlash: true,
                minifyJS: true,
                minifyCSS: true,
                minifyURLs: true
            }
        }),
        new OptimizeCssAssetsPlugin({
            assetNameRegExp: /\.optimize\.css$/g,
            cssProcessor: require('cssnano'),
            cssProcessorOptions: { discardComments: { removeAll: true } },
            canPrint: true
        }),
        new webpack.optimize.ModuleConcatenationPlugin(),
        new webpack.optimize.OccurrenceOrderPlugin(true),
        new UglifyJSPlugin({
            uglifyOptions: {
                compress: {
                    warnings: false,
                    comparisons: false,
                    drop_debugger: true, // 去除debug
                    drop_console: true // 去除console.log
                },
                mangle: {
                    safari10: true
                },
                output: {
                    comments: false,
                    ascii_only: true
                }
            }
        }),
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify('production')
            }
        }),
        // 防止css注入到js中，单独抽离css 需要配合 rules使用
        new ExtractTextPlugin({
            filename: 'static/css/[name].[contenthash:5].css',
            allChunks: true
        }),
        // 编译日志
        // new Jarvis({
        //     watchOnly: false,
        //     port: 1337 // optional: set a port
        // })
        // sw离线缓存，一般用不到
        // new SWPrecacheWebpackPlugin({
        //     // By default, a cache-busting query parameter is appended to requests
        //     // used to populate the caches, to ensure the responses are fresh.
        //     // If a URL is already hashed by Webpack, then there is no concern
        //     // about it being stale, and the cache-busting can be skipped.
        //     dontCacheBustUrlsMatching: /\.\w{8}\./,
        //     filename: 'service-worker.js',
        //     staticFileGlobs: ['dist/**/*.{js,html,css}'],
        //     stripPrefix: 'dist/',
        //     logger(message) {
        //         if (message.indexOf('Total precache size is') === 0) {
        //             // This message occurs for every build and is a bit too noisy.
        //             return;
        //         }
        //         if (message.indexOf('Skipping static resource') === 0) {
        //             // This message obscures real errors so we ignore it.
        //             // https://github.com/facebookincubator/create-react-app/issues/2612
        //             return;
        //         }
        //         console.log(message);
        //     },
        //     minify: true,
        //     // For unknown URLs, fallback to the index page
        //     navigateFallback: './dist/index.html',
        //     // Ignores URLs starting from /__ (useful for Firebase):
        //     // https://github.com/facebookincubator/create-react-app/issues/2237#issuecomment-302693219
        //     navigateFallbackWhitelist: [/^(?!\/__).*/],
        //     // Don't precache sourcemaps (they're large) and build asset manifest:
        //     staticFileGlobsIgnorePatterns: [/\.map$/, /asset-manifest\.json$/]
        // }),
        // new ManifestPlugin({
        //     fileName: 'asset-manifest.json'
        // })
    ]
};

module.exports = merge(commonConfig, publicConfig);
