const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const CardSchema = new Schema({
    author: {
        type: String, minLength: 1, maxLength: 20, match: /^[a-zA-Z0-9-_]+$/,
    },
    author_id: { type: Schema.Types.ObjectId, ref: 'User' },
    word: {
        type: String, required: false, minLength: 0, maxLength: 50,
    },
    definition: {
        type: String, required: false, minLength: 0, maxLength: 250,
    },
    isPublished: { type: Boolean, required: true },
    references: { type: Number, required: true, min: 0 },
});

CardSchema.index({ author: -1, isPublished: -1 });
CardSchema.index({ isPublished: -1, references: -1 });
CardSchema.index({ word: 1, references: -1 });

module.exports = mongoose.model('Card', CardSchema);
