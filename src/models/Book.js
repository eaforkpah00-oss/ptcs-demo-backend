const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  title: { type: String, required: true },
  author: { type: String, default: null },
  isbn: { type: String, default: null },
  category: { type: String, default: 'General' }, // e.g. 'Mathematics', 'Science', 'Fiction', 'Reference'
  totalCopies: { type: Number, required: true, min: 1, default: 1 },
  availableCopies: { type: Number, required: true, min: 0 }, // maintained by the service — never set directly by controller
  coverImage: { type: String, default: null }, // Cloudinary URL
  publishedYear: { type: Number, default: null },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

bookSchema.index({ school: 1, isbn: 1 }, { sparse: true });
bookSchema.index({ school: 1, title: 'text', author: 'text' }); // enables search scoped to a school

module.exports = mongoose.model('Book', bookSchema);
