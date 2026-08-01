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

  return config;
};
