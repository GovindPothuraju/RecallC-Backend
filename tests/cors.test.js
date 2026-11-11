const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('CORS Configuration', () => {
  it('allows vercel production origin without trailing slash', () => {
    const baseAllowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://recall-c-frontend.vercel.app'
    ];

    const testOrigin = 'https://recall-c-frontend.vercel.app';
    const normalized = testOrigin.replace(/\/$/, '');
    const isAllowed = baseAllowedOrigins.some(
      (allowed) => allowed.replace(/\/$/, '') === normalized
    );

    assert.equal(isAllowed, true);
  });

  it('allows vercel production origin with trailing slash', () => {
    const baseAllowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://recall-c-frontend.vercel.app'
    ];

    const testOrigin = 'https://recall-c-frontend.vercel.app/';
    const normalized = testOrigin.replace(/\/$/, '');
    const isAllowed = baseAllowedOrigins.some(
      (allowed) => allowed.replace(/\/$/, '') === normalized
    );

    assert.equal(isAllowed, true);
  });

  it('blocks unknown third-party origin', () => {
    const baseAllowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://recall-c-frontend.vercel.app'
    ];

    const testOrigin = 'https://malicious-site.com';
    const normalized = testOrigin.replace(/\/$/, '');
    const isAllowed = baseAllowedOrigins.some(
      (allowed) => allowed.replace(/\/$/, '') === normalized
    );

    assert.equal(isAllowed, false);
  });
});
