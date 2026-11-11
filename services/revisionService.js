const mongoose = require('mongoose');
const Revision = require('../models/Revision');
const { Topic } = require('../models/Topic');
const ApiError = require('../utils/apiError');
const { getTodayDateString, checkCompletionEligibility } = require('../utils/dateUtils');

/**
 * Fetches revisions with optional filtering and pagination
 */
async function getRevisions(userId, { status, topicId, page = 1, limit = 20 }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const query = { userId };
  if (status) {
    query.status = status.toUpperCase();
  }
  if (topicId && mongoose.Types.ObjectId.isValid(topicId)) {
    query.topicId = topicId;
  }

  const [total, revisions] = await Promise.all([
    Revision.countDocuments(query),
    Revision.find(query)
      .populate('topicId', 'title category subcategory studyDate')
      .sort({ scheduledDate: 1, revisionNumber: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean()
  ]);

  return {
    revisions,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1
    }
  };
}

/**
 * Fetches revisions due today (pending and scheduled for today)
 */
async function getDueTodayRevisions(userId, clientTimezone) {
  const today = getTodayDateString(clientTimezone);

  const revisions = await Revision.find({
    userId,
    status: 'PENDING',
    scheduledDate: today
  })
    .populate('topicId', 'title category subcategory studyDate resources notes')
    .sort({ revisionNumber: 1 })
    .lean();

  return {
    todayDate: today,
    count: revisions.length,
    revisions
  };
}

/**
 * Fetches revisions that are overdue (pending and scheduled before today)
 */
async function getOverdueRevisions(userId, clientTimezone) {
  const today = getTodayDateString(clientTimezone);

  const revisions = await Revision.find({
    userId,
    status: 'PENDING',
    scheduledDate: { $lt: today }
  })
    .populate('topicId', 'title category subcategory studyDate resources notes')
    .sort({ scheduledDate: 1, revisionNumber: 1 })
    .lean();

  return {
    todayDate: today,
    count: revisions.length,
    revisions
  };
}

/**
 * Fetches a single revision by ID with populated topic
 */
async function getRevisionById(userId, revisionId) {
  if (!mongoose.Types.ObjectId.isValid(revisionId)) {
    throw ApiError.badRequest('Invalid revision ID format');
  }

  const revision = await Revision.findOne({ _id: revisionId, userId })
    .populate('topicId', 'title category subcategory studyDate notes resources')
    .lean();

  if (!revision) {
    throw ApiError.notFound('Revision not found or does not belong to user');
  }

  return revision;
}

/**
 * Completes a revision with atomic conditional update
 */
async function completeRevision(userId, revisionId, completionData, clientTimezone) {
  if (!mongoose.Types.ObjectId.isValid(revisionId)) {
    throw ApiError.badRequest('Invalid revision ID format');
  }

  const today = getTodayDateString(clientTimezone);

  // Check revision status and early completion eligibility
  const existing = await Revision.findOne({ _id: revisionId, userId }).lean();
  if (!existing) {
    throw ApiError.notFound('Revision not found or does not belong to user');
  }

  if (existing.status === 'COMPLETED') {
    throw ApiError.badRequest('This revision has already been completed');
  }

  // Check 2-calendar-day early completion rule
  const eligibility = checkCompletionEligibility(existing.scheduledDate, today);
  if (!eligibility.allowed) {
    throw ApiError.badRequest(eligibility.reason);
  }

  const { understandingLevel, recallAssistance, revisionNotes } = completionData;

  // Atomic update to avoid race conditions
  const updatedRevision = await Revision.findOneAndUpdate(
    {
      _id: revisionId,
      userId,
      status: 'PENDING'
    },
    {
      $set: {
        status: 'COMPLETED',
        completedAt: new Date(),
        understandingLevel,
        recallAssistance,
        revisionNotes: revisionNotes || ''
      }
    },
    { new: true }
  )
    .populate('topicId', 'title category subcategory studyDate notes resources')
    .lean();

  if (!updatedRevision) {
    throw ApiError.conflict('Revision was already completed by another concurrent request');
  }

  return updatedRevision;
}

module.exports = {
  getRevisions,
  getDueTodayRevisions,
  getOverdueRevisions,
  getRevisionById,
  completeRevision
};

