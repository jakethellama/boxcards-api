const mongoose = require('mongoose');

const Schema = mongoose.Schema;

function arrayLimit(value) {
    return value.length <= 50;
}

const SetSchema = new Schema({
    author: {
        type: String, minLength: 1, maxLength: 20, match: /^[a-zA-Z0-9-_]+$/,
    },
    author_id: { type: Schema.Types.ObjectId, ref: 'User' },
    name: {
        type: String, required: true, minLength: 1, maxLength: 50,
    },
    isPublished: { type: Boolean, required: true },
    cards: {
        type: [{
            type: Schema.Types.ObjectId, ref: 'Card',
        }],
        validate: [arrayLimit, 'card count exceeds 50'],
        required: true,
    },
});

SetSchema.index({ author: -1, isPublished: -1 });
SetSchema.index({ isPublished: -1 });
SetSchema.index({ name: 1 });

module.exports = mongoose.model('Set', SetSchema);
