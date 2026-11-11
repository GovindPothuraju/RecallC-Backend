const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const authService = require('../services/authService');

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const result = await authService.registerUser(name, email, password);
  return ApiResponse.success(res, 201, 'User registered successfully', result);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginUser(email, password);
  return ApiResponse.success(res, 200, 'Login successful', result);
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getUserProfile(req.user._id);
  return ApiResponse.success(res, 200, 'Profile fetched successfully', { user });
});

const logout = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, 200, 'Logged out successfully', {});
});

module.exports = {
  register,
  login,
  getMe,
  logout
};

