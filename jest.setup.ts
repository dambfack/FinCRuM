// Import Jest Native Matchers
import '@testing-library/jest-native/extend-expect';
import React from 'react';

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

// Add custom matchers
(expect as any).extend({
  toBeInTheDocument(element) {
    if (!element) {
      return {
        pass: false,
        message: () => 'Element is not in the document',
      };
    }
    const isInDocument = document.contains(element);
    return {
      pass: isInDocument,
      message: () => `Expected element ${isInDocument ? 'not ' : ''}to be in the document`,
    };
  },
});

// Global mocks
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

// Mock Next.js image component
jest.mock('next/image', () => {
  return {
    __esModule: true,
    default: (props: any) => {
      // eslint-disable-next-line @next/next/no-img-element
      return React.createElement('img', props);
    },
  };
});

// Mock next/head
jest.mock('next/head', () => {
  return {
    __esModule: true,
    default: (props: any) => {
      return React.createElement('head', null, props.children);
    },
  };
});

// Global test utilities are provided by @testing-library/jest-dom
// Custom matchers are available through the import above
