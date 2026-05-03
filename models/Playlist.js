const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
    url: { type: String, required: true },
    channelId: { type: String, required: true },
    playlistId: { type: String, required: true },
    title: { type: String, required: true },
    videos: [{
        videoId: String,
        title: String,
        description: String,
        publishedAt: Date,
    }],
    currentIndex: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
    addedBy: { type: String, required: true },
});

module.exports = mongoose.model('Playlist', playlistSchema);
