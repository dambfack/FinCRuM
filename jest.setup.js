// Import Jest DOM matchers
import '@testing-library/jest-dom';

// Set up environment variables for Google OAuth
process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/callback/google';

// Suppress punycode deprecation warning
process.noDeprecation = true;

// Mock Google OAuth configuration globally
jest.mock('./src/services/google-oauth', () => {
  const originalModule = jest.requireActual('./src/services/google-oauth');
  return {
    ...originalModule,
    isGoogleOAuthConfigured: jest.fn().mockReturnValue(true),
  };
});

// Add custom Jest matchers
import { expect } from '@jest/globals';

expect.extend({
  toBeCloseToDate(received, expected, precision = 1000) {
    const receivedTime = received.getTime();
    const expectedTime = expected.getTime();
    const pass = Math.abs(receivedTime - expectedTime) < precision;
    const message = pass
      ? () => `expected ${received} not to be close to ${expected}`
      : () => `expected ${received} to be close to ${expected}`;
    return { pass, message };
  },
});

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  useSearchParams() {
    return {
      get: jest.fn(),
    };
  },
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: { name: 'Test User', email: 'test@example.com' } },
    status: 'authenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.URL.createObjectURL
window.URL.createObjectURL = jest.fn();
