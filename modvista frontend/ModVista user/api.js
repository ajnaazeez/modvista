/**
 * ModVista - API Helper
 * Handles authentication headers, token storage, and login requirement.
 */
(function () {
    const getBaseUrl = () => {
        const localHosts = ['localhost', '127.0.0.1', ''];
        const hostname = window.location.hostname;

        if (localHosts.includes(hostname) || window.location.protocol === 'file:') {
            return "http://localhost:5000/api";
        }

        // Use the current origin (protocol + host) to ensure HTTPS consistency
        return `${window.location.origin}/api`;
    };

    const API_BASE = getBaseUrl();

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

    // Unified Image Resolver
    const resolveImg = (src) => {
        if (!src) return 'assets/default-product.png';
        if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:')) return src;

        const host = API_BASE.replace('/api', '');
        const cleanPath = src.startsWith('/') ? src.substring(1) : src;

        if (src.startsWith('uploads/') || src.startsWith('assets/')) {
            return src.startsWith('uploads/') ? `${host}/${cleanPath}` : src;
        }

        return `assets/${cleanPath}`;
    };

    // Export to global scope safely
    window.ModVistaAPI = {
        API_BASE,
        getToken,
        authHeaders,
        requireLogin,
        getUserInfo,
        logout,
        apiCall,
        resolveImg
    };
})();
