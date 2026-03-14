// src/services/profileApi.js
import axios from 'axios';
const BASE = process.env.REACT_APP_PROFILE_API_URL || '/profile-api/api/v1';
const c = axios.create({ baseURL: BASE });
c.interceptors.request.use(cfg => { const t = localStorage.getItem('token'); if(t) cfg.headers['Authorization']=`Bearer ${t}`; return cfg; });
c.interceptors.response.use(r=>r, err => { if(err.response?.status===401){localStorage.removeItem('token');window.location.href='/login';} return Promise.reject(err); });
const profileApi = {
  getProfile:    ()        => c.get('/profile'),
  updateProfile: (data)   => c.put('/profile', data),
  getAddresses:  ()        => c.get('/profile/addresses'),
  addAddress:    (data)   => c.post('/profile/addresses', data),
  updateAddress: (id, d)  => c.put(`/profile/addresses/${id}`, d),
  deleteAddress: (id)     => c.delete(`/profile/addresses/${id}`),
};
export default profileApi;
