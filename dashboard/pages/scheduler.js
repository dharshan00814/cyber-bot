const pageScheduler = {
    jobs: [],

    async load() {
        await this.fetchSchedulerJobs();
    },

    async fetchSchedulerJobs() {
        const tbody = document.getElementById('scheduler-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;"><div class="loading-spinner" style="margin:0 auto;"></div></td></tr>';
        }

        try {
            const data = await api.get('/dashboard/scheduler');
            this.jobs = data.jobs || [];
            this.renderTable();
        } catch (error) {
            console.error('Error fetching scheduler jobs:', error);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--red);padding:20px;">Failed to load scheduler: ${error.message}</td></tr>`;
            }
        }
    },

    renderTable() {
        const tbody = document.getElementById('scheduler-tbody');
        if (!tbody) return;

        if (this.jobs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px;">No scheduled tasks registered.</td></tr>';
            return;
        }

        tbody.innerHTML = this.jobs.map(job => {
            const isEnabled = Boolean(job.enabled);
            return `
                <tr>
                    <td>
                        <div style="font-weight: 600; color: var(--text-primary); font-size: 14px;">${job.name || job.id}</div>
                        <div style="font-size: 11px; color: var(--text-muted); font-family: monospace;">ID: ${job.id}</div>
                    </td>
                    <td>
                        <code style="background: var(--bg-tertiary); padding: 4px 8px; border-radius: 4px; color: var(--accent); font-size: 13px;">${job.cron || 'N/A'}</code>
                    </td>
                    <td>
                        <span class="badge ${isEnabled ? 'badge-success' : 'badge-warning'}">
                            ${isEnabled ? 'Active' : 'Paused'}
                        </span>
                    </td>
                    <td style="color: var(--text-secondary); font-size: 13px;">
                        ${app.formatDate(job.lastRun)}
                        ${job.lastStatus ? `<span class="badge ${job.lastStatus === 'success' ? 'badge-success' : 'badge-danger'}" style="font-size: 10px; margin-left: 6px;">${job.lastStatus}</span>` : ''}
                    </td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-primary btn-sm" onclick="pageScheduler.runNow('${job.id}')">Run Now</button>
                            <button class="btn btn-secondary btn-sm" onclick="pageScheduler.toggleJob('${job.id}', ${!isEnabled})">
                                ${isEnabled ? 'Pause' : 'Resume'}
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async runNow(jobId) {
        try {
            await api.post(`/dashboard/scheduler/${jobId}/run`);
            app.toast(`Triggered scheduled task "${jobId}"!`, 'success');
            await this.fetchSchedulerJobs();
        } catch (error) {
            console.error('Error triggering job:', error);
            app.toast(error.message || 'Failed to trigger job', 'error');
        }
    },

    async toggleJob(jobId, enable) {
        try {
            await api.put(`/dashboard/scheduler/${jobId}`, { enabled: enable });
            app.toast(`Task ${enable ? 'resumed' : 'paused'} successfully`, 'info');
            await this.fetchSchedulerJobs();
        } catch (error) {
            console.error('Error updating job status:', error);
            app.toast(error.message || 'Failed to update task', 'error');
        }
    },
};

window.pageScheduler = pageScheduler;
