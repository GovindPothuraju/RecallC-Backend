const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const revisionService = require('../services/revisionService');

const getAll = asyncHandler(async (req, res) => {
  const result = await revisionService.getRevisions(req.user._id, req.query);
  return ApiResponse.success(
    res,
    200,
    'Revisions retrieved successfully',
    { revisions: result.revisions },
    result.pagination
  );
});

const getToday = asyncHandler(async (req, res) => {
  const timezone = req.headers['x-timezone'] || req.query.timezone;
  const result = await revisionService.getDueTodayRevisions(req.user._id, timezone);
  return ApiResponse.success(res, 200, "Today's revisions retrieved successfully", result);
});

const getOverdue = asyncHandler(async (req, res) => {
  const timezone = req.headers['x-timezone'] || req.query.timezone;
  const result = await revisionService.getOverdueRevisions(req.user._id, timezone);
  return ApiResponse.success(res, 200, 'Overdue revisions retrieved successfully', result);
});

const getOne = asyncHandler(async (req, res) => {
  const revision = await revisionService.getRevisionById(req.user._id, req.params.id);
  return ApiResponse.success(res, 200, 'Revision details retrieved successfully', { revision });
});

const complete = asyncHandler(async (req, res) => {
  const timezone = req.headers['x-timezone'] || req.query.timezone;
  const revision = await revisionService.completeRevision(
    req.user._id,
    req.params.id,
    req.body,
    timezone
  );
  return ApiResponse.success(res, 200, 'Revision completed successfully', { revision });
});

module.exports = {
  getAll,
  getToday,
  getOverdue,
  getOne,
  complete
};

