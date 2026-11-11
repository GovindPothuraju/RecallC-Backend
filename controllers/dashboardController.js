const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const statsService = require('../services/statsService');

const getSummary = asyncHandler(async (req, res) => {
  const timezone = req.headers['x-timezone'] || req.query.timezone;
  const summary = await statsService.getDashboardSummary(req.user._id, timezone);
  return ApiResponse.success(res, 200, 'Dashboard summary retrieved successfully', summary);
});

module.exports = {
  getSummary
};

