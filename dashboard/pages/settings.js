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
            voice: `
                <form id="settings-form-voice" onsubmit="event.preventDefault(); pageSettings.saveSection('voice');">
                    <h4 style="margin-bottom: 16px; color: var(--text-primary);">AI Voice Meeting & Doubt Clarification Settings</h4>
                    <div class="form-group">
                        <label class="form-label">Google Gemini API Key (for Advanced STT & Generative Doubts)</label>
                        <input type="password" class="form-input" id="set-gemini-key" value="${s.gemini_api_key || ''}" placeholder="AIzaSy...">
                        <span style="font-size:12px; color:var(--text-secondary); margin-top:4px; display:block;">Used for Gemini 2.0 Flash audio listening and real-time doubt clarification. (Leave blank to use built-in tutor).</span>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Default Text-to-Speech Voice</label>
                        <select class="form-select" id="set-tts-voice">
                            <option value="en-US-ChristopherNeural" ${s.tts_voice === 'en-US-ChristopherNeural' ? 'selected' : ''}>Christopher (US Male - Professional & Clear)</option>
                            <option value="en-US-JennyNeural" ${s.tts_voice === 'en-US-JennyNeural' ? 'selected' : ''}>Jenny (US Female - Natural & Friendly)</option>
                            <option value="en-US-GuyNeural" ${s.tts_voice === 'en-US-GuyNeural' ? 'selected' : ''}>Guy (US Male - Confident)</option>
                            <option value="en-US-AriaNeural" ${s.tts_voice === 'en-US-AriaNeural' ? 'selected' : ''}>Aria (US Female - Expressive)</option>
                            <option value="en-GB-SoniaNeural" ${s.tts_voice === 'en-GB-SoniaNeural' ? 'selected' : ''}>Sonia (British Female - Crisp & Polite)</option>
                            <option value="en-GB-RyanNeural" ${s.tts_voice === 'en-GB-RyanNeural' ? 'selected' : ''}>Ryan (British Male - Articulate)</option>
                            <option value="en-IN-NeerjaNeural" ${s.tts_voice === 'en-IN-NeerjaNeural' ? 'selected' : ''}>Neerja (Indian English Female - Melodic)</option>
                            <option value="en-IN-PrabhatNeural" ${s.tts_voice === 'en-IN-PrabhatNeural' ? 'selected' : ''}>Prabhat (Indian English Male - Clear)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Wake Phrase / Bot Name</label>
                        <input type="text" class="form-input" id="set-wake-word" value="${s.wake_word || 'cyber bot'}" placeholder="cyber bot">
                        <span style="font-size:12px; color:var(--text-secondary); margin-top:4px; display:block;">When users say "Hey Cyber Bot...", the bot prioritizes answering their doubt.</span>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Voice Meeting Auto-Attendance</label>
                        <select class="form-select" id="set-auto-attendance">
                            <option value="true" ${s.auto_attendance !== 'false' ? 'selected' : ''}>Enabled (Auto-mark present for all attendees)</option>
                            <option value="false" ${s.auto_attendance === 'false' ? 'selected' : ''}>Disabled (Manual only)</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary">Save Voice & AI Settings</button>
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
        } else if (section === 'voice') {
            payload.gemini_api_key = document.getElementById('set-gemini-key')?.value || '';
            payload.tts_voice = document.getElementById('set-tts-voice')?.value || 'en-US-ChristopherNeural';
            payload.wake_word = document.getElementById('set-wake-word')?.value || 'cyber bot';
            payload.auto_attendance = document.getElementById('set-auto-attendance')?.value || 'true';

            if (payload.gemini_api_key) {
                process.env.GEMINI_API_KEY = payload.gemini_api_key;
            }
            if (payload.tts_voice) {
                process.env.TTS_VOICE = payload.tts_voice;
            }
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
