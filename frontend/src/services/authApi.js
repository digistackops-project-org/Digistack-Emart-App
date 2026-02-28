// ============================================================
// authApi.js  –  Login Service HTTP client
// Nginx proxies  /api/*  →  localhost:8080  (login-service)
// Spring Boot context-path is /  so full path: /api/v1/auth/*
// ============================================================
import axios from 'axios';

const AUTH_BASE_URL = process.env.REACT_APP_AUTH_API_URL || '/api/v1';

const authAxios = axios.create({
  baseURL: AUTH_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Attach JWT token
authAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('emart_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-logout on 401
authAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('emart_token');
      localStorage.removeItem('emart_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Named export: authApi
// Login.jsx  imports { authApi } from '../../services/authApi'
// Signup.jsx imports { authApi } from '../../services/authApi'
export const authApi = {
  signup: (data) => authAxios.post('/auth/signup', data),
  login:  (data) => authAxios.post('/auth/login',  data),
  logout: ()     => authAxios.post('/auth/logout'),
};

export default authAxios;
