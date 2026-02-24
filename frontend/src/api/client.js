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
  // Helpful runtime debug: show final request URL in console when debugging
  if (process.env.NODE_ENV !== 'production') {
    try {
      const url = new URL(config.url, config.baseURL || window.location.origin);
      console.debug('[apiClient] request ->', config.method?.toUpperCase(), url.toString());
    } catch (e) {
      // ignore
    }
  }
  return config;
});

// Log resolved API base to aid debugging when deployments forget to set VITE_API_URL
if (process.env.NODE_ENV !== 'production') {
  console.info('[apiClient] API_BASE resolved to:', API_BASE);
}

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
