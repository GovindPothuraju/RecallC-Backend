const ApiError = require('../utils/apiError');
const config = require('../config/env');

function errorHandler(err, req, res, next) {
  let error = err;

  // If not an instance of ApiError, transform known errors
  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal server error';
    let errors = [];

    // Mongoose bad ObjectId (CastError)
    if (error.name === 'CastError') {
      statusCode = 400;
      message = `Invalid format for field '${error.path}': ${error.value}`;
    }

    // Mongoose validation error
    else if (error.name === 'ValidationError') {
      statusCode = 422;
      message = 'Validation failed';
      errors = Object.values(error.errors).map((e) => e.message);
    }

    // MongoDB duplicate key error (E11000)
    else if (error.code === 11000) {
      statusCode = 409;
      const field = Object.keys(error.keyValue || {})[0] || 'field';
      message = `A record with this ${field} already exists`;
      errors = [`Duplicate value for ${field}`];
    }

    // JWT errors
    else if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid authentication token';
    } else if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Authentication token expired';
    }

    error = new ApiError(statusCode, message, errors);
  }

  // Log server errors (500)
  if (error.statusCode >= 500) {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
  }

  const response = {
    success: false,
    message: error.message,
    errors: error.errors && error.errors.length > 0 ? error.errors : [error.message]
  };

  if (config.nodeEnv === 'development' && error.statusCode >= 500) {
    response.stack = err.stack;
  }

  return res.status(error.statusCode).json(response);
}

module.exports = errorHandler;

