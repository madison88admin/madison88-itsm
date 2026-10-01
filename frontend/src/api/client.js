import axios from "axios";
import { clearAuthToken, getAuthToken } from "./session";

// This project builds with Create React App. Use the Netlify /api proxy in
// production by leaving REACT_APP_API_URL empty; direct HTTP IPs must not be
// used from an HTTPS deployment.
const API_HOST = process.env.REACT_APP_API_URL || '';
const API_BASE = API_HOST ? `${API_HOST.replace(/\/$/, '')}/api` : '/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: Number(process.env.REACT_APP_API_TIMEOUT) || 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
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

// Log resolved API base during local development so missing CRA configuration is visible.
if (process.env.NODE_ENV !== 'production') {
  console.info('[apiClient] API_BASE resolved to:', API_BASE);
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.message = error.code === "ECONNABORTED"
        ? "The request timed out. Please try again."
        : "Unable to reach the ITSM service. Check your connection and try again.";
    }
    if (error.response?.status === 401) {
      clearAuthToken();
      // Use window.location as we are outside of React routing context here
      if (!window.location.pathname.includes('/login')) {
        window.location.href = "/login?msg=Session+expired";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
