const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Resolve packages: mobile first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force all React and React Native packages to the mobile-local copy.
// npm workspaces hoists these to root node_modules where they conflict
// with the versions registered in the Expo Go native runtime.
const mobileModules = (name) => path.resolve(projectRoot, 'node_modules', name);

config.resolver.extraNodeModules = {
  'react':                               mobileModules('react'),
  'react-dom':                           mobileModules('react-dom'),
  'react-native':                        mobileModules('react-native'),
  'react-native-safe-area-context':      mobileModules('react-native-safe-area-context'),
  'react-native-screens':                mobileModules('react-native-screens'),
  'react-native-reanimated':             mobileModules('react-native-reanimated'),
  '@react-native-async-storage/async-storage': mobileModules('@react-native-async-storage/async-storage'),
  '@react-navigation/native':            mobileModules('@react-navigation/native'),
  '@react-navigation/core':              mobileModules('@react-navigation/core'),
};

module.exports = config;
