// ============================================================
// src/components/courses/AddCourseModal.jsx
// Modal form — creates a new course in coursedb via POST /api/v1/courses
// Fields per product spec: name, author, cost, description
// Extended: category, level, duration_hours, stock
// ============================================================
import React, { useState, useEffect, useRef } from 'react';

const CATEGORIES = [
  { value: 'programming',  label: '💻 Programming' },
  { value: 'data-science', label: '📊 Data Science' },
  { value: 'design',       label: '🎨 Design' },
  { value: 'business',     label: '💼 Business' },
  { value: 'mathematics',  label: '🔢 Mathematics' },
  { value: 'language',     label: '🌐 Language' },
  { value: 'other',        label: '📌 Other' },
];

const LEVELS = [
  { value: 'beginner',     label: '🟢 Beginner' },
  { value: 'intermediate', label: '🟡 Intermediate' },
  { value: 'advanced',     label: '🔴 Advanced' },
  { value: 'all-levels',   label: '🔵 All Levels' },
];

const EMPTY_FORM = {
  name:           '',
  author:         '',
  cost:           '',
  description:    '',
  category:       'programming',
  level:          'beginner',
  duration_hours: '',
  stock:          '0',
};

function AddCourseModal({ isOpen, onClose, onSuccess }) {
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY_FORM);
      setErrors({});
      setTimeout(() => firstInputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim())   errs.name   = 'Course name is required';
    if (!form.author.trim()) errs.author = 'Author name is required';
    if (!form.cost)          errs.cost   = 'Cost is required';
    else if (isNaN(form.cost) || parseFloat(form.cost) < 0)
      errs.cost = 'Cost must be a non-negative number';
    if (form.description && form.description.length > 3000)
      errs.description = 'Description too long (max 3000 chars)';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});
    try {
      const payload = {
        name:        form.name.trim(),
        author:      form.author.trim(),
        cost:        parseFloat(form.cost),
        description: form.description.trim() || undefined,
        category:    form.category,
        level:       form.level || undefined,
        duration_hours: form.duration_hours ? parseInt(form.duration_hours, 10) : undefined,
        stock:       parseInt(form.stock || '0', 10),
      };
      await onSuccess(payload);
      onClose();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        const fieldErrors = {};
        detail.forEach((d) => {
          const field = d.loc?.[d.loc.length - 1];
          if (field) fieldErrors[field] = d.msg;
        });
        setErrors(fieldErrors);
      } else {
        setErrors({ _global: err.response?.data?.message || 'Failed to create course. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="add-course-title">

        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title" id="add-course-title">
            🎓 Add New Course
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Global error */}
        {errors._global && (
          <div className="modal-alert modal-alert--error">{errors._global}</div>
        )}

        {/* Form */}
        <div className="modal-body">

          {/* Course Name — required */}
          <div className="form-group">
            <label className="form-label" htmlFor="course-name">
              Course Name <span className="required">*</span>
            </label>
            <input
              id="course-name"
              ref={firstInputRef}
              className={`form-input ${errors.name ? 'form-input--error' : ''}`}
              type="text"
              placeholder="e.g. Complete Python Bootcamp"
              value={form.name}
              onChange={update('name')}
              maxLength={255}
            />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          {/* Author — required */}
          <div className="form-group">
            <label className="form-label" htmlFor="course-author">
              Instructor / Author <span className="required">*</span>
            </label>
            <input
              id="course-author"
              className={`form-input ${errors.author ? 'form-input--error' : ''}`}
              type="text"
              placeholder="e.g. Jose Portilla"
              value={form.author}
              onChange={update('author')}
              maxLength={255}
            />
            {errors.author && <span className="form-error">{errors.author}</span>}
          </div>

          {/* Cost — required */}
          <div className="form-group">
            <label className="form-label" htmlFor="course-cost">
              Cost (₹) <span className="required">*</span>
            </label>
            <input
              id="course-cost"
              className={`form-input ${errors.cost ? 'form-input--error' : ''}`}
              type="number"
              placeholder="e.g. 499"
              value={form.cost}
              onChange={update('cost')}
              min="0"
              step="0.01"
            />
            {errors.cost && <span className="form-error">{errors.cost}</span>}
          </div>

          {/* Description — optional, per spec */}
          <div className="form-group">
            <label className="form-label" htmlFor="course-desc">
              Description
              <span className="form-hint">
                {form.description.length}/3000
              </span>
            </label>
            <textarea
              id="course-desc"
              className={`form-input form-textarea ${errors.description ? 'form-input--error' : ''}`}
              placeholder="What students will learn in this course..."
              value={form.description}
              onChange={update('description')}
              rows={4}
              maxLength={3000}
            />
            {errors.description && <span className="form-error">{errors.description}</span>}
          </div>

          {/* Category + Level in 2-col row */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="course-cat">Category</label>
              <select id="course-cat" className="form-input form-select" value={form.category} onChange={update('category')}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="course-level">Level</label>
              <select id="course-level" className="form-input form-select" value={form.level} onChange={update('level')}>
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration + Stock in 2-col row */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="course-duration">Duration (hours)</label>
              <input
                id="course-duration"
                className="form-input"
                type="number"
                placeholder="e.g. 22"
                value={form.duration_hours}
                onChange={update('duration_hours')}
                min="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="course-stock">Stock / Seats</label>
              <input
                id="course-stock"
                className="form-input"
                type="number"
                placeholder="e.g. 100"
                value={form.stock}
                onChange={update('stock')}
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn--secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <><span className="btn-spinner" /> Saving...</>
            ) : (
              '+ Add Course'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddCourseModal;
