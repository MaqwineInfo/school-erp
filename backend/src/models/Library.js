const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  title: { type: String, required: true, trim: true },
  author: { type: String },
  isbn: { type: String },
  publisher: { type: String },
  edition: { type: String },
  category: { type: String, enum: ['fiction','reference','story','textbook','encyclopedia','magazine','journal','ebook','other'], default: 'textbook' },
  classification: { type: String }, // Dewey number
  totalCopies: { type: Number, default: 1 },
  availableCopies: { type: Number, default: 1 },
  barcode: { type: String },
  rackNo: { type: String },
  purchaseDate: { type: Date },
  purchasePrice: { type: Number },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

bookSchema.index({ tenantId: 1, title: 'text', author: 'text' });

const issueSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  memberId: { type: mongoose.Schema.Types.ObjectId, required: true },
  memberType: { type: String, enum: ['student','staff'], default: 'student' },
  issueDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date, required: true },
  returnDate: { type: Date },
  fineAmount: { type: Number, default: 0 },
  finePaid: { type: Boolean, default: false },
  status: { type: String, enum: ['issued','returned','overdue','lost'], default: 'issued' },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

issueSchema.index({ tenantId: 1, memberId: 1, status: 1 });
issueSchema.index({ tenantId: 1, status: 1, dueDate: 1 });

const Book = mongoose.model('Book', bookSchema);
const BookIssue = mongoose.model('BookIssue', issueSchema);

module.exports = { Book, BookIssue };
