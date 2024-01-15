const mongoose = require('mongoose');

const Schema = mongoose.Schema;

function arrayLimit(value) {
    return value.length <= 50;
}

const UserSchema = new Schema({
    username: {
        type: String, required: true, minLength: 1, maxLength: 20, match: /^[a-zA-Z0-9-_]+$/, index: true, unique: true,
    },
    password: { type: String, required: true },
    icon: { type: Number, enum: [0, 1, 2, 3, 4, 5, 6, 7, 8], required: true },
    favorites: {
        type: [{
            type: Schema.Types.ObjectId, ref: 'Card',
        }],
        validate: [arrayLimit, 'favorites exceeds 50'],
        required: true,
    },
});

module.exports = mongoose.model('User', UserSchema);
