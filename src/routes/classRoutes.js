const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const classController = require('../controllers/classController');

router.get('/my-classes', protect, restrictTo('teacher'), classController.getMyClasses);
router.get('/', protect, classController.getAllClasses);
router.post('/', protect, restrictTo('school_admin', 'super_admin'), classController.createClass);
router.get('/:id', protect, classController.getClassById);
router.patch('/:id', protect, restrictTo('school_admin', 'super_admin'), classController.updateClass);
router.delete('/:id', protect, restrictTo('school_admin', 'super_admin'), classController.deleteClass);
router.patch('/:id/assign-teacher', protect, restrictTo('school_admin', 'super_admin'), classController.assignTeacher);

module.exports = router;
