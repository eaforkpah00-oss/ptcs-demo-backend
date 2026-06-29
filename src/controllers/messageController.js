const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Message = require('../models/Message');
const User = require('../models/User');

exports.getInbox = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const filter = { recipient: req.user._id, deletedByRecipient: false };
  const [messages, total] = await Promise.all([
    Message.find(filter).populate('sender', 'firstName lastName profilePhoto').sort('-createdAt').skip(skip).limit(limit),
    Message.countDocuments(filter),
  ]);
  res.status(200).json({ status: 'success', results: messages.length, total, data: messages });
});

exports.getSentMessages = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const filter = { sender: req.user._id, deletedBySender: false };
  const [messages, total] = await Promise.all([
    Message.find(filter).populate('recipient', 'firstName lastName profilePhoto').sort('-createdAt').skip(skip).limit(limit),
    Message.countDocuments(filter),
  ]);
  res.status(200).json({ status: 'success', results: messages.length, total, data: messages });
});

exports.sendMessage = catchAsync(async (req, res) => {
  const schoolId = req.user.school?._id || req.user.school || req.body.school;
  const message = await Message.create({ ...req.body, sender: req.user._id, school: schoolId });
  res.status(201).json({ status: 'success', data: { message } });
});

exports.getMessageById = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.id)
    .populate('sender', 'firstName lastName').populate('recipient', 'firstName lastName');
  if (!message) return next(new AppError('Message not found.', 404));
  const userId = req.user._id.toString();
  if (message.sender._id.toString() !== userId && message.recipient._id.toString() !== userId) {
    return next(new AppError('You do not have access to this message.', 403));
  }
  res.status(200).json({ status: 'success', data: { message } });
});

exports.markMessageRead = catchAsync(async (req, res, next) => {
  const message = await Message.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
  if (!message) return next(new AppError('Message not found.', 404));
  res.status(200).json({ status: 'success', data: { message } });
});

exports.replyToMessage = catchAsync(async (req, res, next) => {
  const original = await Message.findById(req.params.id);
  if (!original) return next(new AppError('Message not found.', 404));
  const schoolId = req.user.school?._id || req.user.school;
  const reply = await Message.create({
    sender: req.user._id,
    recipient: original.sender,
    school: schoolId,
    subject: `Re: ${original.subject}`,
    content: req.body.content,
    parentId: original._id,
  });
  res.status(201).json({ status: 'success', data: { message: reply } });
});

exports.deleteMessage = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.id);
  if (!message) return next(new AppError('Message not found.', 404));
  const userId = req.user._id.toString();
  if (message.sender._id.toString() === userId) {
    message.deletedBySender = true;
  } else if (message.recipient._id.toString() === userId) {
    message.deletedByRecipient = true;
  } else {
    return next(new AppError('You do not have access to this message.', 403));
  }
  await message.save();
  res.status(200).json({ status: 'success', message: 'Message deleted.' });
});

exports.getConversation = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const otherId = req.params.userId;
  const messages = await Message.find({
    $or: [
      { sender: userId, recipient: otherId, deletedBySender: false },
      { sender: otherId, recipient: userId, deletedByRecipient: false },
    ],
  }).populate('sender', 'firstName lastName').populate('recipient', 'firstName lastName').sort('createdAt');
  res.status(200).json({ status: 'success', results: messages.length, data: messages });
});

exports.getContacts = catchAsync(async (req, res) => {
  const schoolId = req.user.school?._id || req.user.school;
  const schoolFilter = schoolId ? { school: schoolId } : {};
  const users = await User.find({ ...schoolFilter, isActive: true, _id: { $ne: req.user._id } })
    .select('firstName lastName email role profilePhoto');
  res.status(200).json({ status: 'success', results: users.length, data: users });
});
