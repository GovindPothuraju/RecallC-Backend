const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const statsService = require('../services/statsService');

const getSummary = asyncHandler(async (req, res) => {
  const summary = await statsService.getProgressSummary(req.user._id);
  return ApiResponse.success(res, 200, 'Progress summary retrieved successfully', summary);
});

const getHistory = asyncHandler(async (req, res) => {
  const result = await statsService.getRevisionHistory(req.user._id, req.query);
  return ApiResponse.success(
    res,
    200,
    'Revision history retrieved successfully',
    { history: result.history },
    result.pagination
  );
});

module.exports = {
  getSummary,
  getHistory
};

