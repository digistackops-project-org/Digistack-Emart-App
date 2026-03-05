// ============================================================
// src/components/courses/CourseCard.jsx
//
// Card layout (from product spec):
//   50% — Course Name    (courses.name  from coursedb)
//   20% — Author Name    (courses.author from coursedb)
//   20% — Cost (₹)       (courses.cost  from coursedb)
//   10% — "Add to Cart"  (button → CartContext.addItem)
// ============================================================
import React, { useState } from 'react';

const LEVEL_BADGE = {
  beginner:     { label: 'Beginner',     color: '#10B981', bg: '#D1FAE5' },
  intermediate: { label: 'Intermediate', color: '#F59E0B', bg: '#FEF3C7' },
  advanced:     { label: 'Advanced',     color: '#EF4444', bg: '#FEE2E2' },
  'all-levels': { label: 'All Levels',   color: '#6366F1', bg: '#EDE9FE' },
};

const CATEGORY_ICONS = {
  programming:   '💻',
  'data-science':'📊',
  design:        '🎨',
  business:      '💼',
  mathematics:   '🔢',
  language:      '🌐',
  other:         '📌',
};

function CourseCard({ course, onAddToCart }) {
  const [adding, setAdding] = useState(false);
  const [added,  setAdded]  = useState(false);

  const levelInfo = LEVEL_BADGE[course.level] || null;
  const catIcon   = CATEGORY_ICONS[course.category] || '📌';

  const formatPrice = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(val);

  const handleAddToCart = async () => {
    if (adding || added) return;
    setAdding(true);
    try {
      await onAddToCart(course);
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="course-card" data-testid={`course-card-${course.id}`}>
      {/* ── Category + Level badges (top-left corner) ── */}
      <div className="course-card__badges">
        <span className="course-cat-badge">
          {catIcon} {course.category}
        </span>
        {levelInfo && (
          <span
            className="course-level-badge"
            style={{ color: levelInfo.color, background: levelInfo.bg }}
          >
            {levelInfo.label}
          </span>
        )}
      </div>

      {/* ── Card body: 50 / 20 / 20 / 10 layout ─────── */}
      <div className="course-card__body">

        {/* 50% — Course Name */}
        <div className="course-card__name-zone">
          <h3
            className="course-card__name"
            title={course.name}
            data-testid="course-name"
          >
            {course.name}
          </h3>
          {course.duration_hours && (
            <span className="course-duration">
              ⏱ {course.duration_hours}h
            </span>
          )}
        </div>

        {/* 20% — Author */}
        <div className="course-card__author-zone">
          <div className="course-author-avatar">
            {course.author.charAt(0).toUpperCase()}
          </div>
          <span
            className="course-card__author"
            title={course.author}
            data-testid="course-author"
          >
            {course.author}
          </span>
        </div>

        {/* 20% — Cost */}
        <div className="course-card__cost-zone">
          <span className="course-card__cost" data-testid="course-cost">
            {formatPrice(course.cost)}
          </span>
          {course.stock > 0 && course.stock <= 20 && (
            <span className="course-stock-warning">
              {course.stock} left
            </span>
          )}
        </div>

        {/* 10% — Add to Cart */}
        <div className="course-card__action-zone">
          <button
            className={`course-add-btn ${added ? 'course-add-btn--added' : ''}`}
            onClick={handleAddToCart}
            disabled={adding || course.stock === 0}
            data-testid={`add-to-cart-${course.id}`}
            title={course.stock === 0 ? 'Out of stock' : 'Add to Cart'}
          >
            {course.stock === 0 ? (
              '✕ Sold Out'
            ) : added ? (
              '✓ Added!'
            ) : adding ? (
              <span className="course-btn-spinner" />
            ) : (
              '🛒 Add to Cart'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CourseCard;
