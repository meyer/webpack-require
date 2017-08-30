// webpack.config.js
module.exports = {
  entry: './entrypoint.js',
  output: {
    filename: 'bundle.js',
    path: 'build',
  },
  module: {
    rules: [
      {
        test: /\.(png|jpg)$/,
        loader: 'url-loader',
        options: {
          limit: 8192,
        },
      },
    ],
  },
};
