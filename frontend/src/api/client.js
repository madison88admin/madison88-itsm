import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : "/api",
  timeout: 30000,
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
