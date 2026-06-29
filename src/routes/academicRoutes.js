const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const academicController = require('../controllers/academicController');

router.get('/student/:studentId/performance', protect, academicController.getStudentPerformance);
router.get('/', protect, academicController.getAllAcademic);
router.post('/', protect, restrictTo('teacher', 'school_admin'), academicController.createAcademic);
router.get('/:id', protect, academicController.getAcademicById);
router.patch('/:id', protect, restrictTo('teacher', 'school_admin'), academicController.updateAcademic);
router.delete('/:id', protect, restrictTo('teacher', 'school_admin'), academicController.deleteAcademic);

module.exports = router;
