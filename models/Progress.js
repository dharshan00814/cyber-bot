const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    date: { type: Date, default: Date.now },
    text: { type: String, required: true },
});

module.exports = mongoose.model('Progress', progressSchema);
