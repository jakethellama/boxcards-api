const asyncHandler = require('express-async-handler');
const { body, param, query, validationResult } = require('express-validator');
const createError = require('http-errors');
const mongoose = require('mongoose');
const User = require('../models/user');
const Card = require('../models/card');
const Set = require('../models/set');

function validateObjectID(id) {
    if (!mongoose.isValidObjectId(id)) {
        throw new Error('Invalid ID');
    } else {
        return true;
    }
}

exports.getCards = [
    query('word').trim().escape(),

    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);

        if (req.query.word === '') {
            const cards = await Card.find({ isPublished: true });
            return res.json(cards);
        }

        if (!errors.isEmpty()) {
            const err = createError(400, 'Invalid query');
            return next(err);
        } else {
            const cards = await Card.find({ isPublished: true, word: req.query.word });
            return res.json(cards);
        }
    }),
];

exports.postCard = [
    (req, res, next) => {
        if (res.locals.isAuth === false) {
            const err = createError(401, 'Unauthorized, please login');
            return next(err);
        } else {
            return next();
        }
    },

    body('word').trim().isLength({ min: 0, max: 50 }).escape(),
    body('definition').trim().isLength({ min: 0, max: 250 }).escape(),

    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const err = createError(400, 'Invalid data');
            return next(err);
        } else {
            const user = await User.findOne({ username: res.locals.udata.username }, '-password').exec();

            const card = new Card({
                author: user.username,
                author_id: user._id,
                word: req.body.word,
                definition: req.body.definition,
                isPublished: false,
                references: 0,
            });

            await card.save();
            return res.json(card);
        }
    }),
];

exports.getCardInfo = [
    // never used for public cards, only for private cards to allow for editing
    param('cid').trim().custom(validateObjectID).escape(),

    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);

        if (res.locals.isAuth === false) {
            const err = createError(401, 'Unauthorized, please login');
            return next(err);
        } else if (!errors.isEmpty()) {
            const err = createError(400, 'Card does not exist');
            return next(err);
        }

        const card = await Card.findOne({ _id: req.params.cid }).exec();

        if (card === null) {
            const err = createError(404, 'Card does not exist');
            return next(err);
        } else if (res.locals.udata._id == card.author_id) {
            return res.json({ word: card.word, def: card.definition, references: card.references });
        } else {
            const err = createError(403, 'Access forbidden, this card is not yours');
            return next(err);
        }
    }),
];

exports.patchCard = [
    param('cid').trim().custom(validateObjectID).escape(),
    body('word').trim().isLength({ min: 0, max: 50 }).escape(),
    body('definition').trim().isLength({ min: 0, max: 250 }).escape(),
    body('isPublished').trim().isBoolean().escape(),

    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);

        if (res.locals.isAuth === false) {
            const err = createError(401, 'Unauthorized, please login');
            return next(err);
        } else if (!errors.isEmpty()) {
            const err = createError(400, 'Invalid data');
            return next(err);
        }

        const card = await Card.findOne({ _id: req.params.cid }).exec();

        if (card === null) {
            const err = createError(404, 'Card does not exist');
            return next(err);
        } else if (res.locals.udata._id == card.author_id) {
            if (card.isPublished === true) {
                const err = createError(403, 'Access forbidden, this card is published');
                return next(err);
            } else {
                card.word = req.body.word;
                card.definition = req.body.definition;
                card.isPublished = req.body.isPublished;
                await card.save();
                return res.json({ word: card.word, def: card.definition, isPublished: card.isPublished });
            }
        } else {
            const err = createError(403, 'Access forbidden, this card is not yours');
            return next(err);
        }
    }),
];

exports.deleteCard = [
    param('cid').trim().custom(validateObjectID).escape(),

    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);

        if (res.locals.isAuth === false) {
            const err = createError(401, 'Unauthorized, please login');
            return next(err);
        } else if (!errors.isEmpty()) {
            const err = createError(400, 'Card does not exist');
            return next(err);
        }

        const card = await Card.findOne({ _id: req.params.cid }).exec();

        if (card === null) {
            const err = createError(404, 'Card does not exist');
            return next(err);
        } else if (res.locals.udata._id == card.author_id) {
            if (card.isPublished === true) {
                const err = createError(403, 'Access forbidden, this card is published');
                return next(err);
            } else {
                const author = await User.findOne({ _id: card.author_id }, '-password');

                // remove from author's favorites
                const i = author.favorites.indexOf(card._id);
                if (i >= 0) {
                    author.favorites.splice(i, 1);
                }
                await author.save();

                // remove from author's private sets, a card can be in a set more than once
                const aSets = await Set.find({ author_id: author._id, isPublished: false });
                await Promise.all(aSets.map(async (s) => {
                    const t = s.cards.filter((c) => {
                        return (!c._id.equals(card._id));
                    });
                    s.cards = t;
                    await s.save();
                }));

                await Card.deleteOne({ _id: card._id });
                return res.json(card);
            }
        } else {
            const err = createError(403, 'Access forbidden, this card is not yours');
            return next(err);
        }
    }),
];
