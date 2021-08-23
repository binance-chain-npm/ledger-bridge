const path = require('path');

const HtmlPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const paths = {
  bbcSrc: path.join(__dirname, '../src/bbc/firefox-u2f/gh/index.ts'),
  bbcDist: path.join(__dirname, '../dist/gh/bbc'),
  bscSrc: path.join(__dirname, '../src/bsc/firefox-u2f/gh/index.ts'),
  bscDist: path.join(__dirname, '../dist/gh/bsc'),
};

const bbcConfig = {
  name: 'bbc-bridge',
  mode: 'production',
  devtool: undefined,

  entry: paths.bbcSrc,
  output: {
    path: paths.bbcDist,
    filename: 'bundle.js',
  },

  resolve: {
    extensions: ['.ts', '.js'],
  },

  module: {
    rules: [{ test: /\.tsx?$/, use: ['babel-loader', 'ts-loader'] }],
  },

  plugins: [
    new HtmlPlugin({
      template: path.join(__dirname, './gh.html'),
    }),
    new webpack.ProgressPlugin(),
  ],
};

const bscConfig = {
  ...bbcConfig,
  name: 'bsc-bridge',
  entry: paths.bscSrc,
  output: {
    path: paths.bscDist,
    filename: 'bundle.js',
  },
};

module.exports = [bbcConfig, bscConfig];
