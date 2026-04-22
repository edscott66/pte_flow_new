const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Disable package exports to avoid resolution errors on Windows for Firebase and GenAI
config.resolver.unstable_enablePackageExports = false;

// USE A CUSTOM RESOLVER FOR ROCK-SOLID RESOLUTION
// This forces specific problematic packages to use their React Native / Browser entry points
const EXTRA_NODE_MODULES = {
  '@firebase/app': path.resolve(__dirname, 'node_modules/@firebase/app/dist/index.cjs.js'),
  '@firebase/auth': path.resolve(__dirname, 'node_modules/@firebase/auth/dist/rn/index.js'),
  '@firebase/firestore': path.resolve(__dirname, 'node_modules/@firebase/firestore/dist/index.rn.js'),
  '@google/genai': path.resolve(__dirname, 'node_modules/@google/genai/dist/web/index.mjs'),
  // Unscoped mappings for broader compatibility
  'firebase/app': path.resolve(__dirname, 'node_modules/@firebase/app/dist/index.cjs.js'),
  'firebase/auth': path.resolve(__dirname, 'node_modules/@firebase/auth/dist/rn/index.js'),
  'firebase/firestore': path.resolve(__dirname, 'node_modules/@firebase/firestore/dist/index.rn.js'),
  // Node.js polyfills
  'path': path.resolve(__dirname, 'empty-module.js'),
  'fs': path.resolve(__dirname, 'empty-module.js'),
  'os': path.resolve(__dirname, 'empty-module.js'),
  'crypto': path.resolve(__dirname, 'empty-module.js'),
  'stream': path.resolve(__dirname, 'empty-module.js'),
};

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  ...EXTRA_NODE_MODULES,
};

// Force resolver to look into our EXTRA_NODE_MODULES first
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (EXTRA_NODE_MODULES[moduleName]) {
    return {
      filePath: EXTRA_NODE_MODULES[moduleName],
      type: 'sourceFile',
    };
  }
  
  // Handle sub-folder imports which might be tricky
  if (moduleName.startsWith('firebase/auth/')) {
     const subPath = moduleName.replace('firebase/auth/', '');
     return {
       filePath: path.resolve(__dirname, `node_modules/@firebase/auth/dist/rn/${subPath}.js`),
       type: 'sourceFile',
     };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

const escape = (str) => str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');

// Support modern module extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Filter out server-side files, correctly anchored to the project root
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : (config.resolver.blockList ? [config.resolver.blockList] : [])),
  new RegExp(`^${escape(path.resolve(__dirname, 'server.ts'))}$`),
  new RegExp(`^${escape(path.resolve(__dirname, 'vite.config.ts'))}$`),
  new RegExp(`^${escape(path.resolve(__dirname, 'api'))}[\\\\/].*`),
  new RegExp(`^${escape(path.resolve(__dirname, 'dist'))}[\\\\/].*`),
  new RegExp(`^${escape(path.resolve(__dirname, 'dist-server'))}[\\\\/].*`),
];

module.exports = config;
