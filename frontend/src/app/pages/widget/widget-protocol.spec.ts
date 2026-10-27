import { httpOrigin } from './widget-protocol';

describe('httpOrigin', () => {
  it('keeps the origin of http(s) URLs only', () => {
    expect(httpOrigin('https://app.example.org/page?token=1#x')).toBe('https://app.example.org');
    expect(httpOrigin('http://127.0.0.1:8099/')).toBe('http://127.0.0.1:8099');
    expect(httpOrigin('https://app.example.org:443')).toBe('https://app.example.org');
  });

  it('refuses opaque origins, other schemes and invalid values', () => {
    for (const value of ['null', 'data:text/html,x', 'javascript:alert(1)', 'file:///etc/passwd', 'example.org', '', null, undefined]) {
      expect(httpOrigin(value)).toBeNull();
    }
  });
});
