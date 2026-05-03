const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctOptionIndex: { type: Number, required: true },
    topic: { type: String, required: true },
});

module.exports = mongoose.model('Quiz', quizSchema);
