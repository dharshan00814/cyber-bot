const cron = require('node-cron');
const Playlist = require('../models/Playlist');
const Member = require('../models/Member');
const Setting = require('../models/Settings');
const { registerJob, recordJobExecution } = require('../utils/schedulerRegistry');
const whatsAppService = require('./whatsapp');

function startScheduler(client) {
    registerJob(
        'daily-playlist',
        'Daily Playlist Processing',
        '0 18 * * *',
        async () => {
            console.log('Running daily playlist scheduler at 6 PM...');
            try {
                await processPlaylists(client);
                await resetDailyTasks(client);
                recordJobExecution('daily-playlist', 'success');
            } catch (error) {
                console.error('Error in daily scheduler:', error);
                recordJobExecution('daily-playlist', 'error');
            }
        },
        { start: true }
    );

    registerJob(
        'daily-announcement',
        'Daily Announcement',
        '0 19 * * *',
        async () => {
            console.log('Sending daily announcement at 7 PM...');
            try {
                await sendDailyAnnouncement(client);
                recordJobExecution('daily-announcement', 'success');
            } catch (error) {
                console.error('Error sending daily announcement:', error);
                recordJobExecution('daily-announcement', 'error');
            }
        },
        { start: true }
    );

    registerJob(
        'whatsapp-group-reminder',
        'WhatsApp Group Reminder',
        '45 18 * * *',
        async () => {
            console.log('Running WhatsApp group reminder scheduler at 6:45 PM...');
            try {
                await sendWhatsAppGroupReminder();
                recordJobExecution('whatsapp-group-reminder', 'success');
            } catch (error) {
                console.error('Error in WhatsApp group reminder scheduler:', error);
                recordJobExecution('whatsapp-group-reminder', 'error');
            }
        },
        { start: true }
    );
}

async function sendWhatsAppGroupReminder() {
    let groupJid = process.env.WHATSAPP_DEFAULT_GROUP_JID;
    let reminderText = '🔔 *Reminder:* Cybersecurity daily session starts at 7:00 PM! Please join on time.';

    try {
        const groupSetting = await Setting.findOne({ key: 'whatsapp_default_group' });
        if (groupSetting && groupSetting.value) {
            try {
                groupJid = JSON.parse(groupSetting.value);
            } catch {
                groupJid = groupSetting.value;
            }
        }

        const msgSetting = await Setting.findOne({ key: 'whatsapp_reminder_template' });
        if (msgSetting && msgSetting.value) {
            try {
                reminderText = JSON.parse(msgSetting.value);
            } catch {
                reminderText = msgSetting.value;
            }
        }
    } catch (e) {
        console.warn('[Scheduler] Could not read custom WhatsApp settings, using defaults:', e);
    }

    if (!groupJid) {
        console.log('[Scheduler] No WhatsApp group JID configured. Skipping group reminder.');
        return;
    }

    await whatsAppService.sendGroupReminder(groupJid, reminderText);
}


async function processPlaylists(client) {
    const activePlaylists = await Playlist.find({ status: 'active' });

    for (const playlist of activePlaylists) {
        if (playlist.currentIndex < playlist.videos.length) {
            const video = playlist.videos[playlist.currentIndex];
            const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
            
            // Assume we send this to a specific channel or we fetch the channel id where the bot was requested.
            // For now, we will broadcast to the first available text channel in the guild where the playlist was added.
            // This is a simplistic approach, ideally channelId should be stored. Let's assume channelId in playlist is Discord channelId.
            try {
                const channel = await client.channels.fetch(playlist.channelId);
                if (channel && channel.isTextBased()) {
                    await channel.send(`**Daily Cybersecurity Video!**\nPlaylist: ${playlist.title}\nVideo ${playlist.currentIndex + 1}/${playlist.videos.length}: **${video.title}**\n${videoUrl}`);
                }
                
                playlist.currentIndex += 1;
                
                if (playlist.currentIndex >= playlist.videos.length) {
                    playlist.status = 'completed';
                    if (channel && channel.isTextBased()) {
                        await channel.send(`🎉 **Congratulations!** The playlist **${playlist.title}** has been completed!`);
                    }
                }
                
                await playlist.save();
            } catch (err) {
                console.error(`Could not send message to channel ${playlist.channelId}`, err);
            }
        }
    }
}

async function resetDailyTasks(client) {
    // Optional: Reset streaks for users who didn't participate, etc.
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    try {
        const members = await Member.find().exec();

        for (const m of members) {
            if (!m.lastActiveDate || new Date(m.lastActiveDate) < oneDayAgo) {
                m.streak = 0;
                try { await m.save(); } catch (e) { console.error('Error resetting streak for', m.userId, e); }
            }
        }
    } catch (e) {
        console.error('Error evaluating daily tasks/streaks:', e);
    }
    console.log('Daily tasks and streaks evaluated.');
}

async function sendDailyAnnouncement(client) {
    const ANNOUNCEMENT_CHANNEL_ID = '1497879179360731247';
    const ANNOUNCEMENT_MESSAGE = 'hey cybers "Have a meeting at 7pm';
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
        // Find members who posted progress in the last 24 hours
        const membersWithProgress = await Member.find({
            lastActiveDate: { $gte: oneDayAgo }
        });

        console.log(`Found ${membersWithProgress.length} members with progress today.`);

        // Send alert only to members who posted progress
        for (const member of membersWithProgress) {
            try {
                const user = await client.users.fetch(member.userId);
                if (user) {
                    await user.send(ANNOUNCEMENT_MESSAGE);
                    console.log(`Alert sent to ${user.username} (${member.userId})`);
                }
            } catch (err) {
                console.error(`Error sending alert to member ${member.userId}:`, err);
            }
        }

        if (membersWithProgress.length === 0) {
            console.log('No members with progress today. No alerts sent.');
        }
    } catch (err) {
        console.error('Error in daily announcement:', err);
    }
}

async function awardDailyPoints(client) {
    const TRACK_GUILD_ID = '1497878851693318204';

    try {
        const guild = await client.guilds.fetch(TRACK_GUILD_ID);
        if (!guild) {
            console.log('Guild not found:', TRACK_GUILD_ID);
            return;
        }

        const guildMembers = await guild.members.fetch();

        for (const guildMember of guildMembers.values()) {
            if (guildMember.user?.bot) continue;

            try {
                const userId = guildMember.user.id;
                let member = await Member.findOne({ userId });

                if (member) {
                    member.xp = (member.xp ?? 0) + 10;
                    member.activityScore = (member.activityScore ?? 0) + 1;
                    member.lastActiveDate = new Date();
                    await member.save();
                } else {
                    const newMember = new Member({
                        userId: guildMember.user.id,
                        name: guildMember.user.username,
                        joinDate: new Date(),
                        xp: 10,
                        activityScore: 1,
                        lastActiveDate: new Date(),
                    });
                    await newMember.save();
                }
            } catch (err) {
                console.error('Error awarding daily points to member:', guildMember.user?.id, err);
            }
        }

        console.log(`Daily points awarded for guild ${TRACK_GUILD_ID}`);
    } catch (err) {
        console.error('Could not award daily points for guild', TRACK_GUILD_ID, err);
    }
}

module.exports = { startScheduler, awardDailyPoints };
