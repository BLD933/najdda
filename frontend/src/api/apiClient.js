import axios from 'axios';
import { readStore, removeStore } from '../utils/storage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = readStore('najdda_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    // A 401 on the login call itself must not bounce: the user is already on
    // /login and a redirect would wipe the form they are filling in.
    const isLoginCall = /\/auth\/(login|register)$/.test(error.config?.url || '');
    if (status === 401 && !isLoginCall) {
      removeStore('najdda_token');
      // AuthContext owns `user`; clearing localStorage alone leaves it truthy,
      // so the guard would still render the protected page. The event lets the
      // provider drop its state and ProtectedRoute redirect on its own — no
      // forced reload, which would discard in-flight chat and wizard progress
      // and 404 on static hosts without a rewrite rule.
      window.dispatchEvent(new CustomEvent('najdda:session-expired'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
