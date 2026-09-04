const {
    createQuery,
    fetchTableRows,
    saveTableRow,
    deleteTableRow,
    matchesFilter,
    normalizeDate,
} = require('../utils/supabaseStore');

class MeetingSession {
    constructor(data = {}) {
        this._id = data.id || data._id || null;
        this.guildId = data.guildId || data.guild_id || null;
        this.channelId = data.channelId || data.channel_id || null;
        this.channelName = data.channelName || data.channel_name || 'Meeting Voice Channel';
        this.startTime = normalizeDate(data.startTime || data.start_time) || new Date();
        this.endTime = normalizeDate(data.endTime || data.end_time) || null;
        this.durationSeconds = data.durationSeconds || data.duration_seconds || 0;
        this.participants = Array.isArray(data.participants) ? data.participants : (typeof data.participants === 'string' ? JSON.parse(data.participants || '[]') : []);
        this.transcripts = Array.isArray(data.transcripts) ? data.transcripts : (typeof data.transcripts === 'string' ? JSON.parse(data.transcripts || '[]') : []);
        this.status = data.status || 'active'; // 'active' | 'ended'
        this.createdAt = normalizeDate(data.createdAt || data.created_at) || new Date();
    }

    static fromRow(row) {
        return new MeetingSession({
            ...row,
            id: row.id || row._id,
            guildId: row.guild_id || row.guildId,
            channelId: row.channel_id || row.channelId,
            channelName: row.channel_name || row.channelName,
            startTime: row.start_time || row.startTime,
            endTime: row.end_time || row.endTime,
            durationSeconds: row.duration_seconds || row.durationSeconds,
            participants: row.participants,
            transcripts: row.transcripts,
            status: row.status,
            createdAt: row.created_at || row.createdAt,
        });
    }

    toRow() {
        return {
            guild_id: this.guildId,
            channel_id: this.channelId,
            channel_name: this.channelName,
            start_time: this.startTime ? this.startTime.toISOString() : new Date().toISOString(),
            end_time: this.endTime ? this.endTime.toISOString() : null,
            duration_seconds: this.durationSeconds,
            participants: this.participants,
            transcripts: this.transcripts,
            status: this.status,
            created_at: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
        };
    }

    async save() {
        const row = this.toRow();
        const savedData = await saveTableRow('meeting_sessions', row, this._id);
        Object.assign(this, MeetingSession.fromRow(savedData));
        return this;
    }

    static find(filter = {}) {
        return createQuery(async () => {
            const rows = await fetchTableRows('meeting_sessions');
            return rows.filter(row => matchesFilter(row, filter)).map(MeetingSession.fromRow);
        });
    }

    static async findOne(filter = {}) {
        const records = await MeetingSession.find(filter).limit(1);
        return records[0] || null;
    }

    static async findOneAndDelete(filter = {}) {
        const record = await MeetingSession.findOne(filter);
        if (!record) return null;
        await deleteTableRow('meeting_sessions', record._id);
        return record;
    }

    static async findOneAndUpdate(filter = {}, update = {}, options = {}) {
        const record = await MeetingSession.findOne(filter);
        if (!record) return null;
        const updateData = update.$set || update;
        Object.assign(record, updateData);
        await record.save();
        return options.new === false ? null : record;
    }
}

module.exports = MeetingSession;
