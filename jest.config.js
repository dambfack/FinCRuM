module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/styles/(.*)$': '<rootDir>/src/styles/$1',
    '\\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/cypress/'
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/types.ts',
    '!src/pages/_app.tsx',
    '!src/pages/_document.tsx',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/cypress/**',
    '!**/coverage/**',
    '!**/*.config.js',
    '!**/*.setup.js',
  ],
  coverageDirectory: '<rootDir>/coverage/jest',
  coverageReporters: ['json', 'lcov', 'text', 'clover', 'html', 'cobertura'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'junit.xml',
      },
    ],
    [
      'jest-sonar',
      {
        outputDirectory: 'test-results',
        outputName: 'sonar-report.xml',
      },
    ],
  ],
  testResultsProcessor: 'jest-sonar-reporter',
};
