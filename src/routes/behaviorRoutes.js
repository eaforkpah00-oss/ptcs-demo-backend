const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const behaviorController = require('../controllers/behaviorController');

router.get('/student/:studentId', protect, behaviorController.getStudentBehaviorHistory);
router.get('/', protect, behaviorController.getAllBehavior);
router.post('/', protect, restrictTo('teacher', 'school_admin', 'housemaster'), behaviorController.createBehavior);
router.get('/:id', protect, behaviorController.getBehaviorById);
router.patch('/:id', protect, restrictTo('teacher', 'school_admin'), behaviorController.updateBehavior);
router.delete('/:id', protect, restrictTo('teacher', 'school_admin'), behaviorController.deleteBehavior);

module.exports = router;
