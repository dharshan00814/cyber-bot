const pageDashboard = {
    async load() {
        const statsContainer = document.getElementById('dashboard-stats');
        const botStatusDetails = document.getElementById('bot-status-details');
        const recentActivity = document.getElementById('recent-activity');

        if (statsContainer && !statsContainer.innerHTML.trim()) {
            statsContainer.innerHTML = '<div class="loading-spinner" style="margin:20px auto;"></div>';
        }

        try {
            const data = await api.get('/dashboard/overview');
            this.renderStats(data.stats);
            this.renderBotStatus(data.botStatus);
            this.renderRecentActivity(data.recentActivity);
        } catch (error) {
            console.error('Error loading dashboard overview:', error);
            if (statsContainer) {
                statsContainer.innerHTML = `<div class="card" style="grid-column: 1/-1; padding: 20px; color: var(--red);">Failed to load overview: ${error.message}</div>`;
            }
        }
    },

    renderStats(stats = {}) {
        const statsContainer = document.getElementById('dashboard-stats');
        if (!statsContainer) return;

        const statItems = [
            { label: 'Total Members', value: stats.totalMembers ?? 0, icon: '👥', color: 'accent' },
            { label: 'Active Members (24h)', value: stats.activeMembers ?? 0, icon: '⚡', color: 'green' },
            { label: 'Today Progress', value: stats.todayProgress ?? 0, icon: '📈', color: 'purple' },
            { label: 'Today Attendance', value: stats.todayAttendance ?? 0, icon: '📅', color: 'yellow' },
            { label: 'Total XP Points', value: app.formatNumber(stats.totalPoints ?? 0), icon: '🏆', color: 'accent' },
            { label: 'Scheduled Tasks', value: stats.scheduledTasks ?? 0, icon: '⏰', color: 'green' },
        ];

        statsContainer.innerHTML = statItems.map(item => `
            <div class="stat-card">
                <div class="stat-icon" style="background: var(--${item.color}-bg || rgba(0,212,255,0.1));">
                    <span style="font-size: 24px;">${item.icon}</span>
                </div>
                <div class="stat-info">
                    <span class="stat-label">${item.label}</span>
                    <h3 class="stat-value">${item.value}</h3>
                </div>
            </div>
        `).join('');
    },

    renderBotStatus(bot = {}) {
        const container = document.getElementById('bot-status-details');
        if (!container) return;

        const isOnline = Boolean(bot.online);
        const formatUptime = (ms) => {
            if (!ms) return 'N/A';
            const s = Math.floor(ms / 1000);
            const d = Math.floor(s / 86400);
            const h = Math.floor((s % 86400) / 3600);
            const m = Math.floor((s % 3600) / 60);
            if (d > 0) return `${d}d ${h}h ${m}m`;
            if (h > 0) return `${h}h ${m}m`;
            return `${m}m`;
        };

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-secondary); font-size: 14px;">Status</span>
                    <span class="badge ${isOnline ? 'badge-success' : 'badge-warning'}">
                        ${isOnline ? '🟢 Connected' : '🟡 Connecting / Standby'}
                    </span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-secondary); font-size: 14px;">Bot Identity</span>
                    <span style="font-weight: 600; color: var(--text-primary); font-size: 14px;">${bot.user || 'Cyber Bot'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-secondary); font-size: 14px;">Discord Guilds</span>
                    <span style="font-weight: 600; font-size: 14px;">${bot.guilds ?? 0} Server(s)</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-secondary); font-size: 14px;">Gateway Ping</span>
                    <span style="font-weight: 600; font-size: 14px; color: ${bot.ping < 200 ? 'var(--green)' : 'var(--yellow)'};">${bot.ping ?? 0} ms</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-secondary); font-size: 14px;">Uptime</span>
                    <span style="font-weight: 600; font-size: 14px;">${formatUptime(bot.uptime)}</span>
                </div>
            </div>
        `;
    },

    renderRecentActivity(activities = []) {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        if (!activities || activities.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); font-size: 14px; text-align: center; padding: 20px;">No recent activity recorded yet.</p>';
            return;
        }

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${activities.map(act => `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-tertiary); border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 16px;">${act.type === 'progress' ? '📈' : '📅'}</span>
                            <div>
                                <span style="font-weight: 600; color: var(--text-primary); font-size: 13px;">${act.user}</span>
                                <span style="color: var(--text-secondary); font-size: 13px;"> ${act.action}</span>
                            </div>
                        </div>
                        <span style="color: var(--text-muted); font-size: 12px;">${app.formatDate(act.time)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    },
};

window.pageDashboard = pageDashboard;
