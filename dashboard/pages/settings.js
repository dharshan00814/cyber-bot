const pageSettings = {
    currentSection: 'bot',
    settings: {},

    async load(section) {
        if (section) this.currentSection = section;
        this.bindEvents();
        await this.fetchSettings();
    },

    bindEvents() {
        const tabs = document.querySelectorAll('#settings-tabs .tab');
        tabs.forEach(tab => {
            if (tab.dataset.bound) return;
            tab.dataset.bound = 'true';
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentSection = tab.dataset.section || 'bot';
                this.renderSection();
            });
        });
    },

    async fetchSettings() {
        const container = document.getElementById('settings-content');
        if (container) {
            container.innerHTML = '<div class="loading-spinner" style="margin:40px auto;"></div>';
        }

        try {
            const data = await api.get('/dashboard/settings');
            this.settings = data.settings || {};
            this.renderSection();
        } catch (error) {
            console.error('Error fetching settings:', error);
            if (container) {
                container.innerHTML = `<p style="color:var(--red);padding:20px;">Failed to load settings: ${error.message}</p>`;
            }
        }
    },

    renderSection() {
        const container = document.getElementById('settings-content');
        if (!container) return;

        const s = this.settings;

        const sections = {
            bot: `
                <form id="settings-form-bot" onsubmit="event.preventDefault(); pageSettings.saveSection('bot');">
                    <h4 style="margin-bottom: 16px; color: var(--text-primary);">Bot Configuration</h4>
                    <div class="form-group">
                        <label class="form-label">Command Prefix</label>
                        <input type="text" class="form-input" id="set-bot-prefix" value="${s.bot_prefix || '!'}" placeholder="!">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Bot Activity Status Text</label>
                        <input type="text" class="form-input" id="set-bot-activity" value="${s.bot_activity || 'tracking student progress'}" placeholder="tracking student progress">
                    </div>
                    <button type="submit" class="btn btn-primary">Save Bot Settings</button>
                </form>
            `,
            progress: `
                <form id="settings-form-progress" onsubmit="event.preventDefault(); pageSettings.saveSection('progress');">
                    <h4 style="margin-bottom: 16px; color: var(--text-primary);">Progress & XP Configuration</h4>
                    <div class="form-group">
                        <label class="form-label">Default XP for Progress Submission</label>
                        <input type="number" class="form-input" id="set-progress-xp" value="${s.daily_xp_reward || 10}" min="1" max="100">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Daily Streak Bonus (XP)</label>
                        <input type="number" class="form-input" id="set-streak-bonus" value="${s.streak_bonus || 5}" min="0" max="50">
                    </div>
                    <button type="submit" class="btn btn-primary">Save Progress Settings</button>
                </form>
            `,
            attendance: `
                <form id="settings-form-attendance" onsubmit="event.preventDefault(); pageSettings.saveSection('attendance');">
                    <h4 style="margin-bottom: 16px; color: var(--text-primary);">Attendance Configuration</h4>
                    <div class="form-group">
                        <label class="form-label">Default Meeting Title</label>
                        <input type="text" class="form-input" id="set-default-meeting" value="${s.default_meeting_name || 'Daily Standup'}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Attendance Reward (XP)</label>
                        <input type="number" class="form-input" id="set-attendance-xp" value="${s.attendance_xp || 15}" min="0">
                    </div>
                    <button type="submit" class="btn btn-primary">Save Attendance Settings</button>
                </form>
            `,
            leaderboard: `
                <form id="settings-form-leaderboard" onsubmit="event.preventDefault(); pageSettings.saveSection('leaderboard');">
                    <h4 style="margin-bottom: 16px; color: var(--text-primary);">Leaderboard Settings</h4>
                    <div class="form-group">
                        <label class="form-label">Leaderboard Display Limit</label>
                        <input type="number" class="form-input" id="set-leaderboard-limit" value="${s.leaderboard_limit || 25}" min="5" max="100">
                    </div>
                    <button type="submit" class="btn btn-primary">Save Leaderboard Settings</button>
                </form>
            `,
            notifications: `
                <form id="settings-form-notifications" onsubmit="event.preventDefault(); pageSettings.saveSection('notifications');">
                    <h4 style="margin-bottom: 16px; color: var(--text-primary);">Notification Settings</h4>
                    <div class="form-group">
                        <label class="form-label">Daily Progress Reminder Time (24h format)</label>
                        <input type="text" class="form-input" id="set-reminder-time" value="${s.reminder_time || '18:00'}" placeholder="18:00">
                    </div>
                    <button type="submit" class="btn btn-primary">Save Notification Settings</button>
                </form>
            `,
        };

        container.innerHTML = sections[this.currentSection] || sections.bot;
    },

    async saveSection(section) {
        const payload = {};

        if (section === 'bot') {
            payload.bot_prefix = document.getElementById('set-bot-prefix')?.value || '!';
            payload.bot_activity = document.getElementById('set-bot-activity')?.value || 'tracking student progress';
        } else if (section === 'progress') {
            payload.daily_xp_reward = parseInt(document.getElementById('set-progress-xp')?.value, 10) || 10;
            payload.streak_bonus = parseInt(document.getElementById('set-streak-bonus')?.value, 10) || 5;
        } else if (section === 'attendance') {
            payload.default_meeting_name = document.getElementById('set-default-meeting')?.value || 'Daily Standup';
            payload.attendance_xp = parseInt(document.getElementById('set-attendance-xp')?.value, 10) || 15;
        } else if (section === 'leaderboard') {
            payload.leaderboard_limit = parseInt(document.getElementById('set-leaderboard-limit')?.value, 10) || 25;
        } else if (section === 'notifications') {
            payload.reminder_time = document.getElementById('set-reminder-time')?.value || '18:00';
        }

        try {
            await api.put('/dashboard/settings', { settings: payload });
            Object.assign(this.settings, payload);
            app.toast('Settings updated successfully!', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            app.toast(error.message || 'Failed to update settings', 'error');
        }
    },
};

window.pageSettings = pageSettings;
