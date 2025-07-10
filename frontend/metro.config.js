const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enhanced file exclusions for WSL + OneDrive compatibility
const existingBlockList = config.resolver.blockList || [];
const additionalBlocks = [
  // Exclude temporary files and OneDrive sync files
  /node_modules\/.*\/\..*/, // Hidden files in node_modules
  /.*\.(tmp|lock|swp|swo)$/, // Temporary files
  /.*-[A-Fa-f0-9]{8}$/, // Random suffix temp files (like acorn)
  /\.bin\/\..+/, // Hidden files in .bin directories
  /.*\.tmp$/, // Additional tmp files
  /.*~$/, // Backup files
  /.*\.(crdownload|part|download)$/, // Download files
];

config.resolver.blockList = Array.isArray(existingBlockList) 
  ? [...existingBlockList, ...additionalBlocks]
  : additionalBlocks;

// Optimized file watching for WSL + OneDrive
config.watchFolders = [__dirname];

// Enhanced server configuration to handle permission issues
config.server = {
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Bypass temp file requests that cause permission errors
      if (
        req.url?.includes('.bin/.') ||
        req.url?.match(/-[A-Fa-f0-9]{8}$/) ||
        req.url?.includes('.tmp') ||
        req.url?.endsWith('~')
      ) {
        res.statusCode = 200;
        res.end();
        return;
      }
      return middleware(req, res, next);
    };
  },
};

// Optimize for WSL file system performance
config.transformer = {
  ...config.transformer,
  // Reduce file system calls
  enableBabelRCLookup: false,
  enableBabelRuntime: false,
};

// Cache configuration for faster rebuilds on WSL
config.cacheStores = [
  new (require('metro-cache').FileStore)({
    root: './.metro-cache',
  }),
];

module.exports = config;
