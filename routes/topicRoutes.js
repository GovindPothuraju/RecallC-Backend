const express = require('express');
const router = express.Router();
const topicController = require('../controllers/topicController');
const { protect } = require('../middleware/auth');
const { validateCreateTopic, validateUpdateTopic } = require('../validators/topicValidator');

router.use(protect);

router.post('/', validateCreateTopic, topicController.create);
router.get('/', topicController.getAll);
router.get('/:id', topicController.getOne);
router.put('/:id', validateUpdateTopic, topicController.update);
router.delete('/:id', topicController.remove);

module.exports = router;

