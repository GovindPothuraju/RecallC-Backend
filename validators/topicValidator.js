const ApiError = require('../utils/apiError');
const { isValidDateString } = require('../utils/dateUtils');

const VALID_RESOURCE_TYPES = ['YOUTUBE', 'BLOG', 'GITHUB', 'DOCUMENTATION', 'OTHER'];

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function validateCreateTopic(req, res, next) {
  const { title, category, subcategory, studyDate, notes, resources } = req.body;
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length < 2) {
    errors.push('Topic title must be at least 2 characters long');
  } else if (title.trim().length > 150) {
    errors.push('Topic title cannot exceed 150 characters');
  }

  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    errors.push('Category is required');
  }

  if (!studyDate || !isValidDateString(studyDate)) {
    errors.push('Valid study date in YYYY-MM-DD format is required');
  }

  if (resources && !Array.isArray(resources)) {
    errors.push('Resources must be an array');
  } else if (Array.isArray(resources)) {
    resources.forEach((r, idx) => {
      if (!r.title || typeof r.title !== 'string' || r.title.trim().length === 0) {
        errors.push(`Resource #${idx + 1}: Title is required`);
      }
      if (!r.url || typeof r.url !== 'string' || !isValidUrl(r.url.trim())) {
        errors.push(`Resource #${idx + 1}: Valid URL (http:// or https://) is required`);
      }
      if (r.type && !VALID_RESOURCE_TYPES.includes(r.type)) {
        errors.push(`Resource #${idx + 1}: Invalid type (${r.type})`);
      }
    });
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Validation failed', errors));
  }

  req.body.title = title.trim();
  req.body.category = category.trim();
  req.body.subcategory = subcategory ? subcategory.trim() : '';
  req.body.notes = notes ? notes.trim() : '';
  if (Array.isArray(resources)) {
    req.body.resources = resources.map((r, i) => ({
      title: r.title.trim(),
      url: r.url.trim(),
      type: r.type || 'OTHER',
      description: r.description ? r.description.trim() : '',
      order: r.order !== undefined ? r.order : i
    }));
  }

  next();
}

function validateUpdateTopic(req, res, next) {
  const { title, category, subcategory, notes, resources, studyDate } = req.body;
  const errors = [];

  // studyDate is read-only after creation
  if (studyDate !== undefined) {
    // If sent, warn or ignore, but do not allow altering
    delete req.body.studyDate;
  }

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length < 2) {
      errors.push('Topic title must be at least 2 characters long');
    } else if (title.trim().length > 150) {
      errors.push('Topic title cannot exceed 150 characters');
    } else {
      req.body.title = title.trim();
    }
  }

  if (category !== undefined) {
    if (typeof category !== 'string' || category.trim().length === 0) {
      errors.push('Category cannot be empty');
    } else {
      req.body.category = category.trim();
    }
  }

  if (subcategory !== undefined) {
    req.body.subcategory = typeof subcategory === 'string' ? subcategory.trim() : '';
  }

  if (notes !== undefined) {
    req.body.notes = typeof notes === 'string' ? notes.trim() : '';
  }

  if (resources !== undefined) {
    if (!Array.isArray(resources)) {
      errors.push('Resources must be an array');
    } else {
      resources.forEach((r, idx) => {
        if (!r.title || typeof r.title !== 'string' || r.title.trim().length === 0) {
          errors.push(`Resource #${idx + 1}: Title is required`);
        }
        if (!r.url || typeof r.url !== 'string' || !isValidUrl(r.url.trim())) {
          errors.push(`Resource #${idx + 1}: Valid URL (http:// or https://) is required`);
        }
        if (r.type && !VALID_RESOURCE_TYPES.includes(r.type)) {
          errors.push(`Resource #${idx + 1}: Invalid type (${r.type})`);
        }
      });

      if (errors.length === 0) {
        req.body.resources = resources.map((r, i) => ({
          title: r.title.trim(),
          url: r.url.trim(),
          type: r.type || 'OTHER',
          description: r.description ? r.description.trim() : '',
          order: r.order !== undefined ? r.order : i
        }));
      }
    }
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Validation failed', errors));
  }

  next();
}

module.exports = {
  validateCreateTopic,
  validateUpdateTopic
};

