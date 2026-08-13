module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          unstable_transformImportMeta: true,
          // Force the hermes-v0 transform profile so that private class fields
          // (#field syntax introduced in react-native@0.83) are compiled down to
          // Object.defineProperty form before hermesc runs.
          //
          // Background: babel-preset-expo defaults to "hermes-stable" when the
          // engine is "hermes", which assumes the Hermes runtime natively handles
          // private fields. hermes-compiler@0.14 (shipped with Expo SDK 57) does
          // NOT support private fields, causing createBundleReleaseJsAndAssets to
          // fail. "hermes-v0" forces the transform on all files including
          // node_modules, fixing the Android release build.
          unstable_transformProfile: 'hermes-v0',
        },
      ],
    ],
  };
};
