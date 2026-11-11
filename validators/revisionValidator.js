const ApiError = require('../utils/apiError');

const VALID_UNDERSTANDING_LEVELS = ['EASY', 'MEDIUM', 'HARD'];
const VALID_RECALL_ASSISTANCE = ['INDEPENDENT', 'PARTIAL', 'NEEDED_RESOURCES'];

function validateCompleteRevision(req, res, next) {
  const { understandingLevel, recallAssistance, revisionNotes } = req.body;
  const errors = [];

  if (!understandingLevel || !VALID_UNDERSTANDING_LEVELS.includes(understandingLevel)) {
    errors.push(`Understanding level is required and must be one of: ${VALID_UNDERSTANDING_LEVELS.join(', ')}`);
  }

  if (!recallAssistance || !VALID_RECALL_ASSISTANCE.includes(recallAssistance)) {
    errors.push(`Recall assistance is required and must be one of: ${VALID_RECALL_ASSISTANCE.join(', ')}`);
  }

  if (revisionNotes && typeof revisionNotes === 'string' && revisionNotes.length > 2000) {
    errors.push('Revision notes cannot exceed 2000 characters');
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Validation failed', errors));
  }

  req.body.understandingLevel = understandingLevel;
  req.body.recallAssistance = recallAssistance;
  req.body.revisionNotes = revisionNotes ? revisionNotes.trim() : '';

  next();
}

module.exports = {
  validateCompleteRevision
};

