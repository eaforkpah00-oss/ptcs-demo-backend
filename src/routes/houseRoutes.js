const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const houseController = require('../controllers/houseController');

router.get('/my-houses', protect, restrictTo('housemaster'), houseController.getMyHouses);
router.get('/', protect, houseController.getAllHouses);
router.post('/', protect, restrictTo('school_admin', 'super_admin'), houseController.createHouse);
router.get('/:id', protect, houseController.getHouseById);
router.patch('/:id', protect, restrictTo('school_admin', 'super_admin', 'housemaster'), houseController.updateHouse);
router.delete('/:id', protect, restrictTo('school_admin', 'super_admin'), houseController.deleteHouse);
router.get('/:id/students', protect, houseController.getHouseStudents);
router.post('/:id/students', protect, restrictTo('school_admin', 'super_admin'), houseController.addStudentToHouse);
router.delete('/:id/students/:studentId', protect, restrictTo('school_admin', 'super_admin'), houseController.removeStudentFromHouse);

module.exports = router;
