import axios from 'axios';

// This sets a default base URL if your Laravel app is served from, say, /
// If using a subfolder or domain, adjust accordingly.
const axiosInstance = axios.create({
  baseURL: '/',
  withCredentials: true, // If your app needs to send cookies (e.g. for CSRF)
});

// Optionally add interceptors for auth tokens, etc.
axiosInstance.interceptors.request.use(
  (config) => {
    // e.g. attach a JWT or X-CSRF-Token if needed
    // config.headers['X-CSRF-TOKEN'] = window.csrfToken || '';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
