const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const announcementController = require('../controllers/announcementController');

router.get('/', protect, announcementController.getAllAnnouncements);
router.post('/', protect, restrictTo('school_admin', 'super_admin'), announcementController.createAnnouncement);
router.get('/:id', protect, announcementController.getAnnouncementById);
router.patch('/:id', protect, restrictTo('school_admin', 'super_admin'), announcementController.updateAnnouncement);
router.delete('/:id', protect, restrictTo('school_admin', 'super_admin'), announcementController.deleteAnnouncement);
router.patch('/:id/pin', protect, restrictTo('school_admin', 'super_admin'), announcementController.pinAnnouncement);
router.patch('/:id/read', protect, announcementController.markAnnouncementRead);

module.exports = router;
