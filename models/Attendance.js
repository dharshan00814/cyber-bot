const {
    getSupabaseClient,
    createQuery,
    fetchTableRows,
    saveTableRow,
    deleteTableRow,
    matchesFilter,
    normalizeDate,
} = require('../utils/supabaseStore');

class Attendance {
    constructor(data = {}) {
        this._id = data.id || data._id || null;
        this.memberId = data.memberId || data.member_id;
        this.date = normalizeDate(data.date) || new Date();
        this.status = data.status || 'present';
        this.meetingName = data.meetingName || data.meeting_name || 'Daily Meeting';
        this.checkInTime = normalizeDate(data.checkInTime || data.check_in_time);
        this.notes = data.notes || '';
    }

    static fromRow(row) {
        return new Attendance({
            ...row,
            id: row.id || row._id,
            memberId: row.member_id || row.memberId,
            date: row.date,
            status: row.status,
            meetingName: row.meeting_name || row.meetingName,
            checkInTime: row.check_in_time || row.checkInTime,
            notes: row.notes,
        });
    }

    toRow() {
        return {
            member_id: this.memberId,
            date: this.date ? this.date.toISOString() : new Date().toISOString(),
            status: this.status,
            meeting_name: this.meetingName,
            check_in_time: this.checkInTime ? this.checkInTime.toISOString() : null,
            notes: this.notes,
        };
    }

    async save() {
        const row = this.toRow();
        const savedData = await saveTableRow('attendance', row, this._id);
        Object.assign(this, Attendance.fromRow(savedData));
        return this;
    }

    static find(filter = {}) {
        return createQuery(async () => {
            const rows = await fetchTableRows('attendance');
            return rows.filter(row => matchesFilter(row, filter)).map(Attendance.fromRow);
        });
    }

    static async findOne(filter = {}) {
        const records = await Attendance.find(filter).limit(1);
        return records[0] || null;
    }

    static async findOneAndDelete(filter = {}) {
        const record = await Attendance.findOne(filter);

        if (!record) {
            return null;
        }

        await deleteTableRow('attendance', record._id);
        return record;
    }

    static async findOneAndUpdate(filter = {}, update = {}, options = {}) {
        const record = await Attendance.findOne(filter);

        if (!record) {
            return null;
        }

        const updateData = update.$set || update;
        Object.assign(record, updateData);
        await record.save();
        return options.new === false ? null : record;
    }
}

module.exports = Attendance;
