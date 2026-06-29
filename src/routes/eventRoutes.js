const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const eventController = require('../controllers/eventController');

router.get('/upcoming', protect, eventController.getUpcomingEvents);
router.get('/', protect, eventController.getAllEvents);
router.post('/', protect, restrictTo('school_admin', 'super_admin'), eventController.createEvent);
router.get('/:id', protect, eventController.getEventById);
router.patch('/:id', protect, restrictTo('school_admin', 'super_admin'), eventController.updateEvent);
router.delete('/:id', protect, restrictTo('school_admin', 'super_admin'), eventController.deleteEvent);

module.exports = router;
