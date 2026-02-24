import axios from "axios";

const API_HOST = (import.meta.env?.VITE_API_URL) || process.env.REACT_APP_API_URL || '';
const API_BASE = API_HOST ? `${API_HOST.replace(/\/$/, '')}/api` : '/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: Number(import.meta.env?.VITE_API_TIMEOUT) || Number(process.env.REACT_APP_API_TIMEOUT) || 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Use window.location as we are outside of React routing context here
      if (!window.location.pathname.includes('/login')) {
        window.location.href = "/login?msg=Session+expired";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
