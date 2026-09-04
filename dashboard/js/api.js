const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;

const api = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE}/api${endpoint}`;
        const config = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
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
        return this.post('/auth/login', { password });
    },

    async logout() {
        return this.post('/auth/logout');
    },
};

window.api = api;
