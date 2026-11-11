const mongoose = require('mongoose');
const Revision = require('../models/Revision');
const { Topic } = require('../models/Topic');
const { getTodayDateString } = require('../utils/dateUtils');

/**
 * Returns optimized dashboard metrics and priority queues
 */
async function getDashboardSummary(userId, clientTimezone) {
  const today = getTodayDateString(clientTimezone);

  const [
    totalTopics,
    completedRevisions,
    pendingRevisions,
    overdueCount,
    dueTodayCount,
    dueTodayRevisions,
    overdueRevisions,
    upcomingRevisions
  ] = await Promise.all([
    Topic.countDocuments({ userId }),
    Revision.countDocuments({ userId, status: 'COMPLETED' }),
    Revision.countDocuments({ userId, status: 'PENDING' }),
    Revision.countDocuments({ userId, status: 'PENDING', scheduledDate: { $lt: today } }),
    Revision.countDocuments({ userId, status: 'PENDING', scheduledDate: today }),
    Revision.find({ userId, status: 'PENDING', scheduledDate: today })
      .populate('topicId', 'title category subcategory studyDate')
      .sort({ revisionNumber: 1 })
      .limit(10)
      .lean(),
    Revision.find({ userId, status: 'PENDING', scheduledDate: { $lt: today } })
      .populate('topicId', 'title category subcategory studyDate')
      .sort({ scheduledDate: 1, revisionNumber: 1 })
      .limit(10)
      .lean(),
    Revision.find({ userId, status: 'PENDING', scheduledDate: { $gt: today } })
      .populate('topicId', 'title category subcategory studyDate')
      .sort({ scheduledDate: 1, revisionNumber: 1 })
      .limit(5)
      .lean()
  ]);

  // Calculate safe percentage completion
  const totalRevisions = completedRevisions + pendingRevisions;
  const overallCompletionRate =
    totalRevisions > 0 ? Math.round((completedRevisions / totalRevisions) * 100) : 0;

  return {
    todayDate: today,
    stats: {
      totalTopics,
      completedRevisions,
      pendingRevisions,
      overdueCount,
      dueTodayCount,
      overallCompletionRate
    },
    dueTodayRevisions,
    overdueRevisions,
    upcomingRevisions
  };
}

/**
 * Aggregates analytical data across categories, recall quality, and completion rates
 */
async function getProgressSummary(userId) {
  const [
    totalTopics,
    totalRevisions,
    completedRevisions,
    pendingRevisions,
    categoryBreakdown,
    understandingStats,
    assistanceStats
  ] = await Promise.all([
    Topic.countDocuments({ userId }),
    Revision.countDocuments({ userId }),
    Revision.countDocuments({ userId, status: 'COMPLETED' }),
    Revision.countDocuments({ userId, status: 'PENDING' }),
    // Category counts
    Topic.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    // Understanding breakdown
    Revision.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: 'COMPLETED',
          understandingLevel: { $ne: null }
        }
      },
      { $group: { _id: '$understandingLevel', count: { $sum: 1 } } }
    ]),
    // Recall assistance breakdown
    Revision.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: 'COMPLETED',
          recallAssistance: { $ne: null }
        }
      },
      { $group: { _id: '$recallAssistance', count: { $sum: 1 } } }
    ])
  ]);

  const categoryMap = {};
  categoryBreakdown.forEach((item) => {
    categoryMap[item._id] = item.count;
  });

  const understandingMap = { EASY: 0, MEDIUM: 0, HARD: 0 };
  understandingStats.forEach((item) => {
    if (understandingMap[item._id] !== undefined) {
      understandingMap[item._id] = item.count;
    }
  });

  const assistanceMap = { INDEPENDENT: 0, PARTIAL: 0, NEEDED_RESOURCES: 0 };
  assistanceStats.forEach((item) => {
    if (assistanceMap[item._id] !== undefined) {
      assistanceMap[item._id] = item.count;
    }
  });

  const completionRate =
    totalRevisions > 0 ? Math.round((completedRevisions / totalRevisions) * 100) : 0;

  return {
    overview: {
      totalTopics,
      totalRevisions,
      completedRevisions,
      pendingRevisions,
      completionRate
    },
    categoryBreakdown: categoryMap,
    understandingBreakdown: understandingMap,
    assistanceBreakdown: assistanceMap
  };
}

/**
 * Paginated completed revision history
 */
async function getRevisionHistory(userId, { page = 1, limit = 20, topicId }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const query = {
    userId,
    status: 'COMPLETED'
  };

  if (topicId && mongoose.Types.ObjectId.isValid(topicId)) {
    query.topicId = topicId;
  }

  const [total, history] = await Promise.all([
    Revision.countDocuments(query),
    Revision.find(query)
      .populate('topicId', 'title category subcategory studyDate')
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean()
  ]);

  return {
    history,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1
    }
  };
}

module.exports = {
  getDashboardSummary,
  getProgressSummary,
  getRevisionHistory
};

