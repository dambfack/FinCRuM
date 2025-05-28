// Import Jest Native Matchers
import '@testing-library/jest-native/extend-expect';

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
expect.extend({
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

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock next/head
jest.mock('next/head', () => {
  return {
    __esModule: true,
    default: ({
      children,
    }: {
      children: Array<React.ReactElement>;
    }) => {
      return <>{children}</>;
    },
  };
});

// Add global test utilities
declare global {
  namespace jest {
    // Basic matchers
    interface Matchers<R> {
      // Basic matchers
      toBe(expected: any): R;
      toEqual(expected: any): R;
      toBeDefined(): R;
      toBeUndefined(): R;
      toBeNull(): R;
      toBeTruthy(): R;
      toBeFalsy(): R;
      toBeGreaterThan(expected: number): R;
      toBeGreaterThanOrEqual(expected: number): R;
      toBeLessThan(expected: number): R;
      toBeLessThanOrEqual(expected: number): R;
      toBeCloseTo(expected: number, numDigits?: number): R;
      toMatch(regexp: string | RegExp): R;
      toContain(item: any): R;
      toContainEqual(item: any): R;
      toHaveLength(length: number): R;
      
      // Mock matchers
      toHaveBeenCalled(): R;
      toHaveBeenCalledTimes(expected: number): R;
      toHaveBeenCalledWith(...args: any[]): R;
      toHaveBeenLastCalledWith(...args: any[]): R;
      toHaveBeenNthCalledWith(nth: number, ...args: any[]): R;
      toHaveReturned(): R;
      toHaveReturnedTimes(times: number): R;
      toHaveReturnedWith(value: any): R;
      toHaveLastReturnedWith(value: any): R;
      toHaveNthReturnedWith(nth: number, value: any): R;
      
      // Promise matchers
      resolves: Matchers<Promise<R>>;
      rejects: Matchers<Promise<R>>;
      
      // Asymmetric matchers
      toBeInstanceOf(expected: any): R;
      toMatchObject(expected: any): R;
      toHaveProperty(keyPath: string | string[], value?: any): R;
    }

    // Add expect type extensions
    interface Expect {
      // Basic matchers
      <T = any>(actual: T): Matchers<T>;
      // Add other expect extensions as needed
    }
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveTextContent(text: string | RegExp): R;
      toBeInTheDOM(container?: HTMLElement | SVGElement): R;
      toHaveAttribute(attr: string, value?: any): R;
      toHaveClass(...classNames: string[]): R;
      toHaveStyle(css: string | Record<string, any>): R;
      toBeVisible(): R;
      toBeDisabled(): R;
      toBeEmptyDOMElement(): R;
      toContainElement(element: HTMLElement | SVGElement | null): R;
      toContainHTML(htmlText: string): R;
      toHaveDisplayValue(value: string | RegExp | string[]): R;
      toHaveFormValues(expectedValues: Record<string, any>): R;
      toHaveValue(value: any): R;
      toBeChecked(): R;
      toBePartiallyChecked(): R;
      toHaveDescription(text: string | RegExp): R;
      toHaveAccessibleDescription(text: string | RegExp): R;
      toHaveAccessibleName(text: string | RegExp): R;
      toHaveErrorMessage(text: string | RegExp): R;
      toHaveFocus(): R;
      toHaveFormValues(expectedValues: Record<string, any>): R;
    }
  }
}
