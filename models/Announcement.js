const {
    getSupabaseClient,
    createQuery,
    fetchTableRows,
    saveTableRow,
    deleteTableRow,
    matchesFilter,
    normalizeDate,
} = require('../utils/supabaseStore');

class Announcement {
    constructor(data = {}) {
        this._id = data.id || data._id || null;
        this.title = data.title;
        this.message = data.message;
        this.channelId = data.channelId || data.channel_id;
        this.scheduledAt = normalizeDate(data.scheduledAt || data.scheduled_at);
        this.sentAt = normalizeDate(data.sentAt || data.sent_at);
        this.createdBy = data.createdBy || data.created_by;
        this.status = data.status || 'draft';
        this.mentionRole = data.mentionRole || data.mention_role || null;
        this.enableNotification = data.enableNotification ?? data.enable_notification ?? true;
    }

    static fromRow(row) {
        return new Announcement({
            ...row,
            id: row.id || row._id,
            channelId: row.channel_id || row.channelId,
            scheduledAt: row.scheduled_at || row.scheduledAt,
            sentAt: row.sent_at || row.sentAt,
            createdBy: row.created_by || row.createdBy,
            status: row.status,
            mentionRole: row.mention_role || row.mentionRole,
            enableNotification: row.enable_notification ?? row.enableNotification,
        });
    }

    toRow() {
        return {
            title: this.title,
            message: this.message,
            channel_id: this.channelId,
            scheduled_at: this.scheduledAt ? this.scheduledAt.toISOString() : null,
            sent_at: this.sentAt ? this.sentAt.toISOString() : null,
            created_by: this.createdBy,
            status: this.status,
            mention_role: this.mentionRole,
            enable_notification: this.enableNotification,
        };
    }

    async save() {
        const row = this.toRow();
        const savedData = await saveTableRow('announcements', row, this._id);
        Object.assign(this, Announcement.fromRow(savedData));
        return this;
    }

    static find(filter = {}) {
        return createQuery(async () => {
            const rows = await fetchTableRows('announcements');
            return rows.filter(row => matchesFilter(row, filter)).map(Announcement.fromRow);
        });
    }

    static async findOne(filter = {}) {
        const records = await Announcement.find(filter).limit(1);
        return records[0] || null;
    }

    static async findOneAndDelete(filter = {}) {
        const record = await Announcement.findOne(filter);

        if (!record) {
            return null;
        }

        await deleteTableRow('announcements', record._id);
        return record;
    }

    static async findOneAndUpdate(filter = {}, update = {}, options = {}) {
        const record = await Announcement.findOne(filter);

        if (!record) {
            return null;
        }

        const updateData = update.$set || update;
        Object.assign(record, updateData);
        await record.save();
        return options.new === false ? null : record;
    }
}

module.exports = Announcement;
