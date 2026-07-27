/** @type {import('jest').Config} */
module.exports = {
  // Use ts-jest directly — no React Native runtime needed for pure utility tests.
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { strict: false } }],
  },
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/*.test.[jt]s?(x)'],
  // Only pick up files that do NOT import React Native modules.
  testPathIgnorePatterns: ['/node_modules/'],
};
