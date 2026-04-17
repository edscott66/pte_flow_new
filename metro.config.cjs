const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude server-side files from the Metro bundle
config.resolver.blacklistRE = [
  /server\.ts$/,
  /vite\.config\.ts$/,
  /dist-server\/.*/,
  /dist\/.*/,
];

// Ensure Metro can resolve all dependencies
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

module.exports = config;
