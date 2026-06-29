const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const welfareController = require('../controllers/welfareController');

router.get('/student/:studentId', protect, welfareController.getStudentWelfareHistory);
router.get('/house/:houseId/summary', protect, welfareController.getHouseWelfareSummary);
router.get('/', protect, welfareController.getAllWelfare);
router.post('/', protect, restrictTo('housemaster', 'school_admin'), welfareController.createWelfare);
router.get('/:id', protect, welfareController.getWelfareById);
router.patch('/:id', protect, restrictTo('housemaster', 'school_admin'), welfareController.updateWelfare);
router.delete('/:id', protect, restrictTo('housemaster', 'school_admin'), welfareController.deleteWelfare);

module.exports = router;
