const {
    getSupabaseClient,
    createQuery,
    fetchTableRows,
    matchesFilter,
    normalizeDate,
} = require('../utils/supabaseStore');

class Member {
    constructor(data = {}) {
        this._id = data.id || data._id || null;
        this.userId = data.userId;
        this.name = data.name;
        this.role = data.role || 'beginner';
        this.joinDate = normalizeDate(data.joinDate) || new Date();
        this.activityScore = data.activityScore ?? 0;
        this.streak = data.streak ?? 0;
        this.lastActiveDate = normalizeDate(data.lastActiveDate);
        this.xp = data.xp ?? 0;
        this.completedTasks = Array.isArray(data.completedTasks)
            ? data.completedTasks.map(task => ({
                taskName: task.taskName,
                completedDate: normalizeDate(task.completedDate) || new Date(),
                pointsEarned: task.pointsEarned ?? 5,
            }))
            : [];
    }

    static fromRow(row) {
        return new Member({
            ...row,
            id: row.id,
            userId: row.user_id || row.userId,
            joinDate: row.join_date || row.joinDate,
            lastActiveDate: row.last_active_date || row.lastActiveDate,
            activityScore: row.activity_score ?? row.activityScore,
            completedTasks: row.completed_tasks || row.completedTasks || [],
        });
    }

    toRow() {
        return {
            user_id: this.userId,
            name: this.name,
            role: this.role,
            join_date: this.joinDate ? this.joinDate.toISOString() : new Date().toISOString(),
            activity_score: this.activityScore,
            streak: this.streak,
            last_active_date: this.lastActiveDate ? this.lastActiveDate.toISOString() : null,
            xp: this.xp,
            completed_tasks: this.completedTasks.map(task => ({
                taskName: task.taskName,
                completedDate: normalizeDate(task.completedDate)?.toISOString() || new Date().toISOString(),
                pointsEarned: task.pointsEarned ?? 5,
            })),
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
            response = await client.from('members').update(row).eq('id', this._id).select('*').single();
        } else {
            response = await client.from('members').upsert(row, { onConflict: 'user_id' }).select('*').single();
        }

        const { data, error } = response;

        if (error) {
            throw error;
        }

        Object.assign(this, Member.fromRow(data));
        return this;
    }

    static find(filter = {}) {
        return createQuery(async () => {
            const rows = await fetchTableRows('members');
            return rows.filter(row => matchesFilter(row, filter)).map(Member.fromRow);
        });
    }

    static async findOne(filter = {}) {
        const records = await Member.find(filter).limit(1);
        return records[0] || null;
    }

    static async findOneAndDelete(filter = {}) {
        const member = await Member.findOne(filter);

        if (!member) {
            return null;
        }

        const client = getSupabaseClient();
        const { error } = await client.from('members').delete().eq('id', member._id);

        if (error) {
            throw error;
        }

        return member;
    }

    static async findOneAndUpdate(filter = {}, update = {}, options = {}) {
        const member = await Member.findOne(filter);

        if (!member) {
            return null;
        }

        const updateData = update.$set || update;
        Object.assign(member, updateData);
        await member.save();
        return options.new === false ? null : member;
    }
}

module.exports = Member;
