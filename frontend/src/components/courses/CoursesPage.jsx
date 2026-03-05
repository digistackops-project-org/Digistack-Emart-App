// ============================================================
// src/components/courses/CoursesPage.jsx
// Main Courses page — fetches from PostgreSQL coursedb via
// Course Service REST API (Python/FastAPI).
//
// Features:
//   • Dynamic card count = rows in courses table
//   • Search by name/author
//   • Filter by category and level
//   • "Add Course" button → AddCourseModal → POST /api/v1/courses
//   • "Add to Cart" on each card → CartContext → Cart Service
//   • Multi-select: user can add multiple courses to cart
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import CourseCard      from './CourseCard';
import AddCourseModal  from './AddCourseModal';
import { coursesApi }  from '../../services/coursesApi';
import { useCart }     from '../../context/CartContext';
import './Courses.css';

const CATEGORIES = [
  { value: '',             label: 'All Categories' },
  { value: 'programming',  label: '💻 Programming' },
  { value: 'data-science', label: '📊 Data Science' },
  { value: 'design',       label: '🎨 Design' },
  { value: 'business',     label: '💼 Business' },
  { value: 'mathematics',  label: '🔢 Mathematics' },
  { value: 'language',     label: '🌐 Language' },
  { value: 'other',        label: '📌 Other' },
];

const LEVELS = [
  { value: '',             label: 'All Levels' },
  { value: 'beginner',     label: '🟢 Beginner' },
  { value: 'intermediate', label: '🟡 Intermediate' },
  { value: 'advanced',     label: '🔴 Advanced' },
  { value: 'all-levels',   label: '🔵 All Levels' },
];

function CoursesPage() {
  const { addItem } = useCart();

  const [courses,     setCourses]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [search,      setSearch]      = useState('');
  const [category,    setCategory]    = useState('');
  const [level,       setLevel]       = useState('');
  const [showModal,   setShowModal]   = useState(false);
  const [totalCount,  setTotalCount]  = useState(0);

  // ── Fetch courses (called on load + filter change) ───────
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (search.trim())   params.search   = search.trim();
      if (category)        params.category = category;
      if (level)           params.level    = level;
      params.limit  = 200;
      params.offset = 0;

      const res = await coursesApi.getAllCourses(params);
      if (res.data?.success) {
        setCourses(res.data.data.courses || []);
        setTotalCount(res.data.data.total || 0);
      }
    } catch (err) {
      setError('Failed to load courses. Please check your connection and try again.');
      console.error('Courses fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, category, level]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // ── Add to Cart — sends course to Cart Service ────────────
  const handleAddToCart = async (course) => {
    try {
      await addItem({
        item_id:  String(course.id),
        name:     course.name,
        price:    parseFloat(course.cost),
        quantity: 1,
        source:   'courses',
        metadata: { author: course.author, category: course.category },
      });
      toast.success(`"${course.name}" added to cart!`, { autoClose: 2500 });
    } catch (err) {
      toast.error('Could not add to cart. Please try again.');
      throw err;
    }
  };

  // ── Add Course modal success ──────────────────────────────
  const handleCourseCreated = async (payload) => {
    const res = await coursesApi.createCourse(payload);
    if (res.data?.success) {
      toast.success(`"${payload.name}" added successfully!`);
      await fetchCourses();    // Refresh card grid
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="courses-page">

      {/* ── Page header ─────────────────────────────────── */}
      <div className="courses-page__header">
        <div className="courses-page__title-row">
          <div>
            <h1 className="courses-page__title">
              🎓 Courses
            </h1>
            <p className="courses-page__subtitle">
              {loading ? 'Loading...' : `${totalCount} courses available`}
            </p>
          </div>
          <button
            className="btn btn--primary btn--add-course"
            onClick={() => setShowModal(true)}
            data-testid="add-course-btn"
          >
            + Add Course
          </button>
        </div>

        {/* ── Filters row ──────────────────────────────── */}
        <div className="courses-filters">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              type="text"
              placeholder="Search by course name or instructor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="courses-search"
            />
            {search && (
              <button
                className="search-clear"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >✕</button>
            )}
          </div>

          <select
            className="filter-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            data-testid="category-filter"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            data-testid="level-filter"
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>

          {(search || category || level) && (
            <button
              className="btn btn--ghost"
              onClick={() => { setSearch(''); setCategory(''); setLevel(''); }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────── */}
      <div className="courses-page__content">

        {/* Loading skeleton */}
        {loading && (
          <div className="courses-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="course-card course-card--skeleton">
                <div className="skeleton-line skeleton-line--long" />
                <div className="skeleton-line skeleton-line--short" />
                <div className="skeleton-line skeleton-line--medium" />
                <div className="skeleton-btn" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="courses-empty courses-empty--error">
            <div className="courses-empty__icon">⚠️</div>
            <h3>Could Not Load Courses</h3>
            <p>{error}</p>
            <button className="btn btn--primary" onClick={fetchCourses}>
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && courses.length === 0 && (
          <div className="courses-empty">
            <div className="courses-empty__icon">🎓</div>
            <h3>
              {(search || category || level)
                ? 'No Courses Match Your Filters'
                : 'No Courses Yet'}
            </h3>
            <p>
              {(search || category || level)
                ? 'Try clearing filters or searching for something else.'
                : 'Be the first to add a course using the "Add Course" button above.'}
            </p>
            {(search || category || level) && (
              <button
                className="btn btn--secondary"
                onClick={() => { setSearch(''); setCategory(''); setLevel(''); }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Course card grid — one card per DB row */}
        {!loading && !error && courses.length > 0 && (
          <>
            <div className="courses-grid" data-testid="courses-grid">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
            <p className="courses-count-info">
              Showing {courses.length} of {totalCount} courses
            </p>
          </>
        )}
      </div>

      {/* Add Course Modal */}
      <AddCourseModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleCourseCreated}
      />
    </div>
  );
}

export default CoursesPage;
