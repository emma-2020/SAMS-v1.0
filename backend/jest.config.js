// jest.config.js
'use strict';

module.exports = {
  testEnvironment: 'node',
  testMatch:       ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',   // entry point — not unit testable
  ],
  coverageThreshold: {
    global: {
      branches:   70,
      functions:  80,
      lines:      80,
      statements: 80,
    },
  },
  // Reset all mocks between tests
  clearMocks:   true,
  resetMocks:   true,
  restoreMocks: true,
};
