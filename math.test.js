// A simple test file that doesn't depend on any Next.js specific code
function sum(a, b) {
  return a + b;
}

describe('Math operations', () => {
  it('should add two numbers correctly', () => {
    expect(sum(1, 2)).toBe(3);
    expect(sum(-1, 5)).toBe(4);
    expect(sum(0, 0)).toBe(0);
  });

  it('should handle decimal numbers', () => {
    expect(sum(1.5, 2.5)).toBe(4);
    expect(sum(-1.1, 1)).toBeCloseTo(-0.1);
  });
});
