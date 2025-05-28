import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:9002',
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 800,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 60000,
    env: {
      // Environment variables for testing
      googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      googleTestUser: process.env.CYPRESS_GOOGLE_TEST_USER,
      googleTestPass: process.env.CYPRESS_GOOGLE_TEST_PASS,
    },
    setupNodeEvents(on, config) {
      // Implement node event listeners here
      return config;
    },
  },
});
