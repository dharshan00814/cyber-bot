const cron = require('node-cron');
const Playlist = require('../models/Playlist');
const Member = require('../models/Member');

function startScheduler(client) {
    // Schedule a task every day at 6 PM (18:00) server time
    cron.schedule('0 18 * * *', async () => {
        console.log('Running daily scheduler at 6 PM...');
        try {
            await processPlaylists(client);
            // Points are now awarded only when members post progress updates (via messageCreate event)
            // await awardDailyPoints(client);
            await resetDailyTasks(client);
        } catch (error) {
            console.error('Error in daily scheduler:', error);
        }
    });
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
