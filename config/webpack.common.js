'use strict';
const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const commonConfig = {
  stats: {
    assets: true,
    version: true,
    hash: true,
    chunkOrigins: false,
    modules: false,
    timings: true,
    errorDetails: true,
    colors: true,
  },
  node: {
    fs: 'empty', //  Can't resolve 'fs' 这个问题的解决方式
  },
  entry: {
    app: ['babel-polyfill', path.join(__dirname, '../src/index.js')],
    vendor: ['react', 'react-router-dom', 'react-dom'],
  },
  output: {
    path: path.join(__dirname, '../dist'),
    filename: 'static/js/[name].[chunkhash].js',
    chunkFilename: 'static/js/[name].[chunkhash].js',
    publicPath: '/',
  },
  module: {
    rules: [
      // {
      //     test: /src\\pages(\\.*).(jsx|js)/,
      //     include: /src/,
      //     exclude: /node_modules/,
      //     use: [
      //         {
      //             loader: 'bundle-loader',
      //             options: {
      //                 lazy: true,
      //                 name: '[name].async'
      //             }
      //         }
      //     ]
      // },
      {
        test: /\.(jsx|js)$/,
        use: [
          {
            loader: 'babel-loader?cacheDirectory=true',
            options: {},
          },
        ],
        include: path.join(__dirname, '../src'),
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac|pmd|vmd|bmp|pmx|wav)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'static/media/[name].[hash:7].[ext]',
        },
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'static/fonts/[name].[hash:7].[ext]',
        },
      },
      {
        test: /\.worker\.js$/,
        loader: 'worker-loader',
        options: {
        //   inline: true,
          publicPath: '/',
          name: 'worker.[hash].js',
        },
      },
    ],
  },
  plugins: [
    // copy custom static assets
    new CopyWebpackPlugin([
      {
        from: path.resolve(__dirname, '../src/manifest.json'),
        to: path.resolve(__dirname, '../dist/'),
      },
      {
        from: path.resolve(__dirname, '../src/favicon.ico'),
        to: path.resolve(__dirname, '../dist/'),
      },
      {
        from: path.resolve(__dirname, '../src/static/'),
        to: path.resolve(__dirname, '../dist/static/media/'),
      },
    ]),
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    new webpack.HashedModuleIdsPlugin(),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'manifest',
      minChunks: Infinity,
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'runtime',
    }),
    // 全局插件挂载
    new webpack.ProvidePlugin({
      THREE: 'three',
    }),
  ],
  resolve: {
    extensions: ['.web.js', '.mjs', '.js', '.json', '.web.jsx', '.jsx'], // 以结尾的可以省略后缀
    alias: {
      // 别名系统
      // 我们可以通过 page/... 或者 component/... 访问文件
      // 相当于nuxt的~/ 或者配置 @/...
      '@': path.join(__dirname, '../src'),
      assets: path.join(__dirname, '../src/assets'),
      pages: path.join(__dirname, '../src/pages'),
      components: path.join(__dirname, '../src/components'),
      routers: path.join(__dirname, '../src/routers'),
      actions: path.join(__dirname, '../src/redux/actions'),
      reducers: path.join(__dirname, '../src/redux/reducers'),
      utils: path.join(__dirname, '../src/utils'),
      dist: path.join(__dirname, '../dist'),
    },
  },
};
module.exports = commonConfig;
