const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/apiResponse');
const topicService = require('../services/topicService');

const create = asyncHandler(async (req, res) => {
  const topic = await topicService.createTopic(req.user._id, req.body);
  return ApiResponse.success(res, 201, 'Topic created with 9 scheduled revisions', { topic });
});

const getAll = asyncHandler(async (req, res) => {
  const result = await topicService.getTopics(req.user._id, req.query);
  return ApiResponse.success(
    res,
    200,
    'Topics retrieved successfully',
    { topics: result.topics },
    result.pagination
  );
});

const getOne = asyncHandler(async (req, res) => {
  const topic = await topicService.getTopicById(req.user._id, req.params.id);
  return ApiResponse.success(res, 200, 'Topic retrieved successfully', { topic });
});

const update = asyncHandler(async (req, res) => {
  const topic = await topicService.updateTopic(req.user._id, req.params.id, req.body);
  return ApiResponse.success(res, 200, 'Topic updated successfully', { topic });
});

const remove = asyncHandler(async (req, res) => {
  const result = await topicService.deleteTopic(req.user._id, req.params.id);
  return ApiResponse.success(res, 200, result.message, {});
});

module.exports = {
  create,
  getAll,
  getOne,
  update,
  remove
};

