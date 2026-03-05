// ============================================================
// src/services/coursesApi.js
// Course Service HTTP client.
// Nginx proxies  /courses-api/*  →  localhost:8083 (course-service)
// URL rewrite strips /courses-api prefix before forwarding.
// ============================================================
import axios from 'axios';

const COURSES_BASE_URL =
  process.env.REACT_APP_COURSES_API_URL || '/courses-api/api/v1';

const coursesAxios = axios.create({
  baseURL: COURSES_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Attach JWT token from Login Service on every request
coursesAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('emart_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
coursesAxios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('emart_token');
      localStorage.removeItem('emart_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const coursesApi = {
  // GET /api/v1/courses?category=&search=&level=&limit=&offset=
  getAllCourses: (params = {}) => coursesAxios.get('/courses', { params }),

  // GET /api/v1/courses/:id
  getCourseById: (id) => coursesAxios.get(`/courses/${id}`),

  // POST /api/v1/courses  { name, author, cost, description, category, ... }
  createCourse: (course) => coursesAxios.post('/courses', course),

  // PUT /api/v1/courses/:id  (partial update — any subset of fields)
  updateCourse: (id, data) => coursesAxios.put(`/courses/${id}`, data),

  // DELETE /api/v1/courses/:id  (soft-delete)
  deleteCourse: (id) => coursesAxios.delete(`/courses/${id}`),
};

export default coursesApi;
