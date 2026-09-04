const cron = require('node-cron');

const jobs = [];

function registerJob(id, name, cronExpression, task, options = {}) {
    const scheduledTask = cron.schedule(cronExpression, task, options);
    const job = {
        id,
        name,
        cron: cronExpression,
        task: scheduledTask,
        enabled: options.start !== false,
        lastRun: null,
        nextRun: null,
        lastStatus: null,
    };
    jobs.push(job);
    return job;
}

function getJobs() {
    return jobs.map(job => ({
        id: job.id,
        name: job.name,
        cron: job.cron,
        enabled: job.enabled,
        lastRun: job.lastRun,
        nextRun: job.nextRun,
        lastStatus: job.lastStatus,
    }));
}

function getJob(id) {
    const job = jobs.find(j => j.id === id);
    if (!job) return null;
    return {
        id: job.id,
        name: job.name,
        cron: job.cron,
        enabled: job.enabled,
        lastRun: job.lastRun,
        nextRun: job.nextRun,
        lastStatus: job.lastStatus,
    };
}

function updateJob(id, updates) {
    const job = jobs.find(j => j.id === id);
    if (!job) return null;

    if (typeof updates.enabled === 'boolean') {
        job.enabled = updates.enabled;
        if (updates.enabled) {
            job.task.start();
        } else {
            job.task.stop();
        }
    }

    if (updates.cron && updates.cron !== job.cron) {
        job.cron = updates.cron;
        job.task.stop();
        job.task = cron.schedule(updates.cron, job.task, { start: job.enabled });
    }

    return getJob(id);
}

async function runJobNow(id) {
    const job = jobs.find(j => j.id === id);
    if (!job) return false;
    try {
        job.lastRun = new Date();
        job.lastStatus = 'running';
        await job.task();
        job.lastStatus = 'success';
        return true;
    } catch (error) {
        job.lastStatus = 'error';
        console.error(`Error running job ${id}:`, error);
        return false;
    }
}

function recordJobExecution(id, status) {
    const job = jobs.find(j => j.id === id);
    if (job) {
        job.lastRun = new Date();
        job.lastStatus = status;
    }
}

module.exports = {
    registerJob,
    getJobs,
    getJob,
    updateJob,
    runJobNow,
    recordJobExecution,
};
