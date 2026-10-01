let authToken = null;

export const setAuthToken = (token) => {
  authToken = token || null;
};

export const getAuthToken = () => authToken;

export const clearAuthToken = () => {
  authToken = null;
};
