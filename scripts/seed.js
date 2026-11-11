require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const { Topic } = require('../models/Topic');
const Revision = require('../models/Revision');
const { addDaysToDateString, formatDateToUTCString, generateRevisionSchedule } = require('../utils/dateUtils');

function getRelativeDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return formatDateToUTCString(d);
}

async function seedData() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/recallc';
  console.log('Connecting to database:', mongoUri);

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB Connected successfully!');
  } catch (err) {
    console.error('\n❌ Could not connect to MongoDB:');
    console.error(`   ${err.message}`);
    console.error('\n👉 Tips:');
    console.error('   1. If using local MongoDB, ensure the mongod service is running.');
    console.error('   2. If using MongoDB Atlas (cloud), update MONGODB_URI in backend/.env with your connection string.\n');
    process.exit(1);
  }

  try {
    console.log('Clearing existing data for demo account...');
    const existingUser = await User.findOne({ email: 'demo@recallc.dev' });
    if (existingUser) {
      await Revision.deleteMany({ userId: existingUser._id });
      await Topic.deleteMany({ userId: existingUser._id });
      await User.deleteOne({ _id: existingUser._id });
    }

    console.log('Creating demo user (demo@recallc.dev / password123)...');
    const demoUser = await User.create({
      name: 'Demo Engineer',
      email: 'demo@recallc.dev',
      password: 'password123'
    });

    console.log('Creating topics with deterministic 9-revision schedules...');

    const sampleTopics = [
      {
        title: 'Java Multithreading & Synchronization',
        category: 'Java',
        subcategory: 'Concurrency & JVM',
        studyDate: getRelativeDate(-10), // Studied 10 days ago: R1 (+1d: 9 days ago), R2 (+4d: 6 days ago), R3 (+7d: 3 days ago -> OVERDUE)
        notes:
          'Studied thread lifecycle (NEW, RUNNABLE, BLOCKED, WAITING, TIMED_WAITING, TERMINATED). Learned synchronized keyword, intrinsic locks (monitors), race conditions, and deadlocks. Need to practice wait(), notify(), notifyAll().',
        resources: [
          {
            title: 'Java Concurrency in Practice (Chapter 3)',
            url: 'https://docs.oracle.com/javase/tutorial/essential/concurrency/',
            type: 'DOCUMENTATION',
            description: 'Official Java tutorials on synchronized blocks and memory visibility.'
          },
          {
            title: 'Multithreading and Thread Lifecycle Explained',
            url: 'https://www.youtube.com/watch?v=r_MbozD32eo',
            type: 'YOUTUBE',
            description: 'Complete visual walkthrough of thread states and context switching.'
          },
          {
            title: 'Deadlock Detection and Prevention Guide',
            url: 'https://github.com/eugenp/tutorials/tree/master/core-java-modules/core-java-concurrency-basic',
            type: 'GITHUB',
            description: 'Practical Java code snippets demonstrating thread dumps and jstack analysis.'
          }
        ],
        completedMilestones: [
          {
            revisionNumber: 1,
            daysAgo: 9,
            understandingLevel: 'EASY',
            recallAssistance: 'INDEPENDENT',
            notes: 'Recalled thread states without looking at notes.'
          },
          {
            revisionNumber: 2,
            daysAgo: 6,
            understandingLevel: 'MEDIUM',
            recallAssistance: 'PARTIAL',
            notes: 'Needed to check syntax for synchronized block on specific monitor object.'
          }
          // R3 (due 3 days ago) is deliberately left PENDING so it appears in OVERDUE!
        ]
      },
      {
        title: 'Sliding Window & Two Pointers Pattern',
        category: 'DSA',
        subcategory: 'Arrays & Strings',
        studyDate: getRelativeDate(-1), // Studied yesterday: R1 (+1d) is DUE TODAY!
        notes:
          'Fixed window vs dynamic window. Dynamic window template: expand right pointer until condition violates, then contract left pointer until valid again. Solved "Longest Substring Without Repeating Characters" and "Minimum Size Subarray Sum". Time complexity O(N), Space O(K).',
        resources: [
          {
            title: 'NeetCode - Sliding Window Playlist',
            url: 'https://www.youtube.com/watch?v=MK-NZ4hN7Rs',
            type: 'YOUTUBE',
            description: 'Core patterns for two pointers and variable window size.'
          },
          {
            title: 'LeetCode 3 - Longest Substring Without Repeating Characters',
            url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
            type: 'BLOG',
            description: 'Classic sliding window problem using hash map for last seen indices.'
          }
        ],
        completedMilestones: [] // R1 is DUE TODAY!
      },
      {
        title: 'Database Indexing: B+ Trees vs Hash Indexes',
        category: 'DBMS',
        subcategory: 'Storage & Optimization',
        studyDate: getRelativeDate(-4), // Studied 4 days ago: R1 (+1d) completed, R2 (+4d) is DUE TODAY!
        notes:
          'Clustered index defines physical storage order of table data (one per table). Secondary/non-clustered index stores index key with pointer to row ID. B+ Trees keep data in leaf nodes linked sequentially, making range queries O(log N + K). Hash indexes only support equality comparisons O(1), no ranges.',
        resources: [
          {
            title: 'Use The Index, Luke! - A Guide to Database Performance',
            url: 'https://use-the-index-luke.com/',
            type: 'DOCUMENTATION',
            description: 'Comprehensive guide to indexing internals, multi-column indexes, and execution plans.'
          },
          {
            title: 'How B-Tree and B+ Tree Indexing Works Internally',
            url: 'https://www.youtube.com/watch?v=aZjYr87r1b8',
            type: 'YOUTUBE',
            description: 'In-depth animation of node splitting, fan-out, and disk block I/O.'
          }
        ],
        completedMilestones: [
          {
            revisionNumber: 1,
            daysAgo: 3,
            understandingLevel: 'EASY',
            recallAssistance: 'INDEPENDENT',
            notes: 'Recalled clustered vs non-clustered differences cleanly.'
          }
          // R2 is DUE TODAY!
        ]
      },
      {
        title: 'TCP Three-Way Handshake & Connection Teardown',
        category: 'Computer Networks',
        subcategory: 'Transport Layer Protocols',
        studyDate: getRelativeDate(-20), // Studied 20 days ago: R1 (+1d), R2 (+4d), R3 (+7d) completed, R4 (+15d: 5 days ago) is OVERDUE!
        notes:
          'Connection establishment: SYN -> SYN-ACK -> ACK. Sequence numbers synchronize byte streams. Connection termination: FIN -> ACK -> FIN -> ACK. TIME_WAIT state lasts 2*MSL (Maximum Segment Lifetime) to ensure remote host receives final ACK and old duplicates drain from network.',
        resources: [
          {
            title: 'Cloudflare: Demystifying TCP Handshakes and Resets',
            url: 'https://blog.cloudflare.com/',
            type: 'BLOG',
            description: 'Real-world packet captures showing SYN floods and TCP reset flags.'
          },
          {
            title: 'RFC 793 - Transmission Control Protocol Specification',
            url: 'https://datatracker.ietf.org/doc/html/rfc793',
            type: 'DOCUMENTATION',
            description: 'Official standard document describing TCP state transitions.'
          }
        ],
        completedMilestones: [
          {
            revisionNumber: 1,
            daysAgo: 19,
            understandingLevel: 'EASY',
            recallAssistance: 'INDEPENDENT',
            notes: 'SYN, SYN-ACK, ACK sequence recalled.'
          },
          {
            revisionNumber: 2,
            daysAgo: 16,
            understandingLevel: 'MEDIUM',
            recallAssistance: 'INDEPENDENT',
            notes: 'Recalled sequence number increments.'
          },
          {
            revisionNumber: 3,
            daysAgo: 13,
            understandingLevel: 'MEDIUM',
            recallAssistance: 'PARTIAL',
            notes: 'Reviewed TIME_WAIT duration (2*MSL).'
          }
          // R4 was due 5 days ago -> OVERDUE!
        ]
      },
      {
        title: 'React useEffect Lifecycle & Cleanup Functions',
        category: 'React',
        subcategory: 'Hooks & Rendering',
        studyDate: getRelativeDate(0), // Studied TODAY: R1 scheduled for TOMORROW!
        notes:
          'useEffect runs after paint. Dependency array controls execution: no deps = every render, empty array [] = mount/unmount only, [deps] = when deps change via Object.is(). Cleanup function returned by effect executes before the next effect runs and on unmount. Prevents memory leaks in subscriptions, event listeners, and timers.',
        resources: [
          {
            title: 'React.dev Official Documentation: Synchronizing with Effects',
            url: 'https://react.dev/learn/synchronizing-with-effects',
            type: 'DOCUMENTATION',
            description: 'Official React team guide to effect lifecycles and cleanups.'
          },
          {
            title: 'Overreacted: A Complete Guide to useEffect by Dan Abramov',
            url: 'https://overreacted.io/a-complete-guide-to-useeffect/',
            type: 'BLOG',
            description: 'Deep dive into closures, captured props, and dependency arrays.'
          }
        ],
        completedMilestones: [] // R1 is scheduled for TOMORROW!
      },
      {
        title: 'System Design: Consistent Hashing & Distributed Caching',
        category: 'System Design',
        subcategory: 'Distributed Systems & Scaling',
        studyDate: getRelativeDate(-2), // Studied 2 days ago: R1 (+1d) was due yesterday -> OVERDUE!
        notes:
          'Standard modulo hashing (hash(key) % N) causes massive cache misses when servers are added/removed. Consistent hashing maps both keys and servers to a logical ring [0, 2^32 - 1]. Key is assigned to first server encountered clockwise. Virtual nodes (vnodes) prevent hot spots and balance key distribution.',
        resources: [
          {
            title: 'System Design Primer: Consistent Hashing',
            url: 'https://github.com/donnemartin/system-design-primer',
            type: 'GITHUB',
            description: 'Architecture diagram and trade-offs of consistent hash rings.'
          },
          {
            title: 'Consistent Hashing Explained with Interactive Diagrams',
            url: 'https://www.youtube.com/watch?v=zaRkONvyGr8',
            type: 'YOUTUBE',
            description: 'Visual demonstration of ring wrapping and virtual node distribution.'
          }
        ],
        completedMilestones: [] // R1 was due yesterday -> OVERDUE!
      }
    ];

    for (const t of sampleTopics) {
      const topicDoc = await Topic.create({
        userId: demoUser._id,
        title: t.title,
        category: t.category,
        subcategory: t.subcategory,
        studyDate: t.studyDate,
        notes: t.notes,
        resources: t.resources
      });

      const schedule = generateRevisionSchedule(t.studyDate);

      const revisionDocs = schedule.map((item) => {
        const completedInfo = t.completedMilestones.find(
          (m) => m.revisionNumber === item.revisionNumber
        );

        if (completedInfo) {
          const completedDate = new Date();
          completedDate.setDate(completedDate.getDate() - completedInfo.daysAgo);

          return {
            userId: demoUser._id,
            topicId: topicDoc._id,
            revisionNumber: item.revisionNumber,
            scheduledDate: item.scheduledDate,
            status: 'COMPLETED',
            completedAt: completedDate,
            understandingLevel: completedInfo.understandingLevel,
            recallAssistance: completedInfo.recallAssistance,
            revisionNotes: completedInfo.notes
          };
        }

        return {
          userId: demoUser._id,
          topicId: topicDoc._id,
          revisionNumber: item.revisionNumber,
          scheduledDate: item.scheduledDate,
          status: 'PENDING'
        };
      });

      await Revision.insertMany(revisionDocs);
      console.log(`  ✔ Seeded "${t.title}" with 9 revisions`);
    }

    console.log('\n====================================================');
    console.log('🎉 Dummy data successfully inserted into RecallC!');
    console.log('====================================================');
    console.log('Demo Credentials:');
    console.log('  Email:    demo@recallc.dev');
    console.log('  Password: password123');
    console.log('Data Summary:');
    console.log('  - Topics Created:       6 topics across DSA, Java, DBMS, React, CN, System Design');
    console.log('  - Revisions Created:    54 total revisions (9 per topic)');
    console.log('  - Revisions Due Today:  2 revisions ready to recall');
    console.log('  - Revisions Overdue:    3 missed revisions to prioritize');
    console.log('  - Revisions Completed:  6 historical completions with ratings & notes');
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedData();
