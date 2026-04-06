const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude server-side files from the Metro bundle
config.resolver.blacklistRE = [
  /server\.ts$/,
  /vite\.config\.ts$/,
  /dist-server\/.*/,
  /dist\/.*/,
];

module.exports = config;
