import axios from 'axios';

// Get API base URL with fallback and format cleanup
const getBaseUrl = () => {
    let url = import.meta.env.VITE_API_URL;
    if (!url) {
        url = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:5005/api'
            : '/api';
    }
    // Clean trailing slashes
    url = url.trim().replace(/\/+$/, '');
    // Ensure /api suffix exists
    if (!url.endsWith('/api')) {
        url += '/api';
    }
    return url;
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach JWT token to every request
api.interceptors.request.use(
    (config) => {
        let token = localStorage.getItem('token');
        if (!token) {
            try {
                const persisted = JSON.parse(localStorage.getItem('auth-storage') || '{}');
                token = persisted?.state?.token;
                if (token) {
                    localStorage.setItem('token', token);
                }
            } catch (e) {
                // ignore
            }
        }
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle 401 (token expired/invalid) globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Import dynamically to avoid circular dependency
            import('../store/authStore').then((module) => {
                const { useAuthStore } = module;
                useAuthStore.getState().logout();
                window.location.href = '/login';
            });
        }
        return Promise.reject(error);
    }
);

export default api;
