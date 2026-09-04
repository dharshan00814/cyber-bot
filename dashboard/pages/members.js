const pageMembers = {
    members: [],
    searchQuery: '',

    async load() {
        this.bindEvents();
        await this.fetchMembers();
    },

    bindEvents() {
        const searchInput = document.getElementById('members-search');
        if (searchInput && !searchInput.dataset.bound) {
            searchInput.dataset.bound = 'true';
            searchInput.addEventListener('input', app.debounce((e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                this.renderTable();
            }, 250));
        }

        const saveBtn = document.getElementById('member-save-btn');
        if (saveBtn && !saveBtn.dataset.bound) {
            saveBtn.dataset.bound = 'true';
            saveBtn.addEventListener('click', () => this.saveMember());
        }
    },

    async fetchMembers() {
        const tbody = document.getElementById('members-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;"><div class="loading-spinner" style="margin:0 auto;"></div></td></tr>';
        }

        try {
            const data = await api.get('/dashboard/members?limit=100');
            this.members = data.members || [];
            this.renderTable();
        } catch (error) {
            console.error('Error fetching members:', error);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--red);padding:20px;">Failed to load members: ${error.message}</td></tr>`;
            }
        }
    },

    renderTable() {
        const tbody = document.getElementById('members-tbody');
        if (!tbody) return;

        let filtered = this.members;
        if (this.searchQuery) {
            filtered = filtered.filter(m =>
                (m.name && m.name.toLowerCase().includes(this.searchQuery)) ||
                (m.userId && m.userId.toLowerCase().includes(this.searchQuery)) ||
                (m.role && m.role.toLowerCase().includes(this.searchQuery))
            );
        }

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px;">No members found. Click "+ Add Member" to add one.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(m => {
            const roleBadges = {
                organizer: 'badge-accent',
                advanced: 'badge-purple',
                intermediate: 'badge-info',
                beginner: 'badge-warning',
            };
            const badgeClass = roleBadges[m.role] || 'badge-info';
            const initials = (m.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--purple)); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff;">
                                ${initials}
                            </div>
                            <div>
                                <div style="font-weight: 600; color: var(--text-primary); font-size: 14px;">${m.name || 'Unnamed'}</div>
                                <div style="font-size: 12px; color: var(--text-muted);">ID: ${m.userId}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge ${badgeClass}">${m.role || 'beginner'}</span></td>
                    <td style="color: var(--text-secondary); font-size: 13px;">${app.formatDate(m.joinDate)}</td>
                    <td style="font-weight: 700; color: var(--accent); font-size: 14px;">${app.formatNumber(m.xp || 0)} XP</td>
                    <td>
                        <span class="badge ${m.streak > 0 ? 'badge-success' : 'badge-info'}">
                            ${m.streak > 0 ? `🔥 ${m.streak}d streak` : 'Active'}
                        </span>
                    </td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-secondary btn-sm" onclick="pageMembers.openEditModal('${m.userId}')">Edit</button>
                            <button class="btn btn-secondary btn-sm" style="color: var(--red);" onclick="pageMembers.deleteMember('${m.userId}', '${m.name}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    openAddModal() {
        document.getElementById('modal-member-title').textContent = 'Add Member';
        document.getElementById('member-id').value = '';
        document.getElementById('member-userid').value = '';
        document.getElementById('member-userid').disabled = false;
        document.getElementById('member-name').value = '';
        document.getElementById('member-role').value = 'beginner';
        app.showModal('modal-member');
    },

    openEditModal(userId) {
        const member = this.members.find(m => m.userId === userId);
        if (!member) return;

        document.getElementById('modal-member-title').textContent = 'Edit Member';
        document.getElementById('member-id').value = member.userId;
        document.getElementById('member-userid').value = member.userId;
        document.getElementById('member-userid').disabled = true;
        document.getElementById('member-name').value = member.name || '';
        document.getElementById('member-role').value = member.role || 'beginner';
        app.showModal('modal-member');
    },

    async saveMember() {
        const idField = document.getElementById('member-id').value;
        const userId = document.getElementById('member-userid').value.trim();
        const name = document.getElementById('member-name').value.trim();
        const role = document.getElementById('member-role').value;

        if (!userId || !name) {
            app.toast('Please provide both User ID and Display Name', 'error');
            return;
        }

        try {
            if (idField) {
                // Update
                await api.put(`/dashboard/members/${idField}`, { name, role });
                app.toast('Member updated successfully', 'success');
            } else {
                // Create
                await api.post('/dashboard/members', { userId, name, role });
                app.toast('Member added successfully', 'success');
            }
            app.hideModal('modal-member');
            await this.fetchMembers();
        } catch (error) {
            console.error('Error saving member:', error);
            app.toast(error.message || 'Failed to save member', 'error');
        }
    },

    async deleteMember(userId, name) {
        if (!confirm(`Are you sure you want to delete member "${name || userId}"?`)) return;

        try {
            await api.delete(`/dashboard/members/${userId}`);
            app.toast('Member deleted successfully', 'success');
            await this.fetchMembers();
        } catch (error) {
            console.error('Error deleting member:', error);
            app.toast(error.message || 'Failed to delete member', 'error');
        }
    },
};

window.pageMembers = pageMembers;
