const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

router.get('/unread-count', protect, notificationController.getUnreadCount);
router.patch('/read-all', protect, notificationController.markAllRead);
router.get('/', protect, notificationController.getAllNotifications);
router.patch('/:id/read', protect, notificationController.markNotificationRead);
router.delete('/:id', protect, notificationController.deleteNotification);

module.exports = router;
