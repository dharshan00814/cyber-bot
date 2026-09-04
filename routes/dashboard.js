const express = require('express');
const router = express.Router();
const client = require('../utils/client');
const Member = require('../models/Member');
const Progress = require('../models/Progress');
const Attendance = require('../models/Attendance');
const Announcement = require('../models/Announcement');
const Playlist = require('../models/Playlist');
const Setting = require('../models/Settings');
const { getJobs, getJob, updateJob, runJobNow } = require('../utils/schedulerRegistry');
const { getSupabaseClient } = require('../utils/supabaseStore');
const whatsAppService = require('../services/whatsapp');
const voiceMeetingService = require('../services/voiceMeetingService');
const speechService = require('../services/speechService');
const aiDoubtService = require('../services/aiDoubtService');
const MeetingSession = require('../models/MeetingSession');

function buildResponse(success, data, error, statusCode = 200) {
    const response = { success };
    if (success) {
        response.data = data;
    } else {
        response.error = error || 'An error occurred';
    }
    return statusCode === 200 ? response : { ...response, status: statusCode };
}

router.get('/overview', async (req, res) => {
    try {
        const members = await Member.find().exec();
        const progress = await Progress.find().exec();
        const attendance = await Attendance.find().exec();
        const announcements = await Announcement.find().exec();
        const jobs = getJobs();

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const totalPoints = members.reduce((sum, m) => sum + (m.xp || 0), 0);
        const activeMembers = members.filter(m => m.lastActiveDate && new Date(m.lastActiveDate) >= oneDayAgo).length;
        const todayProgress = progress.filter(p => new Date(p.date) >= todayStart).length;
        const todayAttendance = attendance.filter(a => new Date(a.date) >= todayStart).length;
        const scheduledTasks = jobs.filter(j => j.enabled).length;
        const pendingReminders = announcements.filter(a => a.status === 'scheduled').length;

        const botStatus = {
            online: client.isReady(),
            user: client.user ? client.user.tag : null,
            guilds: client.guilds.cache.size,
            uptime: client.uptime || null,
            ping: client.ws.ping,
        };

        const recentActivity = [];
        const sortedProgress = [...progress].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        for (const p of sortedProgress) {
            const member = await Member.findOne({ userId: p.userId });
            recentActivity.push({
                type: 'progress',
                user: member ? member.name : p.userId,
                action: 'submitted progress',
                time: p.date,
                status: 'success',
            });
        }

        const sortedAttendance = [...attendance].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        for (const a of sortedAttendance) {
            const member = await Member.findOne({ memberId: a.memberId });
            recentActivity.push({
                type: 'attendance',
                user: member ? member.name : a.memberId,
                action: `marked ${a.status}`,
                time: a.date,
                status: 'success',
            });
        }

        recentActivity.sort((a, b) => new Date(b.time) - new Date(a.time));
        const limitedActivity = recentActivity.slice(0, 10);

        res.json({
            stats: {
                totalMembers: members.length,
                activeMembers,
                todayProgress,
                todayAttendance,
                totalPoints,
                scheduledTasks,
                pendingReminders,
            },
            botStatus,
            recentActivity: limitedActivity,
        });
    } catch (error) {
        console.error('Error fetching overview:', error);
        res.status(500).json({ error: 'Failed to load dashboard overview' });
    }
});

router.get('/members', async (req, res) => {
    try {
        const { search, role, sort = 'xp', order = 'desc', page = 1, limit = 20 } = req.query;
        let members = await Member.find().exec();

        if (search) {
            const lowerSearch = search.toLowerCase();
            members = members.filter(
                m => (m.name && m.name.toLowerCase().includes(lowerSearch)) || (m.userId && m.userId.includes(search))
            );
        }

        if (role) {
            members = members.filter(m => m.role === role);
        }

        const sortDirection = order === 'asc' ? 1 : -1;
        members.sort((a, b) => {
            const aVal = a[sort] || 0;
            const bVal = b[sort] || 0;
            if (typeof aVal === 'string') {
                return sortDirection * aVal.localeCompare(bVal);
            }
            return sortDirection * (aVal - bVal);
        });

        const total = members.length;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const start = (pageNum - 1) * limitNum;
        const paginatedMembers = members.slice(start, start + limitNum);

        res.json({
            members: paginatedMembers,
            pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
        });
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ error: 'Failed to load members' });
    }
});

router.post('/members', async (req, res) => {
    try {
        const { userId, name, role = 'beginner', xp = 0 } = req.body;
        if (!userId || !name) {
            return res.status(400).json({ error: 'User ID and Name are required' });
        }

        const existing = await Member.findOne({ userId });
        if (existing) {
            return res.status(400).json({ error: 'A member with this User ID already exists' });
        }

        const member = new Member({
            userId,
            name,
            role,
            xp: Number(xp) || 0,
            joinDate: new Date(),
            activityScore: 0,
            streak: 0,
            lastActiveDate: new Date(),
            completedTasks: [],
        });
        await member.save();

        res.status(201).json({ member, message: 'Member created successfully' });
    } catch (error) {
        console.error('Error creating member:', error);
        res.status(500).json({ error: 'Failed to create member' });
    }
});

router.get('/members/:id', async (req, res) => {
    try {
        const member = await Member.findOne({ userId: req.params.id });
        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        const memberProgress = await Progress.find({ userId: member.userId }).exec();
        const memberAttendance = await Attendance.find({ memberId: member.userId }).exec();

        const sortedMembers = await Member.find().sort({ xp: -1 }).exec();
        const rank = sortedMembers.findIndex(m => m.userId === member.userId) + 1;

        res.json({
            member,
            progress: memberProgress,
            attendance: memberAttendance,
            rank: rank > 0 ? rank : null,
        });
    } catch (error) {
        console.error('Error fetching member:', error);
        res.status(500).json({ error: 'Failed to load member details' });
    }
});

router.put('/members/:id', async (req, res) => {
    try {
        const member = await Member.findOne({ userId: req.params.id });
        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        const allowedFields = ['name', 'role', 'xp', 'activityScore', 'streak'];
        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        Object.assign(member, updates);
        await member.save();

        res.json({ member, message: 'Member updated successfully' });
    } catch (error) {
        console.error('Error updating member:', error);
        res.status(500).json({ error: 'Failed to update member' });
    }
});

router.delete('/members/:id', async (req, res) => {
    try {
        const member = await Member.findOneAndDelete({ userId: req.params.id });
        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }
        res.json({ success: true, message: 'Member deleted successfully' });
    } catch (error) {
        console.error('Error deleting member:', error);
        res.status(500).json({ error: 'Failed to delete member' });
    }
});

router.get('/progress', async (req, res) => {
    try {
        const { userId, date, category, page = 1, limit = 20 } = req.query;
        let progress = await Progress.find().exec();

        if (userId) {
            progress = progress.filter(p => p.userId === userId);
        }
        if (date) {
            const targetDate = new Date(date);
            const nextDay = new Date(targetDate);
            nextDay.setDate(nextDay.getDate() + 1);
            progress = progress.filter(p => {
                const pDate = new Date(p.date);
                return pDate >= targetDate && pDate < nextDay;
            });
        }

        const total = progress.length;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const start = (pageNum - 1) * limitNum;
        const paginatedProgress = progress.slice(start, start + limitNum);

        const enrichedProgress = await Promise.all(
            paginatedProgress.map(async p => {
                const member = await Member.findOne({ userId: p.userId });
                return {
                    ...p,
                    memberName: member ? member.name : p.userId,
                };
            })
        );

        res.json({
            progress: enrichedProgress,
            pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
        });
    } catch (error) {
        console.error('Error fetching progress:', error);
        res.status(500).json({ error: 'Failed to load progress' });
    }
});

router.post('/progress', async (req, res) => {
    try {
        const { userId, text, date } = req.body;
        if (!userId || !text) {
            return res.status(400).json({ error: 'User ID and text are required' });
        }

        const newProgress = new Progress({
            userId,
            text,
            date: date ? new Date(date) : new Date(),
        });
        await newProgress.save();

        const member = await Member.findOne({ userId });
        if (member) {
            member.lastActiveDate = new Date();
            member.xp = (member.xp || 0) + 10;
            member.activityScore = (member.activityScore || 0) + 1;
            member.completedTasks = Array.isArray(member.completedTasks) ? member.completedTasks : [];
            member.completedTasks.push({
                taskName: 'Progress update (via dashboard)',
                completedDate: new Date(),
                pointsEarned: 10,
            });
            await member.save();
        }

        res.status(201).json({ progress: newProgress, message: 'Progress added successfully' });
    } catch (error) {
        console.error('Error adding progress:', error);
        res.status(500).json({ error: 'Failed to add progress' });
    }
});

router.put('/progress/:id', async (req, res) => {
    try {
        const progress = await Progress.findOne({ _id: req.params.id });
        if (!progress) {
            return res.status(404).json({ error: 'Progress not found' });
        }

        if (req.body.text) progress.text = req.body.text;
        if (req.body.date) progress.date = new Date(req.body.date);

        await progress.save();
        res.json({ progress, message: 'Progress updated successfully' });
    } catch (error) {
        console.error('Error updating progress:', error);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

router.delete('/progress/:id', async (req, res) => {
    try {
        const progress = await Progress.findOneAndDelete({ _id: req.params.id });
        if (!progress) {
            return res.status(404).json({ error: 'Progress not found' });
        }
        res.json({ success: true, message: 'Progress deleted successfully' });
    } catch (error) {
        console.error('Error deleting progress:', error);
        res.status(500).json({ error: 'Failed to delete progress' });
    }
});

router.get('/attendance', async (req, res) => {
    try {
        const { memberId, date, meetingName, page = 1, limit = 50 } = req.query;
        let attendance = await Attendance.find().exec();

        if (memberId) {
            attendance = attendance.filter(a => a.memberId === memberId);
        }
        if (date) {
            const targetDate = new Date(date);
            const nextDay = new Date(targetDate);
            nextDay.setDate(nextDay.getDate() + 1);
            attendance = attendance.filter(a => {
                const aDate = new Date(a.date);
                return aDate >= targetDate && aDate < nextDay;
            });
        }
        if (meetingName) {
            attendance = attendance.filter(a => a.meetingName === meetingName);
        }

        const total = attendance.length;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const start = (pageNum - 1) * limitNum;
        const paginatedAttendance = attendance.slice(start, start + limitNum);

        const enrichedAttendance = await Promise.all(
            paginatedAttendance.map(async a => {
                const member = await Member.findOne({ userId: a.memberId });
                return {
                    ...a,
                    memberName: member ? member.name : a.memberId,
                };
            })
        );

        res.json({
            attendance: enrichedAttendance,
            pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
        });
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ error: 'Failed to load attendance' });
    }
});

router.post('/attendance', async (req, res) => {
    try {
        const { memberId, status, meetingName, date, notes } = req.body;
        if (!memberId || !status) {
            return res.status(400).json({ error: 'Member ID and status are required' });
        }

        const member = await Member.findOne({ userId: memberId });
        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        const existing = await Attendance.findOne({ memberId, date: date ? new Date(date) : new Date() });
        if (existing) {
            existing.status = status;
            existing.checkInTime = status === 'present' ? new Date() : null;
            existing.notes = notes || existing.notes;
            await existing.save();
            return res.json({ attendance: existing, message: 'Attendance updated successfully' });
        }

        const newAttendance = new Attendance({
            memberId,
            status,
            meetingName: meetingName || 'Daily Meeting',
            date: date ? new Date(date) : new Date(),
            checkInTime: status === 'present' ? new Date() : null,
            notes: notes || '',
        });
        await newAttendance.save();

        res.status(201).json({ attendance: newAttendance, message: 'Attendance recorded successfully' });
    } catch (error) {
        console.error('Error recording attendance:', error);
        res.status(500).json({ error: 'Failed to record attendance' });
    }
});

router.put('/attendance/:id', async (req, res) => {
    try {
        const attendance = await Attendance.findOne({ _id: req.params.id });
        if (!attendance) {
            return res.status(404).json({ error: 'Attendance record not found' });
        }

        const allowedFields = ['status', 'meetingName', 'notes'];
        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }
        if (updates.status === 'present') {
            updates.checkInTime = new Date();
        }

        Object.assign(attendance, updates);
        await attendance.save();

        res.json({ attendance, message: 'Attendance updated successfully' });
    } catch (error) {
        console.error('Error updating attendance:', error);
        res.status(500).json({ error: 'Failed to update attendance' });
    }
});

router.delete('/attendance/:id', async (req, res) => {
    try {
        const attendance = await Attendance.findOneAndDelete({ _id: req.params.id });
        if (!attendance) {
            return res.status(404).json({ error: 'Attendance record not found' });
        }
        res.json({ success: true, message: 'Attendance deleted successfully' });
    } catch (error) {
        console.error('Error deleting attendance:', error);
        res.status(500).json({ error: 'Failed to delete attendance' });
    }
});

router.get('/leaderboard', async (req, res) => {
    try {
        const { period = 'all' } = req.query;
        let members = await Member.find().exec();

        const now = new Date();
        let filteredMembers = members;

        if (period === 'today') {
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            filteredMembers = members.filter(m => m.lastActiveDate && new Date(m.lastActiveDate) >= todayStart);
        } else if (period === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filteredMembers = members.filter(m => m.lastActiveDate && new Date(m.lastActiveDate) >= weekAgo);
        } else if (period === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            filteredMembers = members.filter(m => m.lastActiveDate && new Date(m.lastActiveDate) >= monthAgo);
        }

        filteredMembers.sort((a, b) => (b.xp || 0) - (a.xp || 0));

        const leaderboard = filteredMembers.map((m, index) => ({
            rank: index + 1,
            userId: m.userId,
            name: m.name,
            xp: m.xp || 0,
            activityScore: m.activityScore || 0,
            streak: m.streak || 0,
            role: m.role,
        }));

        res.json({ leaderboard, period });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to load leaderboard' });
    }
});

router.get('/announcements', async (req, res) => {
    try {
        const announcements = await Announcement.find().exec();
        res.json({ announcements });
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ error: 'Failed to load announcements' });
    }
});

router.post('/announcements', async (req, res) => {
    try {
        const { title, message, channelId, scheduledAt, mentionRole, enableNotification } = req.body;
        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        const announcement = new Announcement({
            title,
            message,
            channelId: channelId || '',
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            createdBy: 'dashboard-admin',
            status: scheduledAt ? 'scheduled' : 'draft',
            mentionRole: mentionRole || null,
            enableNotification: enableNotification ?? true,
        });
        await announcement.save();

        res.status(201).json({ announcement, message: 'Announcement created successfully' });
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
});

router.put('/announcements/:id', async (req, res) => {
    try {
        const announcement = await Announcement.findOne({ _id: req.params.id });
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        const allowedFields = ['title', 'message', 'channelId', 'scheduledAt', 'mentionRole', 'enableNotification', 'status'];
        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = field === 'scheduledAt' ? new Date(req.body[field]) : req.body[field];
            }
        }

        Object.assign(announcement, updates);
        await announcement.save();

        res.json({ announcement, message: 'Announcement updated successfully' });
    } catch (error) {
        console.error('Error updating announcement:', error);
        res.status(500).json({ error: 'Failed to update announcement' });
    }
});

router.delete('/announcements/:id', async (req, res) => {
    try {
        const announcement = await Announcement.findOneAndDelete({ _id: req.params.id });
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        res.json({ success: true, message: 'Announcement deleted successfully' });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

router.post('/announcements/:id/send', async (req, res) => {
    try {
        const announcement = await Announcement.findOne({ _id: req.params.id });
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        const channelId = announcement.channelId || process.env.PROGRESS_CHANNEL_ID;
        if (!channelId) {
            return res.status(400).json({ error: 'No channel configured for announcement' });
        }

        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
            return res.status(404).json({ error: 'Discord channel not found' });
        }

        let content = announcement.message;
        if (announcement.mentionRole) {
            content = `<@&${announcement.mentionRole}> ${content}`;
        }

        await channel.send(content);
        announcement.status = 'sent';
        announcement.sentAt = new Date();
        await announcement.save();

        res.json({ message: 'Announcement sent successfully' });
    } catch (error) {
        console.error('Error sending announcement:', error);
        res.status(500).json({ error: 'Failed to send announcement' });
    }
});

router.get('/scheduler', (req, res) => {
    try {
        const jobs = getJobs();
        res.json({ jobs });
    } catch (error) {
        console.error('Error fetching scheduler:', error);
        res.status(500).json({ error: 'Failed to load scheduler' });
    }
});

router.put('/scheduler/:id', async (req, res) => {
    try {
        const { enabled, cron: cronExpression } = req.body;
        const updates = {};
        if (typeof enabled === 'boolean') updates.enabled = enabled;
        if (cronExpression) updates.cron = cronExpression;

        const updatedJob = updateJob(req.params.id, updates);
        if (!updatedJob) {
            return res.status(404).json({ error: 'Scheduler job not found' });
        }
        res.json({ job: updatedJob, message: 'Scheduler job updated successfully' });
    } catch (error) {
        console.error('Error updating scheduler:', error);
        res.status(500).json({ error: 'Failed to update scheduler' });
    }
});

router.post('/scheduler/:id/run', async (req, res) => {
    try {
        const success = await runJobNow(req.params.id);
        if (!success) {
            return res.status(404).json({ error: 'Scheduler job not found' });
        }
        res.json({ message: 'Job executed successfully' });
    } catch (error) {
        console.error('Error running scheduler job:', error);
        res.status(500).json({ error: 'Failed to run scheduler job' });
    }
});

router.get('/channels', async (req, res) => {
    try {
        if (!client.isReady()) {
            return res.json({ channels: [] });
        }

        const guild = client.guilds.cache.first();
        if (!guild) {
            return res.json({ channels: [] });
        }

        const channels = guild.channels.cache
            .filter(channel => channel.isTextBased() && channel.viewable)
            .map(channel => ({
                id: channel.id,
                name: channel.name,
                type: channel.type,
                category: channel.parent?.name || null,
            }))
            .sort((a, b) => {
                if (a.category && !b.category) return -1;
                if (!a.category && b.category) return 1;
                if (a.category && b.category) {
                    const catCompare = a.category.localeCompare(b.category);
                    if (catCompare !== 0) return catCompare;
                }
                return a.name.localeCompare(b.name);
            });

        res.json({ channels });
    } catch (error) {
        console.error('Error fetching channels:', error);
        res.status(500).json({ error: 'Failed to load channels' });
    }
});

router.get('/settings', async (req, res) => {
    try {
        const { category } = req.query;
        let settings = await Setting.find().exec();

        if (category) {
            settings = settings.filter(s => s.category === category);
        }

        const settingsObj = {};
        for (const setting of settings) {
            try {
                settingsObj[setting.key] = JSON.parse(setting.value);
            } catch {
                settingsObj[setting.key] = setting.value;
            }
        }

        res.json({ settings: settingsObj });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to load settings' });
    }
});

router.put('/settings', async (req, res) => {
    try {
        const { settings } = req.body;
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'Settings object is required' });
        }

        const results = {};
        for (const [key, value] of Object.entries(settings)) {
            let setting = await Setting.findOne({ key });
            if (!setting) {
                setting = new Setting({ key, value: JSON.stringify(value), category: 'general' });
            } else {
                setting.value = JSON.stringify(value);
            }
            await setting.save();
            results[key] = value;
        }

        res.json({ settings: results, message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

router.get('/system/status', async (req, res) => {
    try {
        const supabase = getSupabaseClient();
        let supabaseStatus = 'disconnected';
        if (supabase) {
            try {
                const { error } = await supabase.from('members').select('id').limit(1);
                supabaseStatus = error ? 'error' : 'connected';
            } catch {
                supabaseStatus = 'error';
            }
        }

        let youtubeStatus = 'disconnected';
        if (process.env.YOUTUBE_API_KEY) {
            youtubeStatus = 'configured';
        }

        const waStatus = whatsAppService.getStatus();

        res.json({
            bot: {
                online: client.isReady(),
                user: client.user ? client.user.tag : null,
                uptime: client.uptime,
                ping: client.ws.ping,
                guilds: client.guilds.cache.size,
            },
            supabase: supabaseStatus,
            youtube: youtubeStatus,
            whatsapp: waStatus.status,
            whatsappUser: waStatus.user,
            nodeVersion: process.version,
            memory: process.memoryUsage(),
        });
    } catch (error) {
        console.error('Error fetching system status:', error);
        res.status(500).json({ error: 'Failed to load system status' });
    }
});

router.post('/system/test/:service', async (req, res) => {
    try {
        const { service } = req.params;
        if (service === 'youtube') {
            const hasKey = Boolean(process.env.YOUTUBE_API_KEY);
            return res.json({
                service: 'youtube',
                status: hasKey ? 'connected' : 'unconfigured',
                message: hasKey ? 'YouTube API key is configured' : 'YouTube API key is not configured in .env'
            });
        }
        if (service === 'whatsapp') {
            const wa = whatsAppService.getStatus();
            return res.json({
                service: 'whatsapp',
                status: wa.status,
                message: wa.connected ? `Connected as ${wa.user?.name || wa.user?.phone || 'WhatsApp Bot'}` : (wa.status === 'qr_ready' ? 'QR Code ready to scan' : 'WhatsApp is disconnected')
            });
        }

        if (service === 'supabase') {
            const isConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);
            const client = getSupabaseClient();
            let reachable = false;
            if (client) {
                try {
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500));
                    const { error } = await Promise.race([client.from('members').select('id').limit(1), timeoutPromise]);
                    reachable = !error;
                } catch (e) {
                    reachable = false;
                }
            }
            return res.json({
                service: 'supabase',
                status: reachable ? 'connected' : (isConfigured ? 'fallback' : 'disconnected'),
                message: reachable ? 'Connected to Supabase cloud database' : 'Running on local data fallback storage'
            });
        }
        if (service === 'discord') {
            const ready = client.isReady();
            return res.json({
                service: 'discord',
                status: ready ? 'connected' : 'connecting',
                message: ready ? `Logged in as ${client.user?.tag || 'Bot'}` : 'Connecting to Discord gateway...'
            });
        }
        return res.status(400).json({ error: `Unknown service: ${service}` });
    } catch (error) {
        console.error('Error testing service:', error);
        res.status(500).json({ error: 'Failed to test service' });
    }
});

router.get('/attendance/meetings', async (req, res) => {
    try {
        const attendance = await Attendance.find().exec();
        const meetings = [...new Set(attendance.map(a => a.meetingName))].map(name => ({
            name,
            date: attendance.filter(a => a.meetingName === name)[0]?.date,
            total: attendance.filter(a => a.meetingName === name).length,
            present: attendance.filter(a => a.meetingName === name && a.status === 'present').length,
            absent: attendance.filter(a => a.meetingName === name && a.status === 'absent').length,
        }));
        res.json({ meetings });
    } catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({ error: 'Failed to load meetings' });
    }
});

// --- WhatsApp Integration Endpoints ---

router.get('/whatsapp/status', async (req, res) => {
    try {
        const status = whatsAppService.getStatus();
        const defaultGroupSetting = await Setting.findOne({ key: 'whatsapp_default_group' });
        const reminderTemplateSetting = await Setting.findOne({ key: 'whatsapp_reminder_template' });

        let defaultGroup = process.env.WHATSAPP_DEFAULT_GROUP_JID || '';
        if (defaultGroupSetting?.value) {
            try { defaultGroup = JSON.parse(defaultGroupSetting.value); } catch { defaultGroup = defaultGroupSetting.value; }
        }

        let reminderTemplate = '🔔 *Reminder:* Cybersecurity daily session starts at 7:00 PM! Please join on time.';
        if (reminderTemplateSetting?.value) {
            try { reminderTemplate = JSON.parse(reminderTemplateSetting.value); } catch { reminderTemplate = reminderTemplateSetting.value; }
        }

        res.json({
            ...status,
            config: {
                defaultGroup,
                reminderTemplate,
            }
        });
    } catch (error) {
        console.error('Error getting WhatsApp status:', error);
        res.status(500).json({ error: 'Failed to get WhatsApp status' });
    }
});

router.post('/whatsapp/connect', async (req, res) => {
    try {
        await whatsAppService.init(true);
        res.json({ success: true, message: 'WhatsApp connection initiated', status: whatsAppService.getStatus() });
    } catch (error) {
        console.error('Error connecting WhatsApp:', error);
        res.status(500).json({ error: error.message || 'Failed to initialize WhatsApp' });
    }
});

router.post('/whatsapp/disconnect', async (req, res) => {
    try {
        const result = await whatsAppService.disconnect();
        res.json(result);
    } catch (error) {
        console.error('Error disconnecting WhatsApp:', error);
        res.status(500).json({ error: error.message || 'Failed to disconnect WhatsApp' });
    }
});

router.get('/whatsapp/groups', async (req, res) => {
    try {
        const force = req.query.refresh === 'true';
        const groups = await whatsAppService.fetchGroups(force);
        res.json({ groups });
    } catch (error) {
        console.error('Error fetching WhatsApp groups:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch WhatsApp groups' });
    }
});

router.post('/whatsapp/send', async (req, res) => {
    try {
        const { groupJid, message } = req.body;
        if (!groupJid || !message) {
            return res.status(400).json({ error: 'Group JID and message are required' });
        }

        const result = await whatsAppService.sendGroupReminder(groupJid, message);
        res.json({ success: true, message: 'Reminder sent to WhatsApp group successfully!', data: result });
    } catch (error) {
        console.error('Error sending WhatsApp reminder:', error);
        res.status(500).json({ error: error.message || 'Failed to send WhatsApp message' });
    }
});

router.post('/whatsapp/settings', async (req, res) => {
    try {
        const { defaultGroup, reminderTemplate } = req.body;

        if (defaultGroup !== undefined) {
            let setting = await Setting.findOne({ key: 'whatsapp_default_group' });
            if (!setting) {
                setting = new Setting({ key: 'whatsapp_default_group', value: JSON.stringify(defaultGroup), category: 'whatsapp' });
            } else {
                setting.value = JSON.stringify(defaultGroup);
            }
            await setting.save();
        }

        if (reminderTemplate !== undefined) {
            let setting = await Setting.findOne({ key: 'whatsapp_reminder_template' });
            if (!setting) {
                setting = new Setting({ key: 'whatsapp_reminder_template', value: JSON.stringify(reminderTemplate), category: 'whatsapp' });
            } else {
                setting.value = JSON.stringify(reminderTemplate);
            }
            await setting.save();
        }

        res.json({ success: true, message: 'WhatsApp reminder settings updated successfully!' });
    } catch (error) {
        console.error('Error saving WhatsApp settings:', error);
        res.status(500).json({ error: error.message || 'Failed to save WhatsApp settings' });
    }
});

// ==========================================
// AI Voice Meeting Routes
// ==========================================

router.get('/meeting/status', (req, res) => {
    try {
        const status = voiceMeetingService.getStatus();
        res.json({ success: true, ...status });
    } catch (error) {
        console.error('Error fetching meeting status:', error);
        res.status(500).json({ error: error.message || 'Failed to get meeting status' });
    }
});

router.get('/meeting/channels', (req, res) => {
    try {
        const channels = voiceMeetingService.getAvailableVoiceChannels(req.query.guildId);
        res.json({ success: true, channels });
    } catch (error) {
        console.error('Error fetching voice channels:', error);
        res.status(500).json({ error: error.message || 'Failed to get voice channels' });
    }
});

router.get('/meeting/voices', (req, res) => {
    try {
        res.json({
            success: true,
            voices: speechService.AVAILABLE_VOICES,
            currentVoice: process.env.TTS_VOICE || 'en-US-ChristopherNeural',
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/meeting/join', async (req, res) => {
    try {
        const { channelId, guildId, textChannelId, voice } = req.body;
        if (!channelId) {
            return res.status(400).json({ error: 'channelId is required' });
        }

        const result = await voiceMeetingService.joinMeeting({
            channelId,
            guildId,
            textChannelId,
            voice,
        });

        res.json(result);
    } catch (error) {
        console.error('Error joining meeting:', error);
        res.status(500).json({ error: error.message || 'Failed to join voice meeting' });
    }
});

router.post('/meeting/leave', async (req, res) => {
    try {
        const result = await voiceMeetingService.leaveMeeting();
        res.json(result);
    } catch (error) {
        console.error('Error leaving meeting:', error);
        res.status(500).json({ error: error.message || 'Failed to leave voice meeting' });
    }
});

router.post('/meeting/ask', async (req, res) => {
    try {
        const { question } = req.body;
        if (!question || !question.trim()) {
            return res.status(400).json({ error: 'Question is required' });
        }

        let result;
        if (voiceMeetingService.isActive()) {
            result = await voiceMeetingService.askDoubt(question, 'Web Dashboard');
        } else {
            // If not currently in a voice channel, still resolve the doubt and return the answer
            result = await aiDoubtService.solveDoubt(question);
        }

        const chosenVoice = result.isTamil ? 'ta-IN-PallaviNeural' : (process.env.TTS_VOICE || 'en-US-ChristopherNeural');
        const audioUrl = `/api/dashboard/meeting/tts-audio?text=${encodeURIComponent(result.spokenAnswer)}&voice=${encodeURIComponent(chosenVoice)}`;

        return res.json({
            success: true,
            spokenInDiscord: voiceMeetingService.isActive(),
            audioUrl,
            ...result,
        });
    } catch (error) {
        console.error('Error answering doubt:', error);
        res.status(500).json({ error: error.message || 'Failed to solve doubt' });
    }
});

router.get('/meeting/tts-audio', async (req, res) => {
    try {
        const { text, voice } = req.query;
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Text query parameter is required' });
        }
        const synth = await speechService.synthesizeSpeechToFile(text, { voice });
        res.setHeader('Content-Type', 'audio/mpeg');
        const stream = fs.createReadStream(synth.filePath);
        stream.pipe(res);
        stream.on('close', () => {
            speechService.cleanupTempAudio(synth.filePath);
        });
    } catch (err) {
        console.error('[Dashboard] TTS audio stream error:', err);
        res.status(500).json({ error: 'Failed to generate audio stream' });
    }
});

router.post('/meeting/test-tts', async (req, res) => {
    try {
        const { text, voice } = req.body;
        const testText = text || 'Testing Cyber Bot text to speech voice synthesis.';
        const result = await speechService.synthesizeSpeechToFile(testText, { voice });
        // Clean up test file immediately
        speechService.cleanupTempAudio(result.filePath);
        res.json({ success: true, message: `TTS generated successfully using ${result.engine} with voice ${result.voice}` });
    } catch (error) {
        console.error('TTS test failed:', error);
        res.status(500).json({ error: error.message || 'TTS synthesis failed' });
    }
});

router.get('/meeting/history', async (req, res) => {
    try {
        const sessions = await MeetingSession.find().exec();
        sessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        res.json({ success: true, sessions });
    } catch (error) {
        console.error('Error fetching meeting history:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch meeting history' });
    }
});

module.exports = router;

