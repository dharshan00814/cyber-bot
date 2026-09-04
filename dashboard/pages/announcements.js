const pageAnnouncements = {
    announcements: [],
    channels: [],

    async load() {
        this.bindEvents();
        await Promise.all([this.fetchAnnouncements(), this.fetchChannels()]);
    },

    bindEvents() {
        const saveBtn = document.getElementById('announcement-save-btn');
        if (saveBtn && !saveBtn.dataset.bound) {
            saveBtn.dataset.bound = 'true';
            saveBtn.addEventListener('click', () => this.saveAnnouncement());
        }
    },

    async fetchChannels() {
        try {
            const data = await api.get('/dashboard/channels');
            this.channels = data.channels || [];
            this.populateChannelDropdown();
        } catch (e) {
            console.warn('Could not fetch channels for announcements:', e);
        }
    },

    populateChannelDropdown() {
        const select = document.getElementById('announcement-channel');
        if (!select) return;

        select.innerHTML = '<option value="">Select a channel (or default)...</option>';
        this.channels.forEach(ch => {
            const opt = document.createElement('option');
            opt.value = ch.id;
            opt.textContent = `#${ch.name}${ch.category ? ` (${ch.category})` : ''}`;
            select.appendChild(opt);
        });
    },

    async fetchAnnouncements() {
        const tbody = document.getElementById('announcements-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;"><div class="loading-spinner" style="margin:0 auto;"></div></td></tr>';
        }

        try {
            const data = await api.get('/dashboard/announcements');
            this.announcements = data.announcements || [];
            this.renderTable();
        } catch (error) {
            console.error('Error fetching announcements:', error);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--red);padding:20px;">Failed to load announcements: ${error.message}</td></tr>`;
            }
        }
    },

    renderTable() {
        const tbody = document.getElementById('announcements-tbody');
        if (!tbody) return;

        if (this.announcements.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px;">No announcements created yet. Click "+ New Announcement" above.</td></tr>';
            return;
        }

        tbody.innerHTML = this.announcements.map(ann => {
            const id = ann._id || ann.id;
            const statusBadges = {
                sent: 'badge-success',
                scheduled: 'badge-warning',
                draft: 'badge-info',
            };
            const badgeClass = statusBadges[ann.status] || 'badge-info';

            return `
                <tr>
                    <td>
                        <div style="font-weight: 600; color: var(--text-primary); font-size: 14px;">${ann.title}</div>
                        <div style="color: var(--text-secondary); font-size: 12px; margin-top: 2px; max-width: 350px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${ann.message || ''}
                        </div>
                    </td>
                    <td>
                        <span class="badge ${badgeClass}">${(ann.status || 'draft').toUpperCase()}</span>
                    </td>
                    <td style="color: var(--text-secondary); font-size: 13px;">${app.formatDate(ann.scheduledAt)}</td>
                    <td style="color: var(--text-secondary); font-size: 13px;">${app.formatDate(ann.sentAt)}</td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            ${ann.status !== 'sent' ? `
                                <button class="btn btn-primary btn-sm" onclick="pageAnnouncements.sendNow('${id}')">Send Now</button>
                            ` : ''}
                            <button class="btn btn-secondary btn-sm" style="color: var(--red);" onclick="pageAnnouncements.deleteAnnouncement('${id}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    openAddModal() {
        document.getElementById('modal-announcement-title').textContent = 'New Announcement';
        document.getElementById('announcement-id').value = '';
        document.getElementById('announcement-title').value = '';
        document.getElementById('announcement-message').value = '';
        document.getElementById('announcement-schedule').value = '';
        this.populateChannelDropdown();
        app.showModal('modal-announcement');
    },

    async saveAnnouncement() {
        const title = document.getElementById('announcement-title').value.trim();
        const message = document.getElementById('announcement-message').value.trim();
        const channelId = document.getElementById('announcement-channel').value;
        const scheduledAt = document.getElementById('announcement-schedule').value;

        if (!title || !message) {
            app.toast('Please provide both Title and Message', 'error');
            return;
        }

        try {
            await api.post('/dashboard/announcements', {
                title,
                message,
                channelId,
                scheduledAt: scheduledAt || null,
            });
            app.toast('Announcement created successfully', 'success');
            app.hideModal('modal-announcement');
            await this.fetchAnnouncements();
        } catch (error) {
            console.error('Error creating announcement:', error);
            app.toast(error.message || 'Failed to create announcement', 'error');
        }
    },

    async sendNow(id) {
        if (!confirm('Send this announcement to the Discord channel now?')) return;

        try {
            await api.post(`/dashboard/announcements/${id}/send`);
            app.toast('Announcement sent successfully!', 'success');
            await this.fetchAnnouncements();
        } catch (error) {
            console.error('Error sending announcement:', error);
            app.toast(error.message || 'Failed to send announcement to Discord', 'error');
        }
    },

    async deleteAnnouncement(id) {
        if (!confirm('Delete this announcement?')) return;

        try {
            await api.delete(`/dashboard/announcements/${id}`);
            app.toast('Announcement deleted', 'success');
            await this.fetchAnnouncements();
        } catch (error) {
            console.error('Error deleting announcement:', error);
            app.toast(error.message || 'Failed to delete announcement', 'error');
        }
    },
};

window.pageAnnouncements = pageAnnouncements;
