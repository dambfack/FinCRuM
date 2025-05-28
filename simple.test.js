describe('Simple Test', () => {
  it('should pass a basic assertion', () => {
    console.log('Running simple test...');
    expect(1 + 1).toBe(2);
  });

  it('should verify that true is true', () => {
    expect(true).toBe(true);
  });

  it('should verify that false is not true', () => {
    expect(false).not.toBe(true);
  });
});
