import '@testing-library/jest-dom';
import { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare global {
  namespace jest {
    interface Matchers<R = void, T = {}
      > extends TestingLibraryMatchers<typeof expect.stringContaining, R> {
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

    interface Expect {
      <T = any>(actual: T): Matchers<T>;
    }
  }
}

export {};
