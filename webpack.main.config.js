const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  target: 'electron-main',
  entry: './src/main/main.ts',
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: 'main.js',
    library: {
      type: 'commonjs2',
    },
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  externals: {
    electron: 'commonjs2 electron',
    'node-pty': 'commonjs2 node-pty',
    'electron-store': 'commonjs2 electron-store',
    chokidar: 'commonjs2 chokidar',
    'simple-git': 'commonjs2 simple-git',
  },
  externalsType: 'commonjs2',
  externalsPresets: { node: true },
  node: {
    __dirname: false,
    __filename: false,
  },
};
