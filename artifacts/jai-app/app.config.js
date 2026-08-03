/**
 * Dynamic Expo config — extends app.json and injects the Google Maps
 * Android API key from the GOOGLE_MAPS_API_KEY environment variable.
 *
 * Without this key, react-native-maps crashes to a white screen on
 * Android builds (the tracking screen). For EAS builds, the variable
 * must also exist in the EAS project environment.
 */
const appJson = require('./app.json');

module.exports = () => {
  const config = { ...appJson.expo };

  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (mapsKey) {
    config.android = {
      ...config.android,
      config: {
        ...(config.android?.config ?? {}),
        googleMaps: { apiKey: mapsKey },
      },
    };
  }

  // Inject API host so getApiBaseUrl() resolves the real backend on device.
  // REPLIT_DEV_DOMAIN / EXPO_PUBLIC_DOMAIN are set by the Expo workflow command.
  config.extra = {
    ...(config.extra ?? {}),
    // Resolution order:
    //   1. REPLIT_DEV_DOMAIN — set automatically by the Expo workflow in Replit dev
    //   2. EXPO_PUBLIC_DOMAIN — legacy Replit alias
    //   3. EXPO_PUBLIC_API_HOST — injected by eas.json "env" for preview/production builds
    //   4. localhost — last-resort fallback (only works in an emulator)
    apiHost: process.env.REPLIT_DEV_DOMAIN
      ?? process.env.EXPO_PUBLIC_DOMAIN
      ?? process.env.EXPO_PUBLIC_API_HOST
      ?? 'localhost',
  };

  return config;
};
