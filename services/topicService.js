const mongoose = require('mongoose');
const { Topic } = require('../models/Topic');
const Revision = require('../models/Revision');
const ApiError = require('../utils/apiError');
const { generateRevisionSchedule } = require('../utils/dateUtils');

/**
 * Creates a topic and its 9 revision records atomically.
 * Uses a MongoDB session/transaction when replica set is enabled,
 * with automatic fallback & cleanup if standalone MongoDB doesn't support transactions.
 */
async function createTopic(userId, topicData) {
  const schedule = generateRevisionSchedule(topicData.studyDate);

  let session = null;
  let useTransaction = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    useTransaction = true;
  } catch (err) {
    // Standalone MongoDB without replica set does not support transactions
    session = null;
    useTransaction = false;
  }

  let createdTopic = null;

  try {
    const topicDoc = new Topic({
      ...topicData,
      userId
    });

    if (useTransaction) {
      createdTopic = await topicDoc.save({ session });
    } else {
      createdTopic = await topicDoc.save();
    }

    const revisionDocs = schedule.map((item) => ({
      userId,
      topicId: createdTopic._id,
      revisionNumber: item.revisionNumber,
      scheduledDate: item.scheduledDate,
      status: 'PENDING'
    }));

    if (useTransaction) {
      await Revision.insertMany(revisionDocs, { session });
      await session.commitTransaction();
    } else {
      try {
        await Revision.insertMany(revisionDocs);
      } catch (insertError) {
        // Rollback created topic if revision creation failed
        await Topic.findByIdAndDelete(createdTopic._id);
        throw insertError;
      }
    }

    return createdTopic;
  } catch (error) {
    if (useTransaction && session) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
}

/**
 * Fetches topics with filtering, search, pagination, and next pending revision info
 */
async function getTopics(userId, { page = 1, limit = 10, category, search, sortBy = 'createdAt', sortOrder = 'desc' }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const query = { userId };

  if (category && category !== 'ALL') {
    query.category = category;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [{ title: searchRegex }, { subcategory: searchRegex }, { notes: searchRegex }];
  }

  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const sortOptions = {};
  sortOptions[sortBy] = sortDirection;

  const [total, topics] = await Promise.all([
    Topic.countDocuments(query),
    Topic.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean()
  ]);

  // Attach next pending revision info for each topic
  const topicIds = topics.map((t) => t._id);
  const nextRevisions = await Revision.aggregate([
    {
      $match: {
        topicId: { $in: topicIds },
        status: 'PENDING'
      }
    },
    {
      $sort: { revisionNumber: 1 }
    },
    {
      $group: {
        _id: '$topicId',
        nextRevisionNumber: { $first: '$revisionNumber' },
        nextScheduledDate: { $first: '$scheduledDate' },
        pendingCount: { $sum: 1 }
      }
    }
  ]);

  const revisionMap = new Map();
  nextRevisions.forEach((r) => {
    revisionMap.set(r._id.toString(), r);
  });

  const topicsWithSchedule = topics.map((t) => {
    const revInfo = revisionMap.get(t._id.toString());
    return {
      ...t,
      nextRevision: revInfo
        ? {
            revisionNumber: revInfo.nextRevisionNumber,
            scheduledDate: revInfo.nextScheduledDate
          }
        : null,
      pendingRevisionsCount: revInfo ? revInfo.pendingCount : 0
    };
  });

  return {
    topics: topicsWithSchedule,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1
    }
  };
}

/**
 * Gets a single topic by ID along with its 9 revision timeline records
 */
async function getTopicById(userId, topicId) {
  if (!mongoose.Types.ObjectId.isValid(topicId)) {
    throw ApiError.badRequest('Invalid topic ID format');
  }

  const topic = await Topic.findOne({ _id: topicId, userId }).lean();
  if (!topic) {
    throw ApiError.notFound('Topic not found or does not belong to user');
  }

  const revisions = await Revision.find({ topicId, userId })
    .sort({ revisionNumber: 1 })
    .lean();

  return {
    ...topic,
    revisions
  };
}

/**
 * Updates a topic's editable fields (does not regenerate schedule)
 */
async function updateTopic(userId, topicId, updateData) {
  if (!mongoose.Types.ObjectId.isValid(topicId)) {
    throw ApiError.badRequest('Invalid topic ID format');
  }

  // Prevent modifying studyDate
  delete updateData.studyDate;
  delete updateData.userId;

  const topic = await Topic.findOneAndUpdate(
    { _id: topicId, userId },
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean();

  if (!topic) {
    throw ApiError.notFound('Topic not found or does not belong to user');
  }

  return topic;
}

/**
 * Safely and cascade deletes a topic and its revisions
 */
async function deleteTopic(userId, topicId) {
  if (!mongoose.Types.ObjectId.isValid(topicId)) {
    throw ApiError.badRequest('Invalid topic ID format');
  }

  let session = null;
  let useTransaction = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    useTransaction = true;
  } catch (err) {
    session = null;
    useTransaction = false;
  }

  try {
    let deletedTopic = null;

    if (useTransaction) {
      deletedTopic = await Topic.findOneAndDelete({ _id: topicId, userId }, { session });
      if (!deletedTopic) {
        throw ApiError.notFound('Topic not found or does not belong to user');
      }
      await Revision.deleteMany({ topicId, userId }, { session });
      await session.commitTransaction();
    } else {
      deletedTopic = await Topic.findOneAndDelete({ _id: topicId, userId });
      if (!deletedTopic) {
        throw ApiError.notFound('Topic not found or does not belong to user');
      }
      await Revision.deleteMany({ topicId, userId });
    }

    return { message: 'Topic and its revisions successfully deleted' };
  } catch (error) {
    if (useTransaction && session) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
}

module.exports = {
  createTopic,
  getTopics,
  getTopicById,
  updateTopic,
  deleteTopic
};

