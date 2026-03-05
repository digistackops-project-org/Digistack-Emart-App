'use strict';
/**
 * Unit tests — Book Model
 * Mocks the db module — no real PostgreSQL needed.
 */

jest.mock('../../src/config/database');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

const db        = require('../../src/config/database');
const BookModel = require('../../src/models/book');

describe('BookModel — findAll', () => {
  it('returns rows from the books table', async () => {
    const rows = [{ id: 1, title: 'Test', author: 'A', cost: '100.00' }];
    db.query.mockResolvedValue({ rows });
    const result = await BookModel.findAll();
    expect(result).toEqual(rows);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), undefined);
  });
});

describe('BookModel — findById', () => {
  it('returns the book when found', async () => {
    const row = { id: 1, title: 'Clean Code', author: 'Bob', cost: '799.00' };
    db.query.mockResolvedValue({ rows: [row] });
    const result = await BookModel.findById(1);
    expect(result).toEqual(row);
  });

  it('returns null when not found', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const result = await BookModel.findById(999);
    expect(result).toBeNull();
  });
});

describe('BookModel — create', () => {
  it('inserts and returns the new row', async () => {
    const inserted = { id: 5, title: 'New Book', author: 'Alice', cost: '500.00', description: null };
    db.query.mockResolvedValue({ rows: [inserted] });

    const result = await BookModel.create({ title: 'New Book', author: 'Alice', cost: 500 });
    expect(result).toEqual(inserted);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO books'),
      ['New Book', 'Alice', 500, undefined]
    );
  });
});

describe('BookModel — update', () => {
  it('returns updated row on success', async () => {
    const updated = { id: 1, title: 'Updated Title', author: 'Bob', cost: '799.00' };
    db.query.mockResolvedValue({ rows: [updated] });
    const result = await BookModel.update(1, { title: 'Updated Title' });
    expect(result).toEqual(updated);
  });

  it('returns null when book not found', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const result = await BookModel.update(999, { title: 'Ghost' });
    expect(result).toBeNull();
  });
});

describe('BookModel — delete', () => {
  it('returns deleted row when found', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1, title: 'Clean Code' }] });
    const result = await BookModel.delete(1);
    expect(result).toEqual({ id: 1, title: 'Clean Code' });
  });

  it('returns null when book not found', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const result = await BookModel.delete(999);
    expect(result).toBeNull();
  });
});

describe('BookModel — count', () => {
  it('returns integer count', async () => {
    db.query.mockResolvedValue({ rows: [{ total: '42' }] });
    const count = await BookModel.count();
    expect(count).toBe(42);
    expect(typeof count).toBe('number');
  });
});
