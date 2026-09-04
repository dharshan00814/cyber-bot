const pageLeaderboard = {
    period: 'all',

    async load(period) {
        if (period) this.period = period;
        this.bindEvents();
        await this.fetchLeaderboard();
    },

    bindEvents() {
        const tabs = document.querySelectorAll('#leaderboard-tabs .tab');
        tabs.forEach(tab => {
            if (tab.dataset.bound) return;
            tab.dataset.bound = 'true';
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.period = tab.dataset.period || 'all';
                this.fetchLeaderboard();
            });
        });
    },

    async fetchLeaderboard() {
        const tbody = document.getElementById('leaderboard-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;"><div class="loading-spinner" style="margin:0 auto;"></div></td></tr>';
        }

        try {
            const data = await api.get(`/dashboard/leaderboard?period=${this.period}`);
            this.renderTable(data.leaderboard || []);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--red);padding:20px;">Failed to load leaderboard: ${error.message}</td></tr>`;
            }
        }
    },

    renderTable(leaderboard = []) {
        const tbody = document.getElementById('leaderboard-tbody');
        if (!tbody) return;

        if (leaderboard.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px;">No members ranked for this time period yet.</td></tr>';
            return;
        }

        const medals = ['🥇', '🥈', '🥉'];

        tbody.innerHTML = leaderboard.map((item, index) => {
            const rankBadge = index < 3
                ? `<span style="font-size: 20px;">${medals[index]}</span>`
                : `<span style="font-weight: 700; color: var(--text-muted); font-size: 14px;">#${index + 1}</span>`;

            return `
                <tr>
                    <td style="width: 70px; text-align: center;">${rankBadge}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--purple)); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff;">
                                ${(item.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style="font-weight: 600; color: var(--text-primary); font-size: 14px;">${item.name || item.userId}</div>
                                <span class="badge badge-info" style="font-size: 10px;">${item.role || 'beginner'}</span>
                            </div>
                        </div>
                    </td>
                    <td style="font-weight: 700; color: var(--accent); font-size: 15px;">${app.formatNumber(item.xp)} XP</td>
                    <td style="color: var(--text-secondary); font-size: 13px;">${item.activityScore ?? 0} pts</td>
                    <td>
                        <span class="badge ${item.streak > 0 ? 'badge-success' : 'badge-warning'}">
                            ${item.streak > 0 ? `🔥 ${item.streak} day streak` : '0 days'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    },
};

window.pageLeaderboard = pageLeaderboard;
