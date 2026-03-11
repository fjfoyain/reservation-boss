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
// npm workspaces hoists react-native to root node_modules where it resolves
// to root's react@19.2.4, but react-native@0.81.5 requires react@19.1.0.
// extraNodeModules is only a fallback, so we use resolveRequest (always called)
// to hard-redirect 'react' and subpaths to mobile's local react@19.1.0.
const mobileModules = (name) => path.resolve(projectRoot, 'node_modules', name);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    // Resolve from projectRoot so node resolution finds apps/mobile/node_modules/react
    return context.resolveRequest(
      { ...context, originModulePath: path.join(projectRoot, '_resolveHelper.js') },
      moduleName,
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

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
