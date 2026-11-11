const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/apiError');

function generateToken(userId) {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
}

async function registerUser(name, email, password) {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const user = await User.create({
    name,
    email,
    password
  });

  const token = generateToken(user._id);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    },
    token
  };
}

async function loginUser(email, password) {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const token = generateToken(user._id);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    },
    token
  };
}

async function getUserProfile(userId) {
  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

async function updateUserProfile(userId, { name }) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (name) {
    user.name = name;
  }

  await user.save();

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    updatedAt: user.updatedAt
  };
}

async function changeUserPassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  return { message: 'Password updated successfully' };
}

module.exports = {
  generateToken,
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changeUserPassword
};

