const {
    getSupabaseClient,
    createQuery,
    fetchTableRows,
    matchesFilter,
    normalizeDate,
} = require('../utils/supabaseStore');

class Playlist {
    constructor(data = {}) {
        this._id = data.id || data._id || null;
        this.url = data.url;
        this.channelId = data.channelId;
        this.playlistId = data.playlistId;
        this.title = data.title;
        this.videos = Array.isArray(data.videos) ? data.videos : [];
        this.currentIndex = data.currentIndex ?? 0;
        this.status = data.status || 'active';
        this.addedBy = data.addedBy;
    }

    static fromRow(row) {
        return new Playlist({
            ...row,
            id: row.id,
            channelId: row.channel_id || row.channelId,
            playlistId: row.playlist_id || row.playlistId,
            currentIndex: row.current_index ?? row.currentIndex,
            addedBy: row.added_by || row.addedBy,
        });
    }

    toRow() {
        return {
            url: this.url,
            channel_id: this.channelId,
            playlist_id: this.playlistId,
            title: this.title,
            videos: this.videos.map(video => ({
                videoId: video.videoId,
                title: video.title,
                description: video.description,
                publishedAt: normalizeDate(video.publishedAt)?.toISOString() || null,
            })),
            current_index: this.currentIndex,
            status: this.status,
            added_by: this.addedBy,
        };
    }

    async save() {
        const client = getSupabaseClient();

        if (!client) {
            throw new Error('Supabase is not configured');
        }

        const row = this.toRow();
        let response;

        if (this._id) {
            response = await client.from('playlists').update(row).eq('id', this._id).select('*').single();
        } else {
            response = await client.from('playlists').insert(row).select('*').single();
        }

        const { data, error } = response;

        if (error) {
            throw error;
        }

        Object.assign(this, Playlist.fromRow(data));
        return this;
    }

    static find(filter = {}) {
        return createQuery(async () => {
            const rows = await fetchTableRows('playlists');
            return rows.filter(row => matchesFilter(row, filter)).map(Playlist.fromRow);
        });
    }

    static async findOne(filter = {}) {
        const records = await Playlist.find(filter).limit(1);
        return records[0] || null;
    }

    static async findOneAndDelete(filter = {}) {
        const playlist = await Playlist.findOne(filter);

        if (!playlist) {
            return null;
        }

        const client = getSupabaseClient();
        const { error } = await client.from('playlists').delete().eq('id', playlist._id);

        if (error) {
            throw error;
        }

        return playlist;
    }

    static async findOneAndUpdate(filter = {}, update = {}, options = {}) {
        const playlist = await Playlist.findOne(filter);

        if (!playlist) {
            return null;
        }

        const updateData = update.$set || update;
        Object.assign(playlist, updateData);
        await playlist.save();
        return options.new === false ? null : playlist;
    }
}

module.exports = Playlist;
