const pageChannels = {
    channels: [],

    async load() {
        this.bindEvents();
        await this.fetchChannelsAndSettings();
    },

    bindEvents() {
        const form = document.getElementById('channels-form');
        if (form && !form.dataset.bound) {
            form.dataset.bound = 'true';
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveChannelConfig();
            });
        }
    },

    async fetchChannelsAndSettings() {
        try {
            const [channelsData, settingsData] = await Promise.all([
                api.get('/dashboard/channels'),
                api.get('/dashboard/settings?category=channels'),
            ]);

            this.channels = channelsData.channels || [];
            this.populateSelects();

            const savedChannels = settingsData.settings?.channels || {};
            if (savedChannels.progress) {
                const el = document.getElementById('channel-progress');
                if (el) el.value = savedChannels.progress;
            }
            if (savedChannels.announcement) {
                const el = document.getElementById('channel-announcement');
                if (el) el.value = savedChannels.announcement;
            }
            if (savedChannels.general) {
                const el = document.getElementById('channel-general');
                if (el) el.value = savedChannels.general;
            }
        } catch (error) {
            console.error('Error loading channel configuration:', error);
            app.toast('Could not load channel lists from Discord', 'error');
        }
    },

    populateSelects() {
        const selects = [
            document.getElementById('channel-progress'),
            document.getElementById('channel-announcement'),
            document.getElementById('channel-general'),
        ];

        selects.forEach(select => {
            if (!select) return;
            const currentVal = select.value;
            select.innerHTML = '<option value="">Select a channel...</option>';

            if (this.channels.length === 0) {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = 'No channels detected (check bot permissions)';
                select.appendChild(opt);
                return;
            }

            this.channels.forEach(ch => {
                const opt = document.createElement('option');
                opt.value = ch.id;
                opt.textContent = `#${ch.name}${ch.category ? ` (${ch.category})` : ''}`;
                select.appendChild(opt);
            });

            if (currentVal) select.value = currentVal;
        });
    },

    async saveChannelConfig() {
        const progress = document.getElementById('channel-progress')?.value || '';
        const announcement = document.getElementById('channel-announcement')?.value || '';
        const general = document.getElementById('channel-general')?.value || '';

        try {
            await api.put('/dashboard/settings', {
                settings: {
                    channels: { progress, announcement, general },
                },
            });
            app.toast('Discord channel configuration saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving channels:', error);
            app.toast(error.message || 'Failed to save configuration', 'error');
        }
    },
};

window.pageChannels = pageChannels;
