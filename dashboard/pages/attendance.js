const pageAttendance = {
    records: [],
    searchQuery: '',

    async load() {
        this.bindEvents();
        await this.fetchAttendance();
    },

    bindEvents() {
        const searchInput = document.getElementById('attendance-search');
        if (searchInput && !searchInput.dataset.bound) {
            searchInput.dataset.bound = 'true';
            searchInput.addEventListener('input', app.debounce((e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                this.renderTable();
            }, 250));
        }
    },

    async fetchAttendance() {
        const tbody = document.getElementById('attendance-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;"><div class="loading-spinner" style="margin:0 auto;"></div></td></tr>';
        }

        try {
            const data = await api.get('/dashboard/attendance?limit=100');
            this.records = data.attendance || [];
            this.renderStats();
            this.renderTable();
        } catch (error) {
            console.error('Error fetching attendance:', error);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--red);padding:20px;">Failed to load attendance: ${error.message}</td></tr>`;
            }
        }
    },

    renderStats() {
        const statsEl = document.getElementById('attendance-stats');
        if (!statsEl) return;

        const total = this.records.length;
        const present = this.records.filter(r => r.status === 'present').length;
        const absent = this.records.filter(r => r.status === 'absent').length;
        const meetings = new Set(this.records.map(r => r.meetingName || 'Meeting')).size;

        statsEl.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(0,212,255,0.1);"><span style="font-size:22px;">📅</span></div>
                <div class="stat-info"><span class="stat-label">Total Records</span><h3 class="stat-value">${total}</h3></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(16,185,129,0.1);"><span style="font-size:22px;">✅</span></div>
                <div class="stat-info"><span class="stat-label">Present</span><h3 class="stat-value">${present}</h3></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(239,68,68,0.1);"><span style="font-size:22px;">❌</span></div>
                <div class="stat-info"><span class="stat-label">Absent</span><h3 class="stat-value">${absent}</h3></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(124,58,237,0.1);"><span style="font-size:22px;">🎯</span></div>
                <div class="stat-info"><span class="stat-label">Total Meetings</span><h3 class="stat-value">${meetings}</h3></div>
            </div>
        `;
    },

    renderTable() {
        const tbody = document.getElementById('attendance-tbody');
        if (!tbody) return;

        let filtered = this.records;
        if (this.searchQuery) {
            filtered = filtered.filter(a =>
                (a.memberName && a.memberName.toLowerCase().includes(this.searchQuery)) ||
                (a.memberId && a.memberId.toLowerCase().includes(this.searchQuery)) ||
                (a.meetingName && a.meetingName.toLowerCase().includes(this.searchQuery)) ||
                (a.status && a.status.toLowerCase().includes(this.searchQuery))
            );
        }

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px;">No attendance records found. Click "+ Create Meeting" to start.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(a => {
            const id = a._id || a.id;
            const isPresent = a.status === 'present';
            return `
                <tr>
                    <td>
                        <div style="font-weight: 600; color: var(--text-primary); font-size: 14px;">${a.memberName || a.memberId}</div>
                        <div style="font-size: 11px; color: var(--text-muted);">${a.memberId}</div>
                    </td>
                    <td>
                        <span class="badge ${isPresent ? 'badge-success' : 'badge-danger'}">
                            ${isPresent ? 'Present' : 'Absent'}
                        </span>
                    </td>
                    <td style="color: var(--text-secondary); font-size: 13px;">${app.formatDate(a.checkInTime || a.date)}</td>
                    <td style="color: var(--text-primary); font-weight: 500; font-size: 13px;">${a.meetingName || 'Daily Meeting'}</td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            ${!isPresent
                                ? `<button class="btn btn-secondary btn-sm" style="color: var(--green);" onclick="pageAttendance.updateStatus('${id}', 'present')">Mark Present</button>`
                                : `<button class="btn btn-secondary btn-sm" style="color: var(--yellow);" onclick="pageAttendance.updateStatus('${id}', 'absent')">Mark Absent</button>`
                            }
                            <button class="btn btn-secondary btn-sm" style="color: var(--red);" onclick="pageAttendance.deleteRecord('${id}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    openMeetingModal() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('meeting-name').value = '';
        document.getElementById('meeting-date').value = today;
        app.showModal('modal-meeting');
    },

    async createMeeting() {
        const name = document.getElementById('meeting-name').value.trim();
        const date = document.getElementById('meeting-date').value;

        if (!name) {
            app.toast('Please enter a meeting name', 'error');
            return;
        }

        try {
            // Fetch all members to create attendance roll for the meeting
            const membersData = await api.get('/dashboard/members?limit=100');
            const members = membersData.members || [];

            if (members.length === 0) {
                // If no members, create a placeholder entry
                await api.post('/dashboard/attendance', {
                    memberId: 'system',
                    status: 'present',
                    meetingName: name,
                    date: date || new Date().toISOString(),
                    notes: 'Session created'
                });
            } else {
                for (const member of members) {
                    await api.post('/dashboard/attendance', {
                        memberId: member.userId,
                        status: 'present',
                        meetingName: name,
                        date: date || new Date().toISOString(),
                        notes: 'Daily session'
                    });
                }
            }

            app.toast(`Meeting "${name}" created with attendance roll!`, 'success');
            app.hideModal('modal-meeting');
            await this.fetchAttendance();
        } catch (error) {
            console.error('Error creating meeting:', error);
            app.toast(error.message || 'Failed to create meeting', 'error');
        }
    },

    async updateStatus(id, newStatus) {
        try {
            await api.put(`/dashboard/attendance/${id}`, { status: newStatus });
            app.toast(`Attendance updated to ${newStatus}`, 'success');
            await this.fetchAttendance();
        } catch (error) {
            console.error('Error updating attendance:', error);
            app.toast(error.message || 'Failed to update attendance', 'error');
        }
    },

    async deleteRecord(id) {
        if (!confirm('Delete this attendance record?')) return;

        try {
            await api.delete(`/dashboard/attendance/${id}`);
            app.toast('Attendance record deleted', 'success');
            await this.fetchAttendance();
        } catch (error) {
            console.error('Error deleting attendance:', error);
            app.toast(error.message || 'Failed to delete attendance', 'error');
        }
    },
};

window.pageAttendance = pageAttendance;
