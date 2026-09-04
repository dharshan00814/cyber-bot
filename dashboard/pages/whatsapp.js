const pageWhatsApp = {
    pollTimer: null,
    groups: [],
    status: null,

    async load() {
        this.bindEvents();
        await this.fetchStatus();
        this.startPolling();
    },

    bindEvents() {
        const sendBtn = document.getElementById('wa-send-btn');
        if (sendBtn && !sendBtn.dataset.bound) {
            sendBtn.dataset.bound = 'true';
            sendBtn.addEventListener('click', () => this.sendReminder());
        }

        const saveSettingsBtn = document.getElementById('wa-save-settings-btn');
        if (saveSettingsBtn && !saveSettingsBtn.dataset.bound) {
            saveSettingsBtn.dataset.bound = 'true';
            saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }

        const refreshGroupsBtn = document.getElementById('wa-refresh-groups-btn');
        if (refreshGroupsBtn && !refreshGroupsBtn.dataset.bound) {
            refreshGroupsBtn.dataset.bound = 'true';
            refreshGroupsBtn.addEventListener('click', () => this.fetchGroups(true));
        }

        const templateSelect = document.getElementById('wa-preset-templates');
        if (templateSelect && !templateSelect.dataset.bound) {
            templateSelect.dataset.bound = 'true';
            templateSelect.addEventListener('change', (e) => {
                const messageInput = document.getElementById('wa-message');
                if (messageInput && e.target.value) {
                    messageInput.value = e.target.value;
                }
            });
        }
    },

    startPolling() {
        if (this.pollTimer) clearInterval(this.pollTimer);
        this.pollTimer = setInterval(async () => {
            // Only poll if on the whatsapp page or if status is not connected yet
            if (app.currentPage === 'whatsapp' || this.status?.status !== 'connected') {
                await this.fetchStatus(true);
            }
        }, 5000);
    },

    async fetchStatus(isBackground = false) {
        try {
            const data = await api.get('/dashboard/whatsapp/status');
            this.status = data;
            this.renderStatus(data);

            if (data.connected && (!this.groups || this.groups.length === 0)) {
                await this.fetchGroups(false);
            }
        } catch (error) {
            if (!isBackground) {
                console.error('Error fetching WhatsApp status:', error);
                app.toast('Failed to load WhatsApp status', 'error');
            }
        }
    },

    renderStatus(data) {
        const badge = document.getElementById('wa-status-badge');
        const userDetails = document.getElementById('wa-user-details');
        const qrContainer = document.getElementById('wa-qr-container');
        const connectBtn = document.getElementById('wa-connect-btn');
        const disconnectBtn = document.getElementById('wa-disconnect-btn');

        if (!badge) return;

        if (data.connected) {
            badge.className = 'badge badge-success';
            badge.textContent = 'CONNECTED';

            if (userDetails) {
                userDetails.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px; margin-top: 10px;">
                        <div style="width: 44px; height: 44px; border-radius: 50%; background: #10b981; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                            📱
                        </div>
                        <div>
                            <div style="font-weight: 600; color: var(--text-primary); font-size: 15px;">${data.user?.name || 'Cyber Bot WhatsApp'}</div>
                            <div style="font-size: 13px; color: var(--text-secondary); font-family: monospace;">+${data.user?.phone || 'Linked'}</div>
                        </div>
                    </div>
                `;
            }

            if (qrContainer) {
                qrContainer.style.display = 'none';
            }

            if (connectBtn) connectBtn.style.display = 'none';
            if (disconnectBtn) disconnectBtn.style.display = 'inline-flex';
        } else if (data.status === 'qr_ready') {
            badge.className = 'badge badge-warning';
            badge.textContent = 'SCAN QR CODE';

            if (userDetails) {
                userDetails.innerHTML = `
                    <div style="color: var(--text-secondary); font-size: 13px; margin-top: 8px;">
                        Open <strong>WhatsApp</strong> on your mobile phone &gt; <strong>Linked Devices</strong> &gt; <strong>Link a Device</strong> and point your camera at the QR code below.
                    </div>
                `;
            }

            if (qrContainer) {
                qrContainer.style.display = 'block';
                const qrImage = document.getElementById('wa-qr-image');
                if (qrImage && data.qrCodeDataUrl) {
                    qrImage.src = data.qrCodeDataUrl;
                }
            }

            if (connectBtn) connectBtn.style.display = 'none';
            if (disconnectBtn) disconnectBtn.style.display = 'inline-flex';
        } else if (data.status === 'connecting') {
            badge.className = 'badge badge-info';
            badge.textContent = 'CONNECTING...';

            if (userDetails) {
                userDetails.innerHTML = '<div style="color: var(--text-secondary); font-size: 13px; margin-top: 8px;">Connecting to WhatsApp gateway... Generating session keys.</div>';
            }

            if (qrContainer) qrContainer.style.display = 'none';
            if (connectBtn) connectBtn.style.display = 'none';
            if (disconnectBtn) disconnectBtn.style.display = 'inline-flex';
        } else {
            badge.className = 'badge badge-danger';
            badge.textContent = 'DISCONNECTED';

            if (userDetails) {
                userDetails.innerHTML = `
                    <div style="color: var(--text-secondary); font-size: 13px; margin-top: 8px;">
                        WhatsApp is currently disconnected. Click <strong>"Connect WhatsApp"</strong> below to generate a QR code for linking your group bot.
                    </div>
                `;
            }

            if (qrContainer) qrContainer.style.display = 'none';
            if (connectBtn) connectBtn.style.display = 'inline-flex';
            if (disconnectBtn) disconnectBtn.style.display = 'none';
        }

        // Fill default group and template if inputs exist and are empty
        if (data.config) {
            const defaultGroupSelect = document.getElementById('wa-default-group');
            const reminderTemplate = document.getElementById('wa-reminder-template');
            if (reminderTemplate && !reminderTemplate.value) {
                reminderTemplate.value = data.config.reminderTemplate || '';
            }
        }
    },

    async fetchGroups(force = false) {
        const selectEls = [
            document.getElementById('wa-send-group'),
            document.getElementById('wa-default-group')
        ];

        selectEls.forEach(sel => {
            if (sel) {
                sel.innerHTML = '<option value="">Loading groups...</option>';
            }
        });

        try {
            const data = await api.get(`/dashboard/whatsapp/groups?refresh=${force ? 'true' : 'false'}`);
            this.groups = data.groups || [];
            this.renderGroupDropdowns();
            if (force) {
                app.toast(`Fetched ${this.groups.length} WhatsApp groups`, 'success');
            }
        } catch (error) {
            console.error('Error fetching groups:', error);
            selectEls.forEach(sel => {
                if (sel) sel.innerHTML = '<option value="">Failed to load groups</option>';
            });
        }
    },

    renderGroupDropdowns() {
        const sendGroupSelect = document.getElementById('wa-send-group');
        const defaultGroupSelect = document.getElementById('wa-default-group');

        const defaultJid = this.status?.config?.defaultGroup || '';

        const populate = (selectEl, includePlaceholder) => {
            if (!selectEl) return;
            selectEl.innerHTML = includePlaceholder ? '<option value="">Select a WhatsApp Group...</option>' : '';

            if (this.groups.length === 0) {
                selectEl.innerHTML = '<option value="">No groups detected (create or join a group with this number)</option>';
                return;
            }

            this.groups.forEach(g => {
                const opt = document.createElement('option');
                opt.value = g.jid;
                opt.textContent = `${g.name} (${g.participantsCount} members)`;
                if (defaultJid && g.jid === defaultJid) {
                    opt.selected = true;
                }
                selectEl.appendChild(opt);
            });
        };

        populate(sendGroupSelect, true);
        populate(defaultGroupSelect, true);

        // Preselect default group in sendGroupSelect if available
        if (defaultJid && sendGroupSelect) {
            sendGroupSelect.value = defaultJid;
        }
    },

    async connectWhatsApp() {
        app.toast('Initiating WhatsApp connection...', 'info');
        try {
            await api.post('/dashboard/whatsapp/connect');
            await this.fetchStatus();
        } catch (err) {
            app.toast(err.message || 'Failed to start WhatsApp connection', 'error');
        }
    },

    async disconnectWhatsApp() {
        if (!confirm('Are you sure you want to log out and disconnect WhatsApp? You will need to re-scan the QR code to link again.')) {
            return;
        }

        try {
            await api.post('/dashboard/whatsapp/disconnect');
            app.toast('WhatsApp disconnected and logged out', 'info');
            await this.fetchStatus();
        } catch (err) {
            app.toast(err.message || 'Failed to disconnect WhatsApp', 'error');
        }
    },

    async sendReminder() {
        const groupSelect = document.getElementById('wa-send-group');
        const messageInput = document.getElementById('wa-message');
        const sendBtn = document.getElementById('wa-send-btn');

        const groupJid = groupSelect ? groupSelect.value : '';
        const message = messageInput ? messageInput.value.trim() : '';

        if (!groupJid) {
            app.toast('Please select a target WhatsApp Group', 'error');
            return;
        }

        if (!message) {
            app.toast('Please enter a reminder message', 'error');
            return;
        }

        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.textContent = 'Sending...';
        }

        try {
            const res = await api.post('/dashboard/whatsapp/send', {
                groupJid,
                message,
            });

            app.toast(res.message || 'Reminder sent to group!', 'success');
            if (messageInput) messageInput.value = '';
        } catch (error) {
            console.error('Error sending reminder:', error);
            app.toast(error.message || 'Failed to send reminder', 'error');
        } finally {
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.textContent = '📤 Send Reminder Now';
            }
        }
    },

    async saveSettings() {
        const defaultGroupSelect = document.getElementById('wa-default-group');
        const templateInput = document.getElementById('wa-reminder-template');
        const saveBtn = document.getElementById('wa-save-settings-btn');

        const defaultGroup = defaultGroupSelect ? defaultGroupSelect.value : '';
        const reminderTemplate = templateInput ? templateInput.value.trim() : '';

        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
        }

        try {
            await api.post('/dashboard/whatsapp/settings', {
                defaultGroup,
                reminderTemplate,
            });

            app.toast('WhatsApp default settings saved successfully!', 'success');
            await this.fetchStatus(true);
        } catch (error) {
            console.error('Error saving settings:', error);
            app.toast(error.message || 'Failed to save settings', 'error');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Configuration';
            }
        }
    },
};

window.pageWhatsApp = pageWhatsApp;
