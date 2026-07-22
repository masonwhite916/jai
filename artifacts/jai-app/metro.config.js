const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude Next.js from Metro's file watcher — Next.js creates temporary
// directories (next_tmp_*) during compilation that Metro tries to watch,
// causing ENOENT crashes when they are removed after build.
config.resolver.blockList = [
  /node_modules\/\.pnpm\/next@.*/,
  /.*\/next_tmp_.*/,
  /.*\/\.next\/.*/,
];

module.exports = config;
