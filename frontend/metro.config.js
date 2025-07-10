const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Performance optimizations
config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
    compress: {
      drop_console: true, // Remove console logs in production
      reduce_funcs: false,
    },
    output: {
      ascii_only: true,
      quote_style: 3,
      wrap_iife: true,
    },
  },
};

// Optimize resolution
config.resolver = {
  ...config.resolver,
  // Improve module resolution performance
  hasteImplModulePath: null,
  // Block list for files we don't need
  blockList: [
    /.*\.test\.(js|jsx|ts|tsx)$/,
    /.*\/__tests__\/.*/,
    /.*\.spec\.(js|jsx|ts|tsx)$/,
    /.*\.stories\.(js|jsx|ts|tsx)$/,
  ],
};

// Cache configuration for faster rebuilds
config.cacheStores = [
  new (require('metro-cache').FileStore)({
    root: './.metro-cache',
  }),
];

// Watcher configuration
config.watchFolders = [__dirname];
config.resetCache = false;

module.exports = config;