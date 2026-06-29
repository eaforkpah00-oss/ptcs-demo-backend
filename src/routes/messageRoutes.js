const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const messageController = require('../controllers/messageController');

router.get('/inbox', protect, messageController.getInbox);
router.get('/sent', protect, messageController.getSentMessages);
router.get('/contacts', protect, messageController.getContacts);
router.get('/conversation/:userId', protect, messageController.getConversation);
router.post('/', protect, messageController.sendMessage);
router.get('/:id', protect, messageController.getMessageById);
router.patch('/:id/read', protect, messageController.markMessageRead);
router.post('/:id/reply', protect, messageController.replyToMessage);
router.delete('/:id', protect, messageController.deleteMessage);

module.exports = router;
