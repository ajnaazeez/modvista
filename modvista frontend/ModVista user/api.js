/**
 * ModVista - API Helper
 * Handles authentication headers, token storage, and login requirement.
 */
(function () {
    const API_BASE = (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === "null" || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
        ? "http://localhost:5000/api"
        : window.location.origin + "/api";

    const AUTH_KEY = 'userInfo';

    // Helper to get raw user info object
    const getUserInfo = () => {
        try {
            const userInfo = localStorage.getItem(AUTH_KEY);
            if (userInfo) return JSON.parse(userInfo);

            const token = localStorage.getItem('token');
            if (token) return { token };

            return null;
        } catch (e) {
            return null;
        }
    };

    // Get JWT token
    const getToken = () => {
        const token = localStorage.getItem('token');
        if (token) return token;

        const userInfo = getUserInfo();
        return userInfo ? userInfo.token : null;
    };

    // Generate headers for protected requests
    const authHeaders = () => {
        const token = getToken();
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    };

    // Enforce login - usage: if (!requireLogin()) return;
    const requireLogin = (redirectTo = null) => {
        if (!getToken()) {
            const target = redirectTo || window.location.href;
            localStorage.setItem('redirectUrl', target);
            window.location.href = 'login.html';
            return false;
        }
        return true;
    };

    // Logout
    const logout = () => {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('pendingEmail');
        window.location.href = 'login.html';
    };

    // Generic Fetch Wrapper
    const apiCall = async (endpoint, options = {}) => {
        // If endpoint already starts with /api, remove it to avoid double /api/api
        const cleanEndpoint = endpoint.startsWith('/api') ? endpoint.substring(4) : endpoint;
        const url = `${API_BASE}${cleanEndpoint}`;
        const headers = authHeaders();

        const config = {
            ...options,
            headers: {
                ...headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);

            if (response.status === 401 || response.status === 403) {
                logout();
                return null;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'API Error');
            }

            return data;
        } catch (error) {
            console.error('API Call Failed:', error);
            throw error;
        }
    };

    // Export to global scope safely
    window.ModVistaAPI = {
        API_BASE,
        getToken,
        authHeaders,
        requireLogin,
        getUserInfo,
        logout,
        apiCall
    };
})();
