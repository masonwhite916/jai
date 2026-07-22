// app.config.js – dynamic Expo config that exposes server-side env vars
// to the Expo client as `Constants.expoConfig.extra`.
// This file is evaluated at build/start time by Metro, so process.env is
// available here even though it is NOT available in React Native bundles.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const baseConfig = require('./app.json');

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  ...baseConfig.expo,
  extra: {
    // The Replit shared-proxy host for this Expo app — used by the client
    // to reach the API server artifact at /api.
    apiHost: process.env.REPLIT_EXPO_DEV_DOMAIN ?? 'localhost',
  },
};
