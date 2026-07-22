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
    // Production builds (EAS): set EXPO_PUBLIC_API_HOST to your deployed domain.
    // Dev builds: falls back to the Replit shared-proxy dev domain.
    apiHost:
      process.env.EXPO_PUBLIC_API_HOST ??
      process.env.REPLIT_EXPO_DEV_DOMAIN ??
      'localhost',
    eas: {
      projectId: 'c2f8bd92-6111-4050-a3d4-6a6b86c18291',
    },
  },
};
