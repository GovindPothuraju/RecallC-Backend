process.env.NODE_ENV = 'test';
const http = require('http');
const mongoose = require('mongoose');
const app = require('../app');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const { Topic } = require('../models/Topic');
const Revision = require('../models/Revision');

const PORT = 5002;
const testUserId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
const validToken = jwt.sign({ id: testUserId.toString() }, config.jwtSecret, { expiresIn: '1h' });

const mockRevisionData = [
  {
    _id: new mongoose.Types.ObjectId(),
    revisionNumber: 1,
    scheduledDate: '2026-11-07',
    status: 'PENDING',
    topicId: { title: 'Java Concurrency', category: 'Java' }
  }
];

const chainableQuery = () => {
  const query = {
    populate: () => query,
    sort: () => query,
    skip: () => query,
    limit: () => query,
    lean: () => Promise.resolve(mockRevisionData),
    then: (resolve) => resolve(mockRevisionData)
  };
  return query;
};

User.findById = () => ({
  select: () =>
    Promise.resolve({
      _id: testUserId,
      name: 'Benchmark Engineer',
      email: 'bench@recallc.dev',
      createdAt: new Date()
    })
});

Topic.countDocuments = () => Promise.resolve(42);
Topic.find = () => chainableQuery();
Topic.aggregate = () =>
  Promise.resolve([
    { _id: 'Java', count: 12 },
    { _id: 'DSA', count: 15 },
    { _id: 'DBMS', count: 8 },
    { _id: 'System Design', count: 7 }
  ]);

Revision.countDocuments = () => Promise.resolve(120);
Revision.find = () => chainableQuery();
Revision.aggregate = () =>
  Promise.resolve([
    { _id: 'EASY', count: 45 },
    { _id: 'MEDIUM', count: 30 },
    { _id: 'HARD', count: 10 }
  ]);

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const start = process.hrtime.bigint();
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1e6;
        resolve({
          statusCode: res.statusCode,
          durationMs,
          data
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function calculateP95(times) {
  const sorted = [...times].sort((a, b) => a - b);
  const index = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function runBenchmarks() {
  console.log('================================================================================');
  console.log('🚀 RecallC API Performance & Latency Benchmark');
  console.log('Target Evaluation Threshold: 200ms Maximum Latency');
  console.log('================================================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, resolve));

  const authHeader = { Authorization: `Bearer ${validToken}` };

  const endpoints = [
    {
      name: 'GET /api/health (Health check)',
      method: 'GET',
      path: '/api/health',
      headers: {}
    },
    {
      name: 'POST /api/auth/register (Validation failure pipeline)',
      method: 'POST',
      path: '/api/auth/register',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Short', email: 'bad-email', password: '123' })
    },
    {
      name: 'POST /api/auth/login (Validation failure pipeline)',
      method: 'POST',
      path: '/api/auth/login',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '', password: '' })
    },
    {
      name: 'GET /api/topics (Unauthorized 401 gate)',
      method: 'GET',
      path: '/api/topics',
      headers: {}
    },
    {
      name: 'GET /api/users/profile (Auth token verification)',
      method: 'GET',
      path: '/api/users/profile',
      headers: authHeader
    },
    {
      name: 'GET /api/topics (Topics list with pagination & auth)',
      method: 'GET',
      path: '/api/topics?page=1&limit=10',
      headers: authHeader
    },
    {
      name: 'GET /api/dashboard/summary (Dashboard aggregation)',
      method: 'GET',
      path: '/api/dashboard/summary',
      headers: authHeader
    },
    {
      name: 'GET /api/revisions/today (Today schedule queue)',
      method: 'GET',
      path: '/api/revisions/today',
      headers: authHeader
    },
    {
      name: 'GET /api/revisions/overdue (Overdue priority queue)',
      method: 'GET',
      path: '/api/revisions/overdue',
      headers: authHeader
    },
    {
      name: 'GET /api/progress/summary (Analytical metrics breakdown)',
      method: 'GET',
      path: '/api/progress/summary',
      headers: authHeader
    },
    {
      name: 'GET /api/progress/history (Paginated audit history)',
      method: 'GET',
      path: '/api/progress/history?page=1&limit=10',
      headers: authHeader
    },
    {
      name: 'GET /api/nonexistent-route (404 pipeline)',
      method: 'GET',
      path: '/api/nonexistent-route',
      headers: {}
    }
  ];

  const resultsByEndpoint = {};
  const allDurations = [];

  const ITERATIONS_PER_ENDPOINT = 25;

  for (const ep of endpoints) {
    resultsByEndpoint[ep.name] = [];

    for (let i = 0; i < ITERATIONS_PER_ENDPOINT; i++) {
      try {
        const res = await request(
          {
            hostname: '127.0.0.1',
            port: PORT,
            path: ep.path,
            method: ep.method,
            headers: ep.headers
          },
          ep.body
        );

        resultsByEndpoint[ep.name].push(res.durationMs);
        allDurations.push(res.durationMs);
      } catch (err) {
        console.error(`Error requesting ${ep.name}:`, err.message);
      }
    }
  }

  server.close();

  console.log(
    'Endpoint'.padEnd(58) +
      'Avg (ms)'.padEnd(12) +
      'P95 (ms)'.padEnd(12) +
      'Max (ms)'.padEnd(12) +
      'Status (<200ms)'
  );
  console.log('------------------------------------------------------------------------------------------------------------------');

  let slowCount = 0;

  for (const [name, times] of Object.entries(resultsByEndpoint)) {
    if (!times || times.length === 0) continue;
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const p95 = calculateP95(times);
    const max = Math.max(...times);
    const passed = p95 <= 200;
    if (!passed) slowCount++;

    console.log(
      name.padEnd(58) +
        avg.toFixed(2).padEnd(12) +
        p95.toFixed(2).padEnd(12) +
        max.toFixed(2).padEnd(12) +
        (passed ? '✅ PASS' : '❌ EXCEEDED')
    );
  }

  const overallAvg = allDurations.reduce((a, b) => a + b, 0) / allDurations.length;
  const overallP95 = calculateP95(allDurations);
  const overallMax = Math.max(...allDurations);

  console.log('------------------------------------------------------------------------------------------------------------------');
  console.log(`Total Requests Tested:      ${allDurations.length}`);
  console.log(`Overall Average Latency:    ${overallAvg.toFixed(2)} ms`);
  console.log(`Overall P95 Latency:        ${overallP95.toFixed(2)} ms`);
  console.log(`Peak Latency:               ${overallMax.toFixed(2)} ms`);
  console.log(`Endpoints Exceeding 200ms:  ${slowCount}`);
  console.log('==================================================================================================================\n');

  if (slowCount > 0) {
    process.exit(1);
  }
}

runBenchmarks().catch((err) => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
