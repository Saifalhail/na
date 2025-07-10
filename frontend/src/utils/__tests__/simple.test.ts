describe('Simple test', () => {
  it('should run a basic test', () => {
    expect(2 + 2).toBe(4);
  });

  it('should test fetch mock', () => {
    expect(global.fetch).toBeDefined();
    expect(typeof global.fetch).toBe('function');
  });
});
