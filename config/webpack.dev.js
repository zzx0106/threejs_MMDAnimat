'use strict';
// 开发环境
const merge = require('webpack-merge');
const path = require('path');
var webpack = require('webpack');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const WatchMissingNodeModulesPlugin = require('react-dev-utils/WatchMissingNodeModulesPlugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const commonConfig = require('./webpack.common.js');

const devConfig = {
    // dev环境不打印压缩日志
    stats: {
        assets: false,
        version: false,
        hash: false,
        chunkOrigins: false,
        modules: false,
        timings: false,
        errorDetails: false,
        colors: true,
    },
    devtool: 'inline-source-map',
    entry: {
        app: ['babel-polyfill', 'react-hot-loader/patch', path.join(__dirname, '../src/index.js')],
    },
    output: {
        filename: '[name].[hash].js',
    },
    module: {
        rules: [
            {
                test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
                loader: 'url-loader',
                options: {
                    limit: 10000,
                    name: 'static/img/[name].[hash:7].[ext]',
                },
            },
            {
                test: /\.(css|scss)$/,
                use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader'],
            },
        ],
    },
    devServer: {
        contentBase: path.join(__dirname, '../dist'),
        historyApiFallback: true, // 路由开启history模式
        port: 10888,
        host: '0.0.0.0',
        compress: true, // 开启服务端压缩
        clientLogLevel: 'none', // 去除Hot的日志
        hot: true, // 热加载
    },
    plugins: [
        new HtmlWebpackPlugin({
            inject: true,
            filename: 'index.html',
            template: path.join(__dirname, '../src/index.html'),
            hash: true, //为了开发中js有缓存效果，所以加入hash，这样可以有效避免缓存JS
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
                minifyURLs: true,
            },
        }),
        // 此插件允许你安装库后自动重新构建打包文件。
        new WatchMissingNodeModulesPlugin(path.join(__dirname, '../node_modules')),
        new CaseSensitivePathsPlugin(),
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify('development'),
            },
        }),
        new webpack.NamedModulesPlugin(),
        new webpack.HotModuleReplacementPlugin(), // 热加载
    ],
};
module.exports = merge({
    customizeArray(a, b, key) {
        /*entry.app不合并，全替换*/
        if (key === 'entry.app') {
            return b;
        }
        return undefined;
    },
})(commonConfig, devConfig);
