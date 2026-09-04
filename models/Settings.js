const {
    getSupabaseClient,
    fetchTableRows,
    saveTableRow,
    deleteTableRow,
    matchesFilter,
} = require('../utils/supabaseStore');

class Setting {
    constructor(data = {}) {
        this._id = data.id || data._id || null;
        this.key = data.key;
        this.value = data.value;
        this.category = data.category || 'general';
        this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
    }

    static fromRow(row) {
        return new Setting({
            ...row,
            id: row.id || row._id,
            updatedAt: row.updated_at || row.updatedAt,
        });
    }

    toRow() {
        return {
            key: this.key,
            value: typeof this.value === 'object' ? JSON.stringify(this.value) : this.value,
            category: this.category,
            updated_at: this.updatedAt.toISOString(),
        };
    }

    async save() {
        const row = this.toRow();
        const savedData = await saveTableRow('settings', row, this._id, 'key');
        Object.assign(this, Setting.fromRow(savedData));
        return this;
    }

    static async find(filter = {}) {
        const rows = await fetchTableRows('settings');
        return rows.filter(row => matchesFilter(row, filter)).map(Setting.fromRow);
    }

    static async findOne(filter = {}) {
        const records = await Setting.find(filter);
        return records[0] || null;
    }

    static async findOneAndUpdate(filter = {}, update = {}, options = {}) {
        const record = await Setting.findOne(filter);

        if (!record) {
            return null;
        }

        const updateData = update.$set || update;
        Object.assign(record, updateData);
        await record.save();
        return options.new === false ? null : record;
    }

    static async findOneAndDelete(filter = {}) {
        const record = await Setting.findOne(filter);

        if (!record) {
            return null;
        }

        await deleteTableRow('settings', record._id);
        return record;
    }
}

module.exports = Setting;
