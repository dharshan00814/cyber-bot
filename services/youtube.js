const { google } = require('googleapis');

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY,
});

async function getPlaylistVideos(playlistId) {
    try {
        let videos = [];
        let nextPageToken = null;

        do {
            const response = await youtube.playlistItems.list({
                part: 'snippet',
                playlistId: playlistId,
                maxResults: 50,
                pageToken: nextPageToken,
            });

            const items = response.data.items.map(item => ({
                videoId: item.snippet.resourceId.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                publishedAt: item.snippet.publishedAt,
            }));

            videos = videos.concat(items);
            nextPageToken = response.data.nextPageToken;
        } while (nextPageToken);

        return videos;
    } catch (error) {
        console.error('Error fetching playlist videos:', error);
        throw error;
    }
}

async function getPlaylistInfo(playlistId) {
    try {
        const response = await youtube.playlists.list({
            part: 'snippet',
            id: playlistId,
        });

        if (!response.data.items || response.data.items.length === 0) {
            throw new Error('Playlist not found');
        }

        const snippet = response.data.items[0].snippet;
        return {
            title: snippet.title,
            channelId: snippet.channelId,
        };
    } catch (error) {
        console.error('Error fetching playlist info:', error);
        throw error;
    }
}

module.exports = { getPlaylistVideos, getPlaylistInfo };
