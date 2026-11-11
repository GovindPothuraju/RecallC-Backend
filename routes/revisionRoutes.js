const express = require('express');
const router = express.Router();
const revisionController = require('../controllers/revisionController');
const { protect } = require('../middleware/auth');
const { validateCompleteRevision } = require('../validators/revisionValidator');

router.use(protect);

router.get('/', revisionController.getAll);
router.get('/today', revisionController.getToday);
router.get('/overdue', revisionController.getOverdue);
router.get('/:id', revisionController.getOne);
router.post('/:id/complete', validateCompleteRevision, revisionController.complete);

module.exports = router;

