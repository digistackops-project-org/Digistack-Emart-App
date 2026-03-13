// src/controllers/profileController.js
'use strict';
const { pool } = require('../config/database');
const { logger } = require('../config/logger');
const Joi = require('joi');

const profileSchema = Joi.object({
  name:          Joi.string().max(255),
  phone:         Joi.string().pattern(/^[6-9]\d{9}$/).allow('', null),
  date_of_birth: Joi.string().isoDate().allow('', null),
  gender:        Joi.string().valid('male','female','non-binary','prefer-not-to-say').allow('', null),
  bio:           Joi.string().max(1000).allow('', null),
  website:       Joi.string().uri().allow('', null),
  company:       Joi.string().max(255).allow('', null),
  job_title:     Joi.string().max(255).allow('', null),
  newsletter:    Joi.boolean(),
  notifications: Joi.boolean(),
});

const addressSchema = Joi.object({
  label:     Joi.string().max(50).default('home'),
  full_name: Joi.string().max(255).allow('', null),
  line1:     Joi.string().max(255).required(),
  line2:     Joi.string().max(255).allow('', null),
  city:      Joi.string().max(100).required(),
  state:     Joi.string().max(100).required(),
  pin_code:  Joi.string().pattern(/^[1-9][0-9]{5}$/).required(),
  country:   Joi.string().max(50).default('India'),
  phone:     Joi.string().pattern(/^[6-9]\d{9}$/).allow('', null),
  is_default:Joi.boolean().default(false),
});

// ── GET /api/v1/profile ───────────────────────────────────────
async function getProfile(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM user_profiles WHERE id = $1', [req.userId]);

    if (rows.length === 0) {
      // Auto-create profile from JWT claims on first access
      const { rows: created } = await pool.query(
        `INSERT INTO user_profiles (id, email, name)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
         RETURNING *`,
        [req.userId, req.userEmail, req.userName || 'User']);
      return res.json({ success: true, message: 'Profile created', data: created[0] });
    }

    res.json({ success: true, message: 'Profile retrieved', data: rows[0] });
  } catch (err) { next(err); }
}

// ── PUT /api/v1/profile ───────────────────────────────────────
async function updateProfile(req, res, next) {
  try {
    const { error, value } = profileSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    // Ensure profile row exists
    await pool.query(
      `INSERT INTO user_profiles (id, email, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [req.userId, req.userEmail, req.userName || 'User']);

    const fields = Object.keys(value);
    if (fields.length === 0)
      return res.status(400).json({ success: false, message: 'No fields to update' });

    const sets   = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const vals   = fields.map(f => value[f]);
    const { rows } = await pool.query(
      `UPDATE user_profiles SET ${sets}, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.userId, ...vals]);

    res.json({ success: true, message: 'Profile updated', data: rows[0] });
  } catch (err) { next(err); }
}

// ── GET /api/v1/profile/addresses ────────────────────────────
async function getAddresses(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at',
      [req.userId]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
}

// ── POST /api/v1/profile/addresses ───────────────────────────
async function addAddress(req, res, next) {
  try {
    const { error, value } = addressSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    // Ensure profile exists
    await pool.query(
      `INSERT INTO user_profiles (id, email, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [req.userId, req.userEmail, req.userName || 'User']);

    // If new address is default, unset others
    if (value.is_default) {
      await pool.query(
        'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1', [req.userId]);
    }

    const { rows } = await pool.query(
      `INSERT INTO user_addresses
         (user_id, label, full_name, line1, line2, city, state, pin_code, country, phone, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.userId, value.label, value.full_name, value.line1, value.line2,
       value.city, value.state, value.pin_code, value.country, value.phone, value.is_default]);

    res.status(201).json({ success: true, message: 'Address added', data: rows[0] });
  } catch (err) { next(err); }
}

// ── PUT /api/v1/profile/addresses/:id ────────────────────────
async function updateAddress(req, res, next) {
  try {
    const { error, value } = addressSchema.validate(req.body, { stripUnknown: true, allowUnknown: false });
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const { rows: existing } = await pool.query(
      'SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]);
    if (existing.length === 0)
      return res.status(404).json({ success: false, message: 'Address not found' });

    if (value.is_default) {
      await pool.query('UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1', [req.userId]);
    }

    const fields = Object.keys(value);
    const sets   = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
    const vals   = fields.map(f => value[f]);
    const { rows } = await pool.query(
      `UPDATE user_addresses SET ${sets}, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.userId, ...vals]);

    res.json({ success: true, message: 'Address updated', data: rows[0] });
  } catch (err) { next(err); }
}

// ── DELETE /api/v1/profile/addresses/:id ─────────────────────
async function deleteAddress(req, res, next) {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]);
    if (rowCount === 0)
      return res.status(404).json({ success: false, message: 'Address not found' });
    res.json({ success: true, message: 'Address deleted' });
  } catch (err) { next(err); }
}

module.exports = { getProfile, updateProfile, getAddresses, addAddress, updateAddress, deleteAddress };
