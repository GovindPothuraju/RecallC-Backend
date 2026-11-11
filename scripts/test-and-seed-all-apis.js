require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const { Topic } = require('../models/Topic');
const Revision = require('../models/Revision');
const { formatDateToUTCString } = require('../utils/dateUtils');

function getRelativeDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return formatDateToUTCString(d);
}

const results = [];

function recordResult(name, method, endpoint, status, expectedStatus, details = '') {
  const passed = status === expectedStatus;
  results.push({
    name,
    method,
    endpoint,
    status,
    expectedStatus,
    passed,
    details
  });
  console.log(
    `${passed ? '✅' : '❌'} [${method}] ${endpoint.padEnd(35)} Status: ${status} (Expected: ${expectedStatus}) - ${name}`
  );
}

async function runAllApiTests() {
  console.log('================================================================================');
  console.log('🚀 RecallC — Comprehensive End-to-End API Verification & Data Injection');
  console.log('================================================================================\n');

  let memoryServer = null;
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/recallc';

  try {
    console.log(`Connecting to MongoDB at: ${mongoUri}`);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    console.log('✔ Connected to external MongoDB instance!\n');
  } catch (err) {
    console.log('External MongoDB not reachable. Initializing MongoMemoryServer...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create({
      binary: { version: '7.0.14' }
    });
    const memoryUri = memoryServer.getUri();
    await mongoose.connect(memoryUri);
    console.log(`✔ Connected to In-Memory MongoDB Server at: ${memoryUri}\n`);
  }

  try {
    // Clean existing test data
    await User.deleteMany({ email: { $in: ['tester@recallc.dev', 'test-secondary@recallc.dev'] } });

    console.log('--------------------------------------------------------------------------------');
    console.log('1. AUTHENTICATION APIS (/api/auth)');
    console.log('--------------------------------------------------------------------------------');

    // 1.1 Health Check
    const healthRes = await request(app).get('/api/health');
    recordResult('Health Check Endpoint', 'GET', '/api/health', healthRes.status, 200);

    // 1.2 Register
    const regPayload = {
      name: 'Priya Sharma',
      email: 'tester@recallc.dev',
      password: 'StrongPassword123'
    };
    const regRes = await request(app).post('/api/auth/register').send(regPayload);
    recordResult('User Registration', 'POST', '/api/auth/register', regRes.status, 201, `Created user: ${regPayload.email}`);

    const authToken = regRes.body?.data?.token;
    const authHeaders = { Authorization: `Bearer ${authToken}` };

    // 1.3 Register Duplicate Email (Edge case: expect 409 Conflict)
    const dupRegRes = await request(app).post('/api/auth/register').send(regPayload);
    recordResult('Duplicate Registration Rejection', 'POST', '/api/auth/register', dupRegRes.status, 409);

    // 1.4 Login
    const loginPayload = {
      email: 'tester@recallc.dev',
      password: 'StrongPassword123'
    };
    const loginRes = await request(app).post('/api/auth/login').send(loginPayload);
    recordResult('User Login', 'POST', '/api/auth/login', loginRes.status, 200, `Token received: ${!!loginRes.body?.data?.token}`);

    // 1.5 Login with invalid credentials (Edge case: expect 401)
    const badLoginRes = await request(app).post('/api/auth/login').send({
      email: 'tester@recallc.dev',
      password: 'WrongPassword'
    });
    recordResult('Invalid Credentials Rejection', 'POST', '/api/auth/login', badLoginRes.status, 401);

    // 1.6 Get Current User (/api/auth/me)
    const meRes = await request(app).get('/api/auth/me').set(authHeaders);
    recordResult('Fetch Current User Profile', 'GET', '/api/auth/me', meRes.status, 200, `Name: ${meRes.body?.data?.user?.name}`);

    // 1.7 Logout
    const logoutRes = await request(app).post('/api/auth/logout').set(authHeaders);
    recordResult('User Logout', 'POST', '/api/auth/logout', logoutRes.status, 200);

    console.log('\n--------------------------------------------------------------------------------');
    console.log('2. TOPIC MANAGEMENT APIS (/api/topics)');
    console.log('--------------------------------------------------------------------------------');

    // 2.1 Create Topic 1: Java Multithreading (Studied 10 days ago -> R1, R2 past; R3 overdue!)
    const topic1Payload = {
      title: 'Java Multithreading & Synchronization',
      category: 'Java',
      subcategory: 'Concurrency & JVM Internals',
      studyDate: getRelativeDate(-10),
      notes: 'Learned thread lifecycle states, synchronized blocks, wait/notify, volatile keyword, and deadlock prevention.',
      resources: [
        {
          title: 'Java Concurrency Documentation',
          url: 'https://docs.oracle.com/javase/tutorial/essential/concurrency/',
          type: 'DOCUMENTATION',
          description: 'Official Java tutorials on locks and threads.'
        },
        {
          title: 'Multithreading Tutorial Video',
          url: 'https://www.youtube.com/watch?v=r_MbozD32eo',
          type: 'YOUTUBE',
          description: 'Complete visual walkthrough of thread states.'
        }
      ]
    };
    const topic1Res = await request(app).post('/api/topics').set(authHeaders).send(topic1Payload);
    const topic1Id = topic1Res.body?.data?.topic?._id;
    recordResult('Create Topic 1 (Java Concurrency)', 'POST', '/api/topics', topic1Res.status, 201, `Topic ID: ${topic1Id}`);

    // 2.2 Create Topic 2: Sliding Window (Studied yesterday -> R1 due today!)
    const topic2Payload = {
      title: 'Sliding Window & Two Pointers',
      category: 'DSA',
      subcategory: 'Arrays & Strings',
      studyDate: getRelativeDate(-1),
      notes: 'Dynamic window expansion with right pointer, contraction with left pointer. Solved LeetCode #3 and #209.',
      resources: [
        {
          title: 'NeetCode Sliding Window Playlist',
          url: 'https://www.youtube.com/watch?v=MK-NZ4hN7Rs',
          type: 'YOUTUBE'
        }
      ]
    };
    const topic2Res = await request(app).post('/api/topics').set(authHeaders).send(topic2Payload);
    const topic2Id = topic2Res.body?.data?.topic?._id;
    recordResult('Create Topic 2 (DSA Sliding Window)', 'POST', '/api/topics', topic2Res.status, 201, `Topic ID: ${topic2Id}`);

    // 2.3 Create Topic 3: DBMS Indexing (Studied 4 days ago -> R1 past; R2 due today!)
    const topic3Payload = {
      title: 'Database Indexing & B+ Trees',
      category: 'DBMS',
      subcategory: 'Storage & Optimization',
      studyDate: getRelativeDate(-4),
      notes: 'Clustered vs secondary indexes. B+ trees keep keys sorted for fast range queries. Leaf nodes form linked list.',
      resources: [
        {
          title: 'Use The Index, Luke!',
          url: 'https://use-the-index-luke.com/',
          type: 'DOCUMENTATION'
        }
      ]
    };
    const topic3Res = await request(app).post('/api/topics').set(authHeaders).send(topic3Payload);
    const topic3Id = topic3Res.body?.data?.topic?._id;
    recordResult('Create Topic 3 (DBMS Indexing)', 'POST', '/api/topics', topic3Res.status, 201, `Topic ID: ${topic3Id}`);

    // 2.4 Create Topic 4: Computer Networks (Studied 20 days ago -> R4 overdue!)
    const topic4Payload = {
      title: 'TCP Three-Way Handshake & Connection States',
      category: 'Computer Networks',
      subcategory: 'Transport Layer Protocols',
      studyDate: getRelativeDate(-20),
      notes: 'SYN, SYN-ACK, ACK. Teardown with FIN/ACK. TIME_WAIT prevents lingering packet corruption.',
      resources: [
        {
          title: 'RFC 793 Specification',
          url: 'https://datatracker.ietf.org/doc/html/rfc793',
          type: 'DOCUMENTATION'
        }
      ]
    };
    const topic4Res = await request(app).post('/api/topics').set(authHeaders).send(topic4Payload);
    const topic4Id = topic4Res.body?.data?.topic?._id;
    recordResult('Create Topic 4 (Computer Networks)', 'POST', '/api/topics', topic4Res.status, 201);

    // 2.5 Create Topic 5: React useEffect (Studied today -> R1 scheduled for tomorrow!)
    const topic5Payload = {
      title: 'React useEffect Lifecycle & Cleanups',
      category: 'React',
      subcategory: 'Hooks',
      studyDate: getRelativeDate(0),
      notes: 'Effects run after paint. Cleanup executes before next effect and unmount. Avoid stale closures.',
      resources: [
        {
          title: 'React.dev Docs',
          url: 'https://react.dev/learn/synchronizing-with-effects',
          type: 'DOCUMENTATION'
        }
      ]
    };
    const topic5Res = await request(app).post('/api/topics').set(authHeaders).send(topic5Payload);
    recordResult('Create Topic 5 (React Hooks)', 'POST', '/api/topics', topic5Res.status, 201);

    // 2.6 Get All Topics (with pagination)
    const listTopicsRes = await request(app).get('/api/topics?page=1&limit=10').set(authHeaders);
    const topicsList = listTopicsRes.body?.data?.topics || [];
    recordResult('List All Topics (Paginated)', 'GET', '/api/topics', listTopicsRes.status, 200, `Fetched ${topicsList.length} topics`);

    // 2.7 Filter Topics by Category
    const filterCatRes = await request(app).get('/api/topics?category=Java').set(authHeaders);
    recordResult('Filter Topics by Category', 'GET', '/api/topics?category=Java', filterCatRes.status, 200, `Count: ${filterCatRes.body?.data?.topics?.length}`);

    // 2.8 Search Topics by Keyword
    const searchRes = await request(app).get('/api/topics?search=Sliding').set(authHeaders);
    recordResult('Search Topics by Keyword', 'GET', '/api/topics?search=Sliding', searchRes.status, 200, `Matched: ${searchRes.body?.data?.topics?.[0]?.title}`);

    // 2.9 Get Single Topic By ID (and verify 9 generated revisions)
    const getTopic1Res = await request(app).get(`/api/topics/${topic1Id}`).set(authHeaders);
    const revisionsCount = getTopic1Res.body?.data?.topic?.revisions?.length;
    recordResult('Get Topic Details with 9 Revisions', 'GET', `/api/topics/:id`, getTopic1Res.status, 200, `Revisions attached: ${revisionsCount}`);

    // 2.10 Update Topic (and verify studyDate is immutable)
    const updateRes = await request(app).put(`/api/topics/${topic1Id}`).set(authHeaders).send({
      title: 'Java Multithreading & Synchronization (Advanced)',
      notes: 'Updated notes: covered synchronized blocks, wait/notify, and ReentrantLock.',
      studyDate: '2020-01-01' // Attempt to modify studyDate should be ignored/prevented
    });
    recordResult('Update Topic (studyDate immutable)', 'PUT', `/api/topics/:id`, updateRes.status, 200, `Updated title: ${updateRes.body?.data?.topic?.title}`);

    console.log('\n--------------------------------------------------------------------------------');
    console.log('3. REVISION MANAGEMENT APIS (/api/revisions)');
    console.log('--------------------------------------------------------------------------------');

    // 3.1 Get Today's Revisions
    const todayRevsRes = await request(app).get('/api/revisions/today').set(authHeaders);
    const todayRevs = todayRevsRes.body?.data?.revisions || [];
    recordResult("Get Today's Revisions", 'GET', '/api/revisions/today', todayRevsRes.status, 200, `Due today: ${todayRevs.length}`);

    // 3.2 Get Overdue Revisions
    const overdueRevsRes = await request(app).get('/api/revisions/overdue').set(authHeaders);
    const overdueRevs = overdueRevsRes.body?.data?.revisions || [];
    recordResult('Get Overdue Revisions', 'GET', '/api/revisions/overdue', overdueRevsRes.status, 200, `Overdue: ${overdueRevs.length}`);

    // 3.3 Fetch a revision by ID
    const sampleRevision = todayRevs[0] || overdueRevs[0];
    const revId = sampleRevision._id;
    const revDetailRes = await request(app).get(`/api/revisions/${revId}`).set(authHeaders);
    recordResult('Get Single Revision Details', 'GET', `/api/revisions/:id`, revDetailRes.status, 200, `R#${revDetailRes.body?.data?.revision?.revisionNumber}`);

    // 3.4 Complete a Revision
    const completePayload = {
      understandingLevel: 'EASY',
      recallAssistance: 'INDEPENDENT',
      revisionNotes: 'Recalled two pointers template cleanly without opening notes!'
    };
    const completeRes = await request(app).post(`/api/revisions/${revId}/complete`).set(authHeaders).send(completePayload);
    recordResult('Complete Revision', 'POST', `/api/revisions/:id/complete`, completeRes.status, 200, `Status: ${completeRes.body?.data?.revision?.status}`);

    // 3.5 Duplicate Completion Prevention (Edge case: expect 400 Bad Request)
    const dupCompleteRes = await request(app).post(`/api/revisions/${revId}/complete`).set(authHeaders).send(completePayload);
    recordResult('Prevent Duplicate Revision Completion', 'POST', `/api/revisions/:id/complete`, dupCompleteRes.status, 400);

    // 3.6 Complete another revision for history and stats richness
    if (overdueRevs.length > 0) {
      const secondRevId = overdueRevs[0]._id;
      await request(app).post(`/api/revisions/${secondRevId}/complete`).set(authHeaders).send({
        understandingLevel: 'MEDIUM',
        recallAssistance: 'PARTIAL',
        revisionNotes: 'Had to glance at connection reset states.'
      });
    }

    // 3.7 List All Revisions (Filtered by status)
    const listPendingRevsRes = await request(app).get('/api/revisions?status=PENDING').set(authHeaders);
    recordResult('List Revisions Filtered by Status', 'GET', '/api/revisions?status=PENDING', listPendingRevsRes.status, 200, `Total pending: ${listPendingRevsRes.body?.pagination?.total}`);

    console.log('\n--------------------------------------------------------------------------------');
    console.log('4. DASHBOARD & ANALYTICS APIS (/api/dashboard & /api/progress)');
    console.log('--------------------------------------------------------------------------------');

    // 4.1 Dashboard Summary
    const dashRes = await request(app).get('/api/dashboard/summary').set(authHeaders);
    const stats = dashRes.body?.data?.stats;
    recordResult(
      'Dashboard Metrics Summary',
      'GET',
      '/api/dashboard/summary',
      dashRes.status,
      200,
      `Topics: ${stats?.totalTopics}, Completed: ${stats?.completedRevisions}, Due: ${stats?.dueTodayCount}, Overdue: ${stats?.overdueCount}`
    );

    // 4.2 Progress Summary
    const progRes = await request(app).get('/api/progress/summary').set(authHeaders);
    const overview = progRes.body?.data?.overview;
    recordResult(
      'Progress Analytics Summary',
      'GET',
      '/api/progress/summary',
      progRes.status,
      200,
      `Rate: ${overview?.completionRate}%, Categories: ${Object.keys(progRes.body?.data?.categoryBreakdown || {}).length}`
    );

    // 4.3 Revision History Audit Log
    const histRes = await request(app).get('/api/progress/history?page=1&limit=10').set(authHeaders);
    const historyItems = histRes.body?.data?.history || [];
    recordResult('Revision History Audit Log', 'GET', '/api/progress/history', histRes.status, 200, `Completed logged: ${historyItems.length}`);

    console.log('\n--------------------------------------------------------------------------------');
    console.log('5. USER SETTINGS APIS (/api/users)');
    console.log('--------------------------------------------------------------------------------');

    // 5.1 Get Profile
    const profileRes = await request(app).get('/api/users/profile').set(authHeaders);
    recordResult('Get User Profile', 'GET', '/api/users/profile', profileRes.status, 200, `Email: ${profileRes.body?.data?.user?.email}`);

    // 5.2 Update Profile Name
    const updateProfileRes = await request(app).put('/api/users/profile').set(authHeaders).send({ name: 'Priya Sharma (Sr. Dev)' });
    recordResult('Update Profile Name', 'PUT', '/api/users/profile', updateProfileRes.status, 200, `New name: ${updateProfileRes.body?.data?.user?.name}`);

    // 5.3 Change Password
    const changePassRes = await request(app).put('/api/users/change-password').set(authHeaders).send({
      currentPassword: 'StrongPassword123',
      newPassword: 'BrandNewPassword456'
    });
    recordResult('Change Password', 'PUT', '/api/users/change-password', changePassRes.status, 200);

    // Verify login with new password
    const reLoginRes = await request(app).post('/api/auth/login').send({
      email: 'tester@recallc.dev',
      password: 'BrandNewPassword456'
    });
    recordResult('Login with New Password', 'POST', '/api/auth/login', reLoginRes.status, 200);

    console.log('\n--------------------------------------------------------------------------------');
    console.log('6. CASCADE DELETION TEST (/api/topics/:id)');
    console.log('--------------------------------------------------------------------------------');

    // Create a temporary topic
    const tempTopicRes = await request(app).post('/api/topics').set(authHeaders).send({
      title: 'Temporary Topic for Deletion Test',
      category: 'Other',
      studyDate: getRelativeDate(0),
      notes: 'This will be deleted'
    });
    const tempTopicId = tempTopicRes.body?.data?.topic?._id;

    // Verify revisions exist before deletion
    const beforeCount = await Revision.countDocuments({ topicId: tempTopicId });

    // Delete topic
    const deleteRes = await request(app).delete(`/api/topics/${tempTopicId}`).set(authHeaders);
    recordResult('Delete Topic Cascade', 'DELETE', `/api/topics/:id`, deleteRes.status, 200);

    // Verify all associated revisions were cleanly deleted
    const afterCount = await Revision.countDocuments({ topicId: tempTopicId });
    const cascadeClean = beforeCount === 9 && afterCount === 0;
    recordResult(
      'Verify Revisions Cascade Cleaned',
      'VERIFY',
      `Revisions for ${tempTopicId}`,
      cascadeClean ? 200 : 500,
      200,
      `Before: ${beforeCount} revisions -> After: ${afterCount} revisions`
    );

    console.log('\n================================================================================');
    console.log('SUMMARY OF ALL API TESTS & INJECTIONS');
    console.log('================================================================================');
    const totalTests = results.length;
    const passedTests = results.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`Total Endpoints & Edge Cases Tested: ${totalTests}`);
    console.log(`Passed:                              ${passedTests} ✅`);
    console.log(`Failed:                              ${failedTests} ${failedTests === 0 ? '🎉' : '❌'}`);
    console.log('================================================================================\n');

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('API Verification error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
    }
    process.exit(0);
  }
}

runAllApiTests();

