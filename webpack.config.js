const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (_env, argv) => ({
  entry: './src/index.ts',
  mode: argv.mode || 'development',
  devtool: argv.mode === 'production' ? 'source-map' : 'eval-source-map',
  output: {
    filename: argv.mode === 'production' ? 'assets/[name].[contenthash:8].js' : 'assets/[name].js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: 'auto',
    clean: true,
  },
  devServer: { host: '127.0.0.1', port: 8080, hot: true, client: { overlay: true } },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: { loader: 'ts-loader', options: { transpileOnly: true } },
      },
      {
        test: /\.module\.less$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: argv.mode !== 'production',
              modules: { localIdentName: '[local]_[hash:base64:5]' },
            },
          },
          { loader: 'less-loader', options: { sourceMap: argv.mode !== 'production' } },
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', { loader: 'css-loader', options: { sourceMap: argv.mode !== 'production' } }],
      },
    ],
  },
  resolve: { extensions: ['.ts', '.tsx', '.js'] },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/index.html'),
      favicon: path.resolve(__dirname, 'public/favicon.svg'),
    }),
  ],
});
