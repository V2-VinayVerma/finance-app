const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true},
    description: { type: String, required: false },
    adminEmail: { type: String, required: true },
    createdAt: { type: Date, default: Date.now() },
    membersEmail: [String],
    thumbnail: { type: String, required: false },
    expenses: [{
        title: { type: String, required: true },
        amount: { type: Number, required: true },
        paidBy: { type: String, required: true },
        splitType: { type: String, enum: ['equal', 'custom'], required: true },
        splits: [{
            memberEmail: { type: String, required: true },
            amount: { type: Number, required: true }
        }],
        createdBy: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
    paymentStatus: {
        amount: Number,
        currency: String,
        date: Date,
        isPaid: Boolean,
    }
});

module.exports = mongoose.model('Group', groupSchema);
