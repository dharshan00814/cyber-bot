const cron = require('node-cron');
const Playlist = require('../models/Playlist');
const Member = require('../models/Member');

function startScheduler(client) {
    // Schedule a task every day at 6 PM (18:00) server time
    cron.schedule('0 18 * * *', async () => {
        console.log('Running daily scheduler at 6 PM...');
        try {
            await processPlaylists(client);
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
    await Member.updateMany(
        { lastActiveDate: { $lt: oneDayAgo } },
        { $set: { streak: 0 } }
    );
    console.log('Daily tasks and streaks evaluated.');
}

module.exports = { startScheduler };
