class ApiResponse {
  static success(res, statusCode = 200, message = 'Success', data = {}, pagination = null) {
    const payload = {
      success: true,
      message,
      data
    };

    if (pagination) {
      payload.pagination = pagination;
    }

    return res.status(statusCode).json(payload);
  }

  static error(res, statusCode = 500, message = 'An error occurred', errors = []) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors: Array.isArray(errors) ? errors : [errors]
    });
  }
}

module.exports = ApiResponse;

