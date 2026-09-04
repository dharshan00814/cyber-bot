const pageProgress = {
    records: [],
    searchQuery: '',

    async load() {
        this.bindEvents();
        await this.fetchProgress();
    },

    bindEvents() {
        const searchInput = document.getElementById('progress-search');
        if (searchInput && !searchInput.dataset.bound) {
            searchInput.dataset.bound = 'true';
            searchInput.addEventListener('input', app.debounce((e) => {
                this.searchQuery = e.target.value.toLowerCase().trim();
                this.renderTable();
            }, 250));
        }

        const saveBtn = document.getElementById('progress-save-btn');
        if (saveBtn && !saveBtn.dataset.bound) {
            saveBtn.dataset.bound = 'true';
            saveBtn.addEventListener('click', () => this.saveProgress());
        }
    },

    async fetchProgress() {
        const tbody = document.getElementById('progress-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;"><div class="loading-spinner" style="margin:0 auto;"></div></td></tr>';
        }

        try {
            const data = await api.get('/dashboard/progress?limit=100');
            this.records = data.progress || [];
            this.renderTable();
        } catch (error) {
            console.error('Error fetching progress:', error);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--red);padding:20px;">Failed to load progress: ${error.message}</td></tr>`;
            }
        }
    },

    renderTable() {
        const tbody = document.getElementById('progress-tbody');
        if (!tbody) return;

        let filtered = this.records;
        if (this.searchQuery) {
            filtered = filtered.filter(p =>
                (p.memberName && p.memberName.toLowerCase().includes(this.searchQuery)) ||
                (p.userId && p.userId.toLowerCase().includes(this.searchQuery)) ||
                (p.text && p.text.toLowerCase().includes(this.searchQuery))
            );
        }

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:30px;">No progress entries found.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(p => {
            const id = p._id || p.id;
            return `
                <tr>
                    <td>
                        <div style="font-weight: 600; color: var(--text-primary); font-size: 14px;">${p.memberName || p.userId}</div>
                        <div style="font-size: 11px; color: var(--text-muted);">${p.userId}</div>
                    </td>
                    <td style="color: var(--text-secondary); font-size: 13px; white-space: nowrap;">${app.formatDate(p.date)}</td>
                    <td style="font-size: 13px; color: var(--text-primary); max-width: 450px;">${p.text || ''}</td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-secondary btn-sm" onclick="pageProgress.openEditModal('${id}')">Edit</button>
                            <button class="btn btn-secondary btn-sm" style="color: var(--red);" onclick="pageProgress.deleteProgress('${id}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    openAddModal() {
        document.getElementById('modal-progress-title').textContent = 'Add Progress';
        document.getElementById('progress-id').value = '';
        document.getElementById('progress-userid').value = '';
        document.getElementById('progress-userid').disabled = false;
        document.getElementById('progress-text').value = '';
        app.showModal('modal-progress');
    },

    openEditModal(id) {
        const item = this.records.find(p => (p._id || p.id) === id);
        if (!item) return;

        document.getElementById('modal-progress-title').textContent = 'Edit Progress';
        document.getElementById('progress-id').value = id;
        document.getElementById('progress-userid').value = item.userId;
        document.getElementById('progress-userid').disabled = true;
        document.getElementById('progress-text').value = item.text || '';
        app.showModal('modal-progress');
    },

    async saveProgress() {
        const idField = document.getElementById('progress-id').value;
        const userId = document.getElementById('progress-userid').value.trim();
        const text = document.getElementById('progress-text').value.trim();

        if (!userId || !text) {
            app.toast('Please provide both User ID and Progress description', 'error');
            return;
        }

        try {
            if (idField) {
                await api.put(`/dashboard/progress/${idField}`, { text });
                app.toast('Progress updated successfully', 'success');
            } else {
                await api.post('/dashboard/progress', { userId, text });
                app.toast('Progress added successfully (+10 XP awarded)', 'success');
            }
            app.hideModal('modal-progress');
            await this.fetchProgress();
        } catch (error) {
            console.error('Error saving progress:', error);
            app.toast(error.message || 'Failed to save progress', 'error');
        }
    },

    async deleteProgress(id) {
        if (!confirm('Are you sure you want to delete this progress record?')) return;

        try {
            await api.delete(`/dashboard/progress/${id}`);
            app.toast('Progress entry deleted', 'success');
            await this.fetchProgress();
        } catch (error) {
            console.error('Error deleting progress:', error);
            app.toast(error.message || 'Failed to delete progress', 'error');
        }
    },
};

window.pageProgress = pageProgress;
