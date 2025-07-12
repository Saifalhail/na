const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Get the project directory
const projectRoot = __dirname;

let config;
try {
  config = getDefaultConfig(projectRoot);
} catch (error) {
  console.warn('Warning: Unable to load default Expo Metro config, falling back to basic config');
  console.warn('Error:', error.message);
  
  // Fallback config for WSL/OneDrive environments
  config = {
    resolver: {
      sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json', 'cjs'],
      assetExts: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'ttf', 'otf', 'woff', 'woff2'],
    },
    transformer: {
      babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
      minifierPath: 'metro-minify-terser',
    },
    server: {
      port: 8081,
    },
  };
}

// WSL + OneDrive specific optimizations
const isWSL = process.platform === 'linux' && process.env.WSL_DISTRO_NAME;
const isOneDrive = projectRoot.includes('OneDrive');

if (isWSL || isOneDrive) {
  console.log('Detected WSL/OneDrive environment, applying optimizations...');
  
  // Enhanced resolver configuration for WSL
  config.resolver = {
    ...config.resolver,
    // Ensure source maps work properly in WSL
    sourceExts: [...(config.resolver?.sourceExts || []), 'cjs', 'mjs'],
    
    // More comprehensive blocklist for WSL/OneDrive
    blockList: [
      // Block hidden files and directories
      /\/\..*/,
      // Block test files
      /__tests__\/.*/,
      // Block coverage reports
      /coverage\/.*/,
      // Block node_modules duplicates
      /node_modules\/.*\/node_modules/,
      // Block Windows-specific paths that can cause issues
      /\$Recycle\.Bin/,
      /System Volume Information/,
      // Block OneDrive sync files
      /\.tmp$/,
      /~\$.*\.tmp$/,
    ],
    
    // Enhanced node modules resolution for WSL
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(projectRoot, '..', 'node_modules'),
    ],
  };

  // Optimize file watching for WSL/OneDrive
  config.watchFolders = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(projectRoot, 'src'),
  ];
}

// Enhanced caching for better performance
const { FileStore } = require('metro-cache');
config.cacheStores = [
  new FileStore({
    root: path.join(projectRoot, '.metro-cache'),
  }),
];

// Improved transformer configuration
config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
  // Enable Hermes bytecode for better performance
  hermesCommand: process.env.NODE_ENV === 'production' ? 
    './node_modules/react-native/sdks/hermesc/linux64-bin/hermesc' : undefined,
};

// Enhanced server configuration
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Add CORS headers for mobile development
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      // Handle OPTIONS requests
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }
      
      return middleware(req, res, next);
    };
  },
};

// Additional optimizations for Metro
config.resetCache = true;

module.exports = config;