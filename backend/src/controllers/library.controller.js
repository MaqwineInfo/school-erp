const { Book, BookIssue } = require('../models/Library');
const { AppError } = require('../shared/errors');
const { sendSuccess, buildPaginationMeta } = require('../shared/response');

exports.listBooks = async (req, res) => {
  const { page = 1, limit = 20, search, category, available } = req.query;
  const filter = { tenantId: req.tenantId, deletedAt: null };
  if (category) filter.category = category;
  if (available === 'true') filter.availableCopies = { $gt: 0 };
  if (search) filter.$text = { $search: search };
  const [books, total] = await Promise.all([
    Book.find(filter).sort({ title: 1 }).skip((page-1)*limit).limit(+limit),
    Book.countDocuments(filter),
  ]);
  sendSuccess(res, books, null, 200, buildPaginationMeta(total, page, limit));
};

exports.addBook = async (req, res) => {
  const book = await Book.create({ ...req.body, tenantId: req.tenantId, branchId: req.user.branchId, availableCopies: req.body.totalCopies || 1 });
  sendSuccess(res, book, 'Book added', 201);
};

exports.updateBook = async (req, res) => {
  const book = await Book.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null }, { $set: req.body }, { new: true });
  if (!book) throw new AppError('Book not found', 404);
  sendSuccess(res, book, 'Book updated');
};

exports.removeBook = async (req, res) => {
  await Book.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, { $set: { deletedAt: new Date() } });
  sendSuccess(res, null, 'Book removed');
};

exports.issueBook = async (req, res) => {
  const { bookId, memberId, memberType, dueDate } = req.body;
  const book = await Book.findOne({ _id: bookId, tenantId: req.tenantId, deletedAt: null });
  if (!book) throw new AppError('Book not found', 404);
  if (book.availableCopies < 1) throw new AppError('No copies available', 409);

  const issue = await BookIssue.create({ tenantId: req.tenantId, bookId, memberId, memberType, dueDate: new Date(dueDate), issuedBy: req.user.userId });
  await Book.findByIdAndUpdate(bookId, { $inc: { availableCopies: -1 } });
  sendSuccess(res, issue, 'Book issued', 201);
};

exports.returnBook = async (req, res) => {
  const issue = await BookIssue.findOne({ _id: req.params.id, tenantId: req.tenantId, status: 'issued' });
  if (!issue) throw new AppError('Issue record not found', 404);

  const returnDate = new Date();
  let fine = 0;
  if (returnDate > issue.dueDate) {
    const days = Math.ceil((returnDate - issue.dueDate) / (1000 * 60 * 60 * 24));
    fine = days * 2; // ₹2 per day
  }

  issue.returnDate = returnDate;
  issue.fineAmount = fine;
  issue.status = 'returned';
  await issue.save();

  await Book.findByIdAndUpdate(issue.bookId, { $inc: { availableCopies: 1 } });
  sendSuccess(res, issue, `Book returned${fine > 0 ? `. Fine: ₹${fine}` : ''}`);
};

exports.listIssues = async (req, res) => {
  const { page = 1, limit = 20, memberId, status } = req.query;
  const filter = { tenantId: req.tenantId };
  if (memberId) filter.memberId = memberId;
  if (status) filter.status = status;
  const [issues, total] = await Promise.all([
    BookIssue.find(filter).populate('bookId', 'title author isbn').sort({ issueDate: -1 }).skip((page-1)*limit).limit(+limit),
    BookIssue.countDocuments(filter),
  ]);
  sendSuccess(res, issues, null, 200, buildPaginationMeta(total, page, limit));
};
