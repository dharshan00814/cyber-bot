const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['beginner', 'intermediate', 'leader'], default: 'beginner' },
    joinDate: { type: Date, default: Date.now },
    activityScore: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastActiveDate: { type: Date },
    xp: { type: Number, default: 0 },
    completedTasks: [
        {
            taskName: { type: String, required: true },
            completedDate: { type: Date, default: Date.now },
            pointsEarned: { type: Number, default: 5 },
        }
    ],
});

module.exports = mongoose.model('Member', memberSchema);
