'use strict';

const db = require('../config/database');

const BookModel = {

  /**
   * Return all books with optional filters.
   * Returns { books: [...], total: N }
   */
  async findAll({ category, search, limit = 100, offset = 0 } = {}) {
    const conditions = [];
    const params     = [];
    let   idx        = 1;

    if (category) {
      conditions.push(`LOWER(category) = LOWER($${idx++})`);
      params.push(category);
    }
    if (search) {
      conditions.push(`(LOWER(name) ILIKE $${idx} OR LOWER(author) ILIKE $${idx})`);
      params.push(`%${search.toLowerCase()}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countResult = await db.query(
      `SELECT COUNT(*) AS total FROM books ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Data query
    const dataResult = await db.query(
      `SELECT id, name, author, cost, description, category, stock, created_at, updated_at
       FROM books ${where}
       ORDER BY name ASC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    return { books: dataResult.rows, total };
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT id, name, author, cost, description, category, stock, created_at, updated_at
       FROM books WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async create({ name, author, cost, description, category = 'general', stock = 0 }) {
    const { rows } = await db.query(
      `INSERT INTO books (name, author, cost, description, category, stock)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, author, cost, description, category, stock, created_at, updated_at`,
      [name, author, cost, description || null, category, stock]
    );
    return rows[0];
  },

  async update(id, { name, author, cost, description, category, stock }) {
    const { rows } = await db.query(
      `UPDATE books
       SET name        = COALESCE($1, name),
           author      = COALESCE($2, author),
           cost        = COALESCE($3, cost),
           description = COALESCE($4, description),
           category    = COALESCE($5, category),
           stock       = COALESCE($6, stock),
           updated_at  = NOW()
       WHERE id = $7
       RETURNING id, name, author, cost, description, category, stock, created_at, updated_at`,
      [name, author, cost, description, category, stock, id]
    );
    return rows[0] || null;
  },

  async delete(id) {
    const { rows } = await db.query(
      `DELETE FROM books WHERE id = $1 RETURNING id, name`,
      [id]
    );
    return rows[0] || null;
  },

  async count() {
    const { rows } = await db.query('SELECT COUNT(*) AS total FROM books');
    return parseInt(rows[0].total, 10);
  },
};

module.exports = BookModel;
