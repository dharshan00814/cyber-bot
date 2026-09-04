const {
    getSupabaseClient,
    createQuery,
    fetchTableRows,
    saveTableRow,
    deleteTableRow,
    matchesFilter,
    normalizeDate,
} = require('../utils/supabaseStore');

class Progress {
    constructor(data = {}) {
        this._id = data.id || data._id || null;
        this.userId = data.userId || data.user_id;
        this.date = normalizeDate(data.date) || new Date();
        this.text = data.text;
    }

    static fromRow(row) {
        return new Progress({
            ...row,
            id: row.id || row._id,
            userId: row.user_id || row.userId,
            date: row.date,
            text: row.text,
        });
    }

    toRow() {
        return {
            user_id: this.userId,
            date: this.date ? this.date.toISOString() : new Date().toISOString(),
            text: this.text,
        };
    }

    async save() {
        const row = this.toRow();
        const savedData = await saveTableRow('progress', row, this._id);
        Object.assign(this, Progress.fromRow(savedData));
        return this;
    }

    static find(filter = {}) {
        return createQuery(async () => {
            const rows = await fetchTableRows('progress');
            return rows.filter(row => matchesFilter(row, filter)).map(Progress.fromRow);
        });
    }

    static async findOne(filter = {}) {
        const records = await Progress.find(filter).limit(1);
        return records[0] || null;
    }

    static async findOneAndDelete(filter = {}) {
        const record = await Progress.findOne(filter);

        if (!record) {
            return null;
        }

        await deleteTableRow('progress', record._id);
        return record;
    }

    static async findOneAndUpdate(filter = {}, update = {}, options = {}) {
        const record = await Progress.findOne(filter);

        if (!record) {
            return null;
        }

        const updateData = update.$set || update;
        Object.assign(record, updateData);
        await record.save();
        return options.new === false ? null : record;
    }
}

module.exports = Progress;
