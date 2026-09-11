const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;

const api = {
    getToken() {
        try {
            return localStorage.getItem('cyberbot_admin_token');
        } catch {
            return null;
        }
    },

    setToken(token) {
        try {
            if (token) {
                localStorage.setItem('cyberbot_admin_token', token);
            } else {
                localStorage.removeItem('cyberbot_admin_token');
            }
        } catch (e) {
            console.warn('LocalStorage error:', e);
        }
    },

    async request(endpoint, options = {}) {
        const url = `${API_BASE}/api${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            headers['x-admin-token'] = token;
        }

        const config = {
            credentials: 'include',
            headers,
            ...options,
        };

        if (!config.body || typeof config.body !== 'string') {
            delete config.headers['Content-Type'];
        }

        try {
            const response = await fetch(url, config);
            const contentType = response.headers.get('content-type') || '';
            let data;

            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                data = { error: text || `HTTP ${response.status}` };
            }

            if (!response.ok) {
                // If unauthorized on a protected endpoint, clear invalid token and switch to login
                if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/check')) {
                    this.setToken(null);
                    if (typeof app !== 'undefined' && typeof app.showLogin === 'function') {
                        app.showLogin();
                    }
                }
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API Error [${options.method || 'GET'} ${endpoint}]:`, error);
            throw error;
        }
    },

    get(endpoint) {
        return this.request(endpoint);
    },

    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    },

    put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    },

    delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE',
        });
    },

    async checkAuth() {
        try {
            const response = await this.get('/auth/check');
            return Boolean(response && response.authenticated);
        } catch {
            return false;
        }
    },

    async login(password) {
        const response = await this.post('/auth/login', { password });
        if (response && response.token) {
            this.setToken(response.token);
        }
        return response;
    },

    async logout() {
        try {
            await this.post('/auth/logout');
        } catch (e) {
            console.warn('Logout API notice:', e);
        } finally {
            this.setToken(null);
        }
    },
};

window.api = api;
