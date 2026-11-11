const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/auth');
const errorHandler = require('../middleware/errorHandler');
const notFound = require('../middleware/notFound');
const ApiError = require('../utils/apiError');
const config = require('../config/env');
const User = require('../models/User');

test('Middleware - Auth Protect', async (t) => {
  await t.test('rejects request without authorization header', async () => {
    const req = { headers: {} };
    let capturedError = null;
    const next = (err) => {
      capturedError = err;
    };

    await protect(req, {}, next);
    assert.ok(capturedError);
    assert.strictEqual(capturedError.statusCode, 401);
    assert.match(capturedError.message, /Authentication token is required/);
  });

  await t.test('rejects request with invalid token format', async () => {
    const req = { headers: { authorization: 'Bearer invalid.token.here' } };
    let capturedError = null;
    const next = (err) => {
      capturedError = err;
    };

    await protect(req, {}, next);
    assert.ok(capturedError);
    assert.strictEqual(capturedError.statusCode, 401);
    assert.match(capturedError.message, /Invalid authentication token/);
  });

  await t.test('rejects expired token with informative message', async () => {
    const expiredToken = jwt.sign({ id: '507f1f77bcf86cd799439011' }, config.jwtSecret, {
      expiresIn: '-1s'
    });
    const req = { headers: { authorization: `Bearer ${expiredToken}` } };
    let capturedError = null;
    const next = (err) => {
      capturedError = err;
    };

    await protect(req, {}, next);
    assert.ok(capturedError);
    assert.strictEqual(capturedError.statusCode, 401);
    assert.match(capturedError.message, /expired/i);
  });
});

test('Middleware - Error Handler', async (t) => {
  function createMockRes() {
    let statusCode = null;
    let jsonBody = null;
    return {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return this;
      },
      getStatusCode: () => statusCode,
      getJson: () => jsonBody
    };
  }

  await t.test('formats ApiError correctly', () => {
    const res = createMockRes();
    const err = ApiError.badRequest('Invalid topic input', ['Field title is required']);
    errorHandler(err, { method: 'POST', originalUrl: '/api/topics' }, res, () => {});

    assert.strictEqual(res.getStatusCode(), 400);
    const json = res.getJson();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.message, 'Invalid topic input');
    assert.deepStrictEqual(json.errors, ['Field title is required']);
  });

  await t.test('transforms Mongoose CastError to 400 Bad Request', () => {
    const res = createMockRes();
    const castError = new Error('Cast error');
    castError.name = 'CastError';
    castError.path = '_id';
    castError.value = 'invalid-id';

    errorHandler(castError, { method: 'GET', originalUrl: '/api/topics/xyz' }, res, () => {});

    assert.strictEqual(res.getStatusCode(), 400);
    const json = res.getJson();
    assert.strictEqual(json.success, false);
    assert.match(json.message, /Invalid format for field '_id'/);
  });

  await t.test('transforms MongoDB duplicate key error (code 11000) to 409 Conflict', () => {
    const res = createMockRes();
    const dupError = new Error('E11000 duplicate key');
    dupError.code = 11000;
    dupError.keyValue = { email: 'alice@example.com' };

    errorHandler(dupError, { method: 'POST', originalUrl: '/api/auth/register' }, res, () => {});

    assert.strictEqual(res.getStatusCode(), 409);
    const json = res.getJson();
    assert.strictEqual(json.success, false);
    assert.match(json.message, /email already exists/);
  });

  await t.test('returns 404 on notFound handler', () => {
    let capturedError = null;
    notFound({ method: 'GET', originalUrl: '/api/unknown' }, {}, (err) => {
      capturedError = err;
    });

    assert.ok(capturedError);
    assert.strictEqual(capturedError.statusCode, 404);
    assert.match(capturedError.message, /Route not found/);
  });
});

