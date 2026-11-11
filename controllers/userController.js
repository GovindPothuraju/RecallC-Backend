const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const authService = require('../services/authService');

const getProfile = asyncHandler(async (req, res) => {
  const user = await authService.getUserProfile(req.user._id);
  return ApiResponse.success(res, 200, 'User profile retrieved successfully', { user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateUserProfile(req.user._id, req.body);
  return ApiResponse.success(res, 200, 'User profile updated successfully', { user });
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changeUserPassword(
    req.user._id,
    req.body.currentPassword,
    req.body.newPassword
  );
  return ApiResponse.success(res, 200, result.message, {});
});

module.exports = {
  getProfile,
  updateProfile,
  changePassword
};

