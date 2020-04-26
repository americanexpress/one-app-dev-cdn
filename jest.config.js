const amexJestPreset = require('amex-jest-preset/jest-preset');

delete amexJestPreset.setupTestFrameworkScriptFile;

module.exports = {
  ...amexJestPreset,
  collectCoverageFrom: ['src/**/*.{js}'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
