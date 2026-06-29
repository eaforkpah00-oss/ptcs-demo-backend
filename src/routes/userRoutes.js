const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const upload = require('../middleware/upload');
const userController = require('../controllers/userController');

router.get('/stats', protect, restrictTo('school_admin', 'super_admin'), userController.getUserStats);
router.get('/', protect, restrictTo('school_admin', 'super_admin', 'teacher', 'housemaster'), userController.getAllUsers);
router.post('/', protect, restrictTo('school_admin', 'super_admin'), userController.createUser);
router.get('/:id', protect, userController.getUserById);
router.patch('/:id', protect, restrictTo('school_admin', 'super_admin'), userController.updateUser);
router.delete('/:id', protect, restrictTo('school_admin', 'super_admin'), userController.deleteUser);
router.patch('/:id/photo', protect, upload.single('photo'), userController.uploadPhoto);

module.exports = router;
