const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('CORS Configuration', () => {
  const baseAllowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://recall-c-frontend.vercel.app',
    'https://recallc-frontend.vercel.app'
  ];

  function checkOrigin(origin) {
    const normalized = origin.replace(/\/$/, '');
    const isExplicit = baseAllowedOrigins.some(
      (a) => a.replace(/\/$/, '') === normalized
    );
    let isVercel = false;
    try {
      const host = new URL(normalized).hostname;
      if (host.endsWith('.vercel.app')) {
        isVercel = true;
      }
    } catch (_) {}
    return isExplicit || isVercel;
  }

  it('allows vercel production origin without trailing slash', () => {
    assert.equal(checkOrigin('https://recall-c-frontend.vercel.app'), true);
  });

  it('allows vercel production origin with trailing slash', () => {
    assert.equal(checkOrigin('https://recall-c-frontend.vercel.app/'), true);
  });

  it('allows vercel preview domains', () => {
    assert.equal(
      checkOrigin('https://recall-c-frontend-rery73lya-govindpothurajus-projects.vercel.app'),
      true
    );
  });

  it('blocks unknown third-party origin', () => {
    assert.equal(checkOrigin('https://malicious-site.com'), false);
  });
});
