const app = {
    currentPage: 'dashboard',
    isSidebarOpen: false,
    pollInterval: null,

    async init() {
        this.bindNavigation();
        this.bindSidebar();
        this.bindModals();
        this.bindLogout();
        this.startStatusPolling();
        this.navigateTo(this.currentPage);
    },

    async handleLogin() {
        const loginScreen = document.getElementById('login-screen');
        const dashboardScreen = document.getElementById('dashboard-screen');
        const loginForm = document.getElementById('login-form');
        const loginError = document.getElementById('login-error');

        if (!loginScreen || !dashboardScreen) return;

        try {
            const authenticated = await api.checkAuth();
            if (authenticated) {
                loginScreen.style.display = 'none';
                dashboardScreen.style.display = 'block';
                await this.init();
                return;
            }
        } catch (e) {
            console.warn('Auth check error:', e);
        }

        loginScreen.style.display = 'flex';
        dashboardScreen.style.display = 'none';

        if (loginForm && !loginForm.dataset.bound) {
            loginForm.dataset.bound = 'true';
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const passwordInput = document.getElementById('login-password');
                const password = passwordInput ? passwordInput.value : '';
                const submitBtn = loginForm.querySelector('button[type="submit"]');

                if (loginError) loginError.classList.remove('visible');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Signing in...';
                }

                try {
                    await api.login(password);
                    loginScreen.style.display = 'none';
                    dashboardScreen.style.display = 'block';
                    await this.init();
                } catch (error) {
                    if (loginError) {
                        loginError.textContent = error.message || 'Invalid password or server error';
                        loginError.classList.add('visible');
                    }
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Sign In';
                    }
                }
            });
        }
    },

    bindLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn && !logoutBtn.dataset.bound) {
            logoutBtn.dataset.bound = 'true';
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await api.logout();
                } catch (err) {
                    console.error('Logout error:', err);
                }
                if (this.pollInterval) clearInterval(this.pollInterval);
                const loginScreen = document.getElementById('login-screen');
                const dashboardScreen = document.getElementById('dashboard-screen');
                if (dashboardScreen) dashboardScreen.style.display = 'none';
                if (loginScreen) loginScreen.style.display = 'flex';
                const passwordInput = document.getElementById('login-password');
                if (passwordInput) passwordInput.value = '';
            });
        }
    },

    bindNavigation() {
        document.querySelectorAll('[data-page]').forEach(link => {
            if (link.dataset.navBound) return;
            link.dataset.navBound = 'true';
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigateTo(page);
            });
        });
    },

    navigateTo(page) {
        this.currentPage = page;

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.toggle('active', section.id === `page-${page}`);
        });

        const activeNavItem = document.querySelector(`[data-page="${page}"] .nav-label`);
        const titleEl = document.querySelector('.page-title');
        if (activeNavItem && titleEl) {
            titleEl.textContent = activeNavItem.textContent;
        }

        if (this.isSidebarOpen) {
            this.closeSidebar();
        }

        const pageModules = {
            dashboard: window.pageDashboard,
            members: window.pageMembers,
            progress: window.pageProgress,
            attendance: window.pageAttendance,
            leaderboard: window.pageLeaderboard,
            announcements: window.pageAnnouncements,
            scheduler: window.pageScheduler,
            channels: window.pageChannels,
            whatsapp: window.pageWhatsApp,
            services: window.pageServices,
            settings: window.pageSettings,
        };

        const currentMod = pageModules[page];
        if (currentMod && typeof currentMod.load === 'function') {
            currentMod.load();
        }
    },

    bindSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        const toggle = document.querySelector('.menu-toggle');

        if (toggle && !toggle.dataset.bound) {
            toggle.dataset.bound = 'true';
            toggle.addEventListener('click', () => {
                this.isSidebarOpen ? this.closeSidebar() : this.openSidebar();
            });
        }

        if (overlay && !overlay.dataset.bound) {
            overlay.dataset.bound = 'true';
            overlay.addEventListener('click', () => this.closeSidebar());
        }
    },

    openSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (sidebar) sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
        this.isSidebarOpen = true;
    },

    closeSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        this.isSidebarOpen = false;
    },

    bindModals() {
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            if (overlay.dataset.modalBound) return;
            overlay.dataset.modalBound = 'true';

            const closeBtn = overlay.querySelector('.modal-close');
            const cancelBtn = overlay.querySelector('[data-dismiss="modal"]');
            const close = () => overlay.classList.remove('active');

            if (closeBtn) closeBtn.addEventListener('click', close);
            if (cancelBtn) cancelBtn.addEventListener('click', close);

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close();
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
            }
        });
    },

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    },

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    },

    toast(message, type = 'info') {
        const container = document.querySelector('.toast-container') || document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    },

    showLoading(element) {
        if (!element) return;
        element.innerHTML = '<div class="loading-spinner"></div>';
    },

    formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return String(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    },

    formatNumber(num) {
        if (num === null || num === undefined) return '0';
        return Number(num).toLocaleString();
    },

    async updateBotStatus() {
        try {
            const data = await api.get('/dashboard/system/status');
            const dot = document.getElementById('status-dot');
            const text = document.getElementById('status-text');
            if (dot && text) {
                if (data.bot && data.bot.online) {
                    dot.style.background = 'var(--green)';
                    text.textContent = `Online (${data.bot.ping ?? 0}ms)`;
                } else {
                    dot.style.background = 'var(--yellow)';
                    text.textContent = 'Connecting...';
                }
            }
        } catch (e) {
            const dot = document.getElementById('status-dot');
            const text = document.getElementById('status-text');
            if (dot) dot.style.background = 'var(--red)';
            if (text) text.textContent = 'Offline';
        }
    },

    startStatusPolling() {
        this.updateBotStatus();
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.pollInterval = setInterval(() => this.updateBotStatus(), 12000);
    },
};

window.app = app;

document.addEventListener('DOMContentLoaded', () => {
    app.handleLogin();
});
