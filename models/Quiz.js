const {
    getSupabaseClient,
    createQuery,
    fetchTableRows,
    matchesFilter,
} = require('../utils/supabaseStore');

class Quiz {
    constructor(data = {}) {
        this._id = data.id || data._id || null;
        this.question = data.question;
        this.options = Array.isArray(data.options) ? data.options : [];
        this.correctOptionIndex = data.correctOptionIndex;
        this.topic = data.topic;
    }

    static fromRow(row) {
        return new Quiz({
            ...row,
            id: row.id,
            correctOptionIndex: row.correct_option_index ?? row.correctOptionIndex,
        });
    }

    toRow() {
        return {
            question: this.question,
            options: this.options,
            correct_option_index: this.correctOptionIndex,
            topic: this.topic,
        };
    }

    async save() {
        const client = getSupabaseClient();

        if (!client) {
            throw new Error('Supabase is not configured');
        }

        const { data, error } = await client.from('quizzes').insert(this.toRow()).select('*').single();

        if (error) {
            throw error;
        }

        Object.assign(this, Quiz.fromRow(data));
        return this;
    }

    static find(filter = {}) {
        return createQuery(async () => {
            const rows = await fetchTableRows('quizzes');
            return rows.filter(row => matchesFilter(row, filter)).map(Quiz.fromRow);
        });
    }

    static async countDocuments(filter = {}) {
        const records = await Quiz.find(filter);
        return records.length;
    }

    static async insertMany(quizzes = []) {
        const client = getSupabaseClient();

        if (!client) {
            throw new Error('Supabase is not configured');
        }

        const rows = quizzes.map(quiz => ({
            question: quiz.question,
            options: quiz.options,
            correct_option_index: quiz.correctOptionIndex,
            topic: quiz.topic,
        }));

        const { data, error } = await client.from('quizzes').insert(rows).select('*');

        if (error) {
            throw error;
        }

        return (data || []).map(Quiz.fromRow);
    }

    static async aggregate(pipeline = []) {
        const sampleStage = pipeline.find(stage => stage.$sample);
        const sampleSize = sampleStage?.$sample?.size || 1;
        const records = await Quiz.find();

        if (records.length === 0) {
            return [];
        }

        const shuffled = records.slice().sort(() => Math.random() - 0.5);
        return shuffled.slice(0, sampleSize);
    }
}

module.exports = Quiz;
