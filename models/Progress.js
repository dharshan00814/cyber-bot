const {
    getSupabaseClient,
    createQuery,
    fetchTableRows,
    matchesFilter,
    normalizeDate,
} = require('../utils/supabaseStore');

class Progress {
    constructor(data = {}) {
        this._id = data.id || data._id || null;
        this.userId = data.userId;
        this.date = normalizeDate(data.date) || new Date();
        this.text = data.text;
    }

    static fromRow(row) {
        return new Progress({
            ...row,
            id: row.id,
            userId: row.user_id || row.userId,
            date: row.date,
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
        const client = getSupabaseClient();

        if (!client) {
            throw new Error('Supabase is not configured');
        }

        const row = this.toRow();
        const { data, error } = await client.from('progress').insert(row).select('*').single();

        if (error) {
            throw error;
        }

        Object.assign(this, Progress.fromRow(data));
        return this;
    }

    static find(filter = {}) {
        return createQuery(async () => {
            const rows = await fetchTableRows('progress');
            return rows.filter(row => matchesFilter(row, filter)).map(Progress.fromRow);
        });
    }
}

module.exports = Progress;
