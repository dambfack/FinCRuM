// Import Jest types
import '@testing-library/jest-dom';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare global {
  namespace jest {
    interface Matchers<R = void, T = unknown> 
      extends TestingLibraryMatchers<typeof expect.stringContaining, R> {
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
      
      // Additional matchers
      toMatchSnapshot(): R;
      toMatchInlineSnapshot(snapshot?: string): R;
      toThrow(error?: any): R;
      toThrowError(error?: any): R;
    }
    
    interface Expect {
      any(constructor: any): any;
      anything(): any;
      arrayContaining(arr: any[]): any;
      objectContaining(obj: any): any;
      stringMatching(regexp: RegExp | string): any;
      stringContaining(str: string): any;
      not: {
        arrayContaining(arr: any[]): any;
        objectContaining(obj: any): any;
        stringMatching(regexp: RegExp | string): any;
        stringContaining(str: string): any;
      };
    }
    
    interface ExpectStatic {
      any(constructor: any): any;
      anything(): any;
      arrayContaining(arr: any[]): any;
      objectContaining(obj: any): any;
      stringMatching(regexp: RegExp | string): any;
      stringContaining(str: string): any;
    }
    
    interface MockContext<T, Y extends any[]> {
      calls: Y[];
      instances: T[];
      invocationCallOrder: number[];
      results: Array<{ type: 'return' | 'throw'; value: any }>;
    }
    
    interface MockFunctionState<T = any> {
      calls: any[][];
      instances: T[];
      invocationCallOrder: number[];
      results: Array<{ type: 'return' | 'throw'; value: any }>;
    }
    
    interface Mock<T = any, Y extends any[] = any> extends Function, MockInstance<T, Y> {
      new (...args: Y): T;
      (...args: Y): T;
    }
    
    interface MockInstance<T, Y extends any[]> {
      _isMockFunction: boolean;
      _protoImpl: Function;
      getMockName(): string;
      getMockImplementation(): ((...args: Y) => T) | undefined;
      mock: MockFunctionState<T>;
      mockClear(): this;
      mockReset(): this;
      mockRestore(): void;
      mockImplementation(fn: (...args: Y) => T): this;
      mockImplementationOnce(fn: (...args: Y) => T): this;
      mockName(name: string): this;
      mockReturnThis(): this;
      mockReturnValue(value: T): this;
      mockReturnValueOnce(value: T): this;
      mockResolvedValue(value: T extends PromiseLike<infer U> ? U : never): this;
      mockResolvedValueOnce(value: T extends PromiseLike<infer U> ? U : never): this;
      mockRejectedValue(value: any): this;
      mockRejectedValueOnce(value: any): this;
    }
  }
}

// Ensure this file is treated as a module
export {};