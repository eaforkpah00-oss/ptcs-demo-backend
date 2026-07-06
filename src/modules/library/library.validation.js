const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const addBook = z.object({
  title: z.string().min(1),
  author: z.string().optional().nullable(),
  isbn: z.string().optional().nullable(),
  category: z.string().optional(),
  totalCopies: z.number().int().positive(),
  publishedYear: z.number().int().optional().nullable(),
});

const updateBook = z.object({
  title: z.string().min(1).optional(),
  author: z.string().optional().nullable(),
  isbn: z.string().optional().nullable(),
  category: z.string().optional(),
  totalCopies: z.number().int().positive().optional(),
  publishedYear: z.number().int().optional().nullable(),
});

const borrowBook = z.object({
  book: objectId,
  student: objectId,
});

const returnBook = z.object({
  finePaid: z.boolean().optional(),
});

const searchBooks = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

module.exports = {
  addBook,
  updateBook,
  borrowBook,
  returnBook,
  searchBooks,
};
