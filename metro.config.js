const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('traineddata')) {
  config.resolver.assetExts.push('traineddata');
}

module.exports = config;
