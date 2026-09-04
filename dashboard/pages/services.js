const pageServices = {
    async load() {
        await this.fetchStatus();
    },

    async fetchStatus() {
        const ytBadge = document.getElementById('youtube-status');
        const sbBadge = document.getElementById('supabase-status');
        const dcBadge = document.getElementById('discord-status');
        const waBadge = document.getElementById('whatsapp-status');

        if (ytBadge) ytBadge.textContent = 'Checking...';
        if (sbBadge) sbBadge.textContent = 'Checking...';
        if (dcBadge) dcBadge.textContent = 'Checking...';
        if (waBadge) waBadge.textContent = 'Checking...';

        try {
            const data = await api.get('/dashboard/system/status');

            if (ytBadge) {
                if (data.youtube === 'configured') {
                    ytBadge.className = 'badge badge-success';
                    ytBadge.textContent = 'Configured';
                } else {
                    ytBadge.className = 'badge badge-warning';
                    ytBadge.textContent = 'Unconfigured';
                }
            }

            if (sbBadge) {
                if (data.supabase === 'connected') {
                    sbBadge.className = 'badge badge-success';
                    sbBadge.textContent = 'Connected';
                } else {
                    sbBadge.className = 'badge badge-info';
                    sbBadge.textContent = 'Local Store (Active)';
                }
            }

            if (dcBadge) {
                if (data.bot && data.bot.online) {
                    dcBadge.className = 'badge badge-success';
                    dcBadge.textContent = 'Connected (Online)';
                } else {
                    dcBadge.className = 'badge badge-warning';
                    dcBadge.textContent = 'Connecting...';
                }
            }

            if (waBadge) {
                if (data.whatsapp === 'connected') {
                    waBadge.className = 'badge badge-success';
                    waBadge.textContent = `Connected (${data.whatsappUser?.phone || 'Linked'})`;
                } else if (data.whatsapp === 'qr_ready') {
                    waBadge.className = 'badge badge-warning';
                    waBadge.textContent = 'Scan QR Code';
                } else {
                    waBadge.className = 'badge badge-danger';
                    waBadge.textContent = 'Disconnected';
                }
            }
        } catch (error) {
            console.error('Error loading service status:', error);
            if (ytBadge) ytBadge.textContent = 'Status unknown';
            if (sbBadge) sbBadge.textContent = 'Status unknown';
            if (dcBadge) dcBadge.textContent = 'Status unknown';
            if (waBadge) waBadge.textContent = 'Status unknown';
        }
    },

    async testConnection(service) {
        app.toast(`Testing connection to ${service}...`, 'info');

        try {
            const res = await api.post(`/dashboard/system/test/${service}`);
            const badgeMap = {
                youtube: document.getElementById('youtube-status'),
                supabase: document.getElementById('supabase-status'),
                discord: document.getElementById('discord-status'),
                whatsapp: document.getElementById('whatsapp-status'),
            };

            const badge = badgeMap[service];
            if (badge) {
                if (res.status === 'connected') {
                    badge.className = 'badge badge-success';
                    badge.textContent = 'Connected';
                } else if (res.status === 'fallback') {
                    badge.className = 'badge badge-info';
                    badge.textContent = 'Local Store (Active)';
                } else if (res.status === 'qr_ready') {
                    badge.className = 'badge badge-warning';
                    badge.textContent = 'Scan QR Code';
                } else {
                    badge.className = 'badge badge-warning';
                    badge.textContent = res.status;
                }
            }

            app.toast(res.message || `${service} test completed: ${res.status}`, res.status === 'connected' ? 'success' : 'info');
        } catch (error) {
            console.error(`Error testing ${service}:`, error);
            app.toast(`Failed testing ${service}: ${error.message}`, 'error');
        }
    },

};

window.pageServices = pageServices;
