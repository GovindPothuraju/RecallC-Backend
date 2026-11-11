const test = require('node:test');
const assert = require('node:assert/strict');
const { validateRegister, validateLogin, validateChangePassword } = require('../validators/authValidator');
const { validateCreateTopic, validateUpdateTopic } = require('../validators/topicValidator');
const { validateCompleteRevision } = require('../validators/revisionValidator');

function mockReqResNext(body = {}) {
  let nextError = null;
  let nextCalled = false;
  const req = { body: { ...body } };
  const res = {};
  const next = (err) => {
    nextCalled = true;
    if (err) {
      nextError = err;
    }
  };
  return { req, res, next, getError: () => nextError, wasNextCalled: () => nextCalled };
}

test('Auth Validators', async (t) => {
  await t.test('passes valid registration data', () => {
    const { req, res, next, getError, wasNextCalled } = mockReqResNext({
      name: 'Alice Learner',
      email: 'Alice@example.com',
      password: 'password123'
    });
    validateRegister(req, res, next);
    assert.strictEqual(wasNextCalled(), true);
    assert.strictEqual(getError(), null);
    assert.strictEqual(req.body.email, 'alice@example.com');
  });

  await t.test('rejects registration with short password and invalid email', () => {
    const { req, res, next, getError } = mockReqResNext({
      name: 'A',
      email: 'not-an-email',
      password: '123'
    });
    validateRegister(req, res, next);
    const err = getError();
    assert.ok(err);
    assert.strictEqual(err.statusCode, 400);
    assert.ok(err.errors.length >= 2);
  });

  await t.test('rejects login with missing password', () => {
    const { req, res, next, getError } = mockReqResNext({
      email: 'alice@example.com',
      password: ''
    });
    validateLogin(req, res, next);
    const err = getError();
    assert.ok(err);
    assert.strictEqual(err.statusCode, 400);
  });

  await t.test('rejects password change if new password identical to current', () => {
    const { req, res, next, getError } = mockReqResNext({
      currentPassword: 'secretpassword',
      newPassword: 'secretpassword'
    });
    validateChangePassword(req, res, next);
    const err = getError();
    assert.ok(err);
    assert.match(err.errors[0], /different/i);
  });
});

test('Topic Validators', async (t) => {
  await t.test('passes valid topic creation data', () => {
    const { req, res, next, getError, wasNextCalled } = mockReqResNext({
      title: 'Java Concurrency',
      category: 'Java',
      subcategory: 'Threads',
      studyDate: '2026-11-06',
      notes: 'Initial study notes',
      resources: [
        {
          title: 'YouTube Tutorial',
          url: 'https://youtube.com/watch?v=123',
          type: 'YOUTUBE'
        }
      ]
    });
    validateCreateTopic(req, res, next);
    assert.strictEqual(wasNextCalled(), true);
    assert.strictEqual(getError(), null);
    assert.strictEqual(req.body.title, 'Java Concurrency');
  });

  await t.test('rejects topic creation with invalid URL or missing category', () => {
    const { req, res, next, getError } = mockReqResNext({
      title: 'Topic',
      category: '',
      studyDate: '2026-11-06',
      resources: [
        {
          title: 'Bad Link',
          url: 'htp://invalid-url',
          type: 'YOUTUBE'
        }
      ]
    });
    validateCreateTopic(req, res, next);
    const err = getError();
    assert.ok(err);
    assert.strictEqual(err.statusCode, 400);
  });

  await t.test('ensures studyDate cannot be modified on topic update', () => {
    const { req, res, next, getError, wasNextCalled } = mockReqResNext({
      title: 'Updated Topic Title',
      studyDate: '2020-01-01' // Attempt to alter study date
    });
    validateUpdateTopic(req, res, next);
    assert.strictEqual(wasNextCalled(), true);
    assert.strictEqual(getError(), null);
    // studyDate must be stripped to prevent mutating revision schedule
    assert.strictEqual(req.body.studyDate, undefined);
    assert.strictEqual(req.body.title, 'Updated Topic Title');
  });
});

test('Revision Completion Validators', async (t) => {
  await t.test('passes valid completion ratings', () => {
    const { req, res, next, getError, wasNextCalled } = mockReqResNext({
      understandingLevel: 'EASY',
      recallAssistance: 'INDEPENDENT',
      revisionNotes: 'Recalled cleanly'
    });
    validateCompleteRevision(req, res, next);
    assert.strictEqual(wasNextCalled(), true);
    assert.strictEqual(getError(), null);
  });

  await t.test('rejects missing or invalid understanding level', () => {
    const { req, res, next, getError } = mockReqResNext({
      understandingLevel: 'SUPER_EASY',
      recallAssistance: 'INDEPENDENT'
    });
    validateCompleteRevision(req, res, next);
    const err = getError();
    assert.ok(err);
    assert.strictEqual(err.statusCode, 400);
  });

  await t.test('rejects missing or invalid recall assistance', () => {
    const { req, res, next, getError } = mockReqResNext({
      understandingLevel: 'HARD',
      recallAssistance: 'NOT_A_VALID_CHOICE'
    });
    validateCompleteRevision(req, res, next);
    const err = getError();
    assert.ok(err);
    assert.strictEqual(err.statusCode, 400);
  });
});
