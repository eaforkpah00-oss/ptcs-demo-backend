const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const studentController = require('../controllers/studentController');

router.get('/my-children', protect, restrictTo('parent'), studentController.getMyChildren);
router.get('/', protect, studentController.getAllStudents);
router.post('/', protect, restrictTo('school_admin', 'super_admin'), studentController.createStudent);
router.get('/:id', protect, studentController.getStudentById);
router.patch('/:id', protect, restrictTo('school_admin', 'super_admin'), studentController.updateStudent);
router.delete('/:id', protect, restrictTo('school_admin', 'super_admin'), studentController.deleteStudent);
router.patch('/:id/link-parent', protect, restrictTo('school_admin', 'super_admin'), studentController.linkParent);

module.exports = router;
