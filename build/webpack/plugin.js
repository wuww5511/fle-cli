var path = require('path');
var webpack = require('webpack');
var notifier = require('node-notifier');

var config = require('./config');
var resolve = require('../utils').resolve;

var InlineManifestWebpackPlugin = require('inline-manifest-webpack-plugin');
var VconsolePlugin = require('vconsole-webpack-plugin');
var OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin');
var BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

// 这里将 Node 中使用的变量也传入到 Web 环境中，以方便使用
exports.define = () => {
  return new webpack.DefinePlugin({
    'process.env': {
      NODE_ENV: JSON.stringify(config.dev ? 'development' : 'production')
    }
  });
}

// 提取Loader定义到同一地方（兼容老版本loader）
exports.loader = () => {
  return new webpack.LoaderOptionsPlugin({
    minimize: !config.dev,
    debug: config.dev,
    options: {
      context: '/'
    }
  });
}

exports.dll = () => {
  return new webpack.DllPlugin({
    name: 'vendor_[hash]',
    path: resolve('.cache/dll/dll-manifest.json')
  });
}

// 映射dll
exports.dllReference = () => {
  return new webpack.DllReferencePlugin({
    manifest: resolve('.cache/dll/dll-manifest.json')
  });
}

// 启用HMR
exports.hmr = () => {
  return new webpack.HotModuleReplacementPlugin();
}

// 在控制台中输出可读的模块名
exports.namedModules = () => {
  return new webpack.NamedModulesPlugin();
}

// 避免发出包含错误的模块
exports.noErrors = () => {
  return new webpack.NoEmitOnErrorsPlugin();
}

// hash
exports.hash = () => {
  return new webpack.HashedModuleIdsPlugin();
}

// 使用 Scope Hoisting 特性
exports.scope = () => {
  return new webpack.optimize.ModuleConcatenationPlugin();
}

//代码压缩插件
exports.uglify = () => {
  return new webpack.optimize.UglifyJsPlugin({
    exclude:/\.min\.js$/,
    parallel: true,
    sourceMap: false,
    compress: {
      unused: true,
      warnings: false,
      drop_debugger: true
    },
    output: {
      comments: false
    }
  });
}

// Merge chunks
exports.merge = () => {
  return new webpack.optimize.AggressiveMergingPlugin();
}

// 抽离第三方依赖
exports.commonsChunk = (opt = {}) => {
  return new webpack.optimize.CommonsChunkPlugin({
    names: ['common/_base'].concat(opt.commons),
    filename: opt.filename ? opt.filename : '[name].[chunkhash:8].js',
    // minChunks: (module) => {
    //   if(module.resource && !(/\.js$/.test(module.resource))) {
    //     return false;
    //   }
    //   return module.context && module.context.includes('node_modules');
    // }
  });
}

exports.commonsAsync = () => {
  // This instance extracts shared chunks from code splitted chunks and bundles them
  // in a separate chunk, similar to the vendor chunk
  // see: https://webpack.js.org/plugins/commons-chunk-plugin/#extra-async-commons-chunk
  new webpack.optimize.CommonsChunkPlugin({
    name: 'app',
    async: 'vendor-async',
    children: true,
    minChunks: 3
  });
}

exports.commonsManifest = (opt = {}) => {
  // extract webpack runtime and module manifest to its own file in order to
  // prevent vendor hash from being updated whenever app bundle is updated
  return new webpack.optimize.CommonsChunkPlugin({
    name: 'manifest',
    filename: opt.filename ? opt.filename : 'common/manifest.[chunkhash:8].js',
    minChunks: Infinity
  });
}

// 将manifest内联到html中，避免多发一次请求
exports.inlineManifest = () => {
  return new InlineManifestWebpackPlugin({
    name: 'webpackManifest'
  });
}

// 开启vconsole
exports.vconsole = () => {
  return new VconsolePlugin({
    enable: true
  });
}

// 优化控制台输出
exports.friendlyErrors = () => {
  return new FriendlyErrorsPlugin({
    compilationSuccessInfo: {
      messages: [`Listening at http://${config.fle.host}:${config.fle.port}/`]
    },
    onErrors: (severity, errors) => {
      if (!config.fle.notify) return;
      if (severity !== 'error') return;

      var error = errors[0];
      var filename = error.file && error.file.split('!').pop();

      notifier.notify({
        title: path.basename(resolve('.')),
        message: severity + ': ' + error.name,
        subtitle: filename || '',
        icon: path.join(__dirname, '../.share/images/logo.png')
      });
    }
  });
}

// 分离css文件
exports.extractCSS = (opt = {}) => {
  return new ExtractTextPlugin({
    allChunks: true,
    filename: opt.filename ? opt.filename : 'css/[name].[contenthash:8].css'
  });
}

// 优化css打包，避免重复打包
exports.optimizeCSS = () => {
  return new OptimizeCssAssetsPlugin({
    assetNameRegExp: /(\.module)?\.css$/g,
    cssProcessorOptions: {
      discardComments: {
        removeAll: true
      }
    },
    canPrint: true
  });
}

// 模块依赖分析
exports.analyzer = (opt = {}) => {
  return new BundleAnalyzerPlugin({
    openAnalyzer: true,
    analyzerMode: 'static', // server, static
    reportFilename: opt.filename ? opt.filename : resolve('.cache/report.html')
  });
}

var htmlDefaults = {
  title: 'fle-cli',
  keywords: '',
  description: '',
  icon: '',
  css: config.fle.css,
  prejs: config.fle.prejs,
  js: config.fle.js,
  filename: 'html/404.html',
  template: path.join(__dirname, '../.share/template/default.html'),
  inject: true,
  chunks: [],
  chunksSortMode: 'dependency',
  minify: config.dev ? null : {
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
};

exports.html = (opt = {}) => {
  return new HtmlWebpackPlugin(Object.assign({}, htmlDefaults, opt));
}