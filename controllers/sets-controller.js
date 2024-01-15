const asyncHandler = require('express-async-handler');
const { body, param, query, validationResult } = require('express-validator');
const createError = require('http-errors');
const mongoose = require('mongoose');
const User = require('../models/user');
const Card = require('../models/card');
const Set = require('../models/set');
const utils = require('../utils/utils');

function validateObjectID(id) {
    if (!mongoose.isValidObjectId(id)) {
        throw new Error('Invalid ID');
    } else {
        return true;
    }
}

exports.getSets = [
    query('name').trim().escape(),

    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);
        if (req.query.name === '') {
            const sets = await Set.find({ isPublished: true });
            return res.json(sets);
        }

        if (!errors.isEmpty()) {
            const err = createError(400, 'Invalid set data');
            return next(err);
        } else {
            const sets = await Set.find({ isPublished: true, name: req.query.name });
            return res.json(sets);
        }
    }),
];

exports.postSet = [
    (req, res, next) => {
        if (res.locals.isAuth === false) {
            const err = createError(401, 'Unauthorized, please login');
            return next(err);
        } else {
            return next();
        }
    },

    body('name').trim().isLength({ min: 1, max: 50 }).escape(),

    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const err = createError(400, 'Invalid set data');
            return next(err);
        } else {
            const user = await User.findOne({ username: res.locals.udata.username }, '-password').exec();

            const set = new Set({
                author: user.username,
                author_id: user._id,
                name: req.body.name,
                isPublished: false,
                cards: [],
            });

            await set.save();
            return res.json(set);
        }
    }),
];

exports.getSetInfo = [
    param('sid').trim().custom(validateObjectID).escape(),

    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const err = createError(400, 'Set does not exist');
            return next(err);
        }

        const set = await Set.findOne({ _id: req.params.sid }, '-cards -__v').exec();

        if (set === null) {
            const err = createError(404, 'Set does not exist');
            return next(err);
        } else {
            return res.json(set);
        }
    }),
];

exports.patchSet = [
    param('sid').trim().custom(validateObjectID).escape(),
    body('name').trim().isLength({ min: 1, max: 50 }).escape(),
    body('isPublished').trim().isBoolean().escape(),

    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);

        if (res.locals.isAuth === false) {
            const err = createError(401, 'Unauthorized, please login');
            return next(err);
        } else if (!errors.isEmpty()) {
            const err = createError(400, 'Invalid set data');
            return next(err);
        }

        const set = await Set.findOne({ _id: req.params.sid }).exec();

        if (set === null) {
            const err = createError(404, 'Set does not exist');
            return next(err);
        } else if (res.locals.udata._id == set.author_id) {
            if (set.isPublished === true) {
                const err = createError(403, 'Access forbidden, this set is published');
                return next(err);
            } else {
                set.name = req.body.name;
                set.isPublished = req.body.isPublished;
                if (req.body.isPublished === 'true') {
                    // publish all of the set's cards
                    const cardsIDs = set.cards;

                    await Promise.all(cardsIDs.map(async (_id) => {
                        const a = await Card.findOne({ _id });
                        a.isPublished = true;
                        await a.save();
                    }));

                    await set.save();
                    return res.json(set);
                } else {
                    await set.save();
                    return res.json(set);
                }
            }
        } else {
            const err = createError(403, 'Access forbidden, this set is not yours');
            return next(err);
        }
    }),
];

exports.deleteSet = [
    param('sid').trim().custom(validateObjectID).escape(),

    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);

        if (res.locals.isAuth === false) {
            const err = createError(401, 'Unauthorized, please login');
            return next(err);
        } else if (!errors.isEmpty()) {
            const err = createError(400, 'Set does not exist');
            return next(err);
        }

        const set = await Set.findOne({ _id: req.params.sid }).exec();

        if (set === null) {
            const err = createError(404, 'Set does not exist');
            return next(err);
        } else if (res.locals.udata._id == set.author_id) {
            if (set.isPublished === true) {
                const err = createError(403, 'Access forbidden, this set is published');
                return next(err);
            } else {
                const oldCards = await Promise.all(set.cards.map(async (_id) => {
                    const card = await Card.findOne({ _id });
                    return card;
                }));

                const oldInstances = utils.countInstances(oldCards.map((card) => card._id));

                await Promise.all(oldCards.map(async (crd) => {
                    crd.references -= oldInstances[crd._id];
                    await crd.save();
                }));

                await Set.deleteOne({ _id: set._id });
                return res.json();
            }
        } else {
            const err = createError(403, 'Access forbidden, this set is not yours');
            return next(err);
        }
    }),
];

exports.getSetCards = [
    param('sid').trim().custom(validateObjectID).escape(),

    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const err = createError(400, 'Set does not exist');
            return next(err);
        }

        const set = await Set.findOne({ _id: req.params.sid }).populate('cards').exec();

        if (set === null) {
            const err = createError(404, 'Set does not exist');
            return next(err);
        } else if (set.isPublished === true) {
            return res.json(set.cards);
        } else {
            if (res.locals.udata._id == set.author_id) {
                return res.json(set.cards);
            } else {
                const err = createError(403, 'Access forbidden, this private set is not yours');
                return next(err);
            }
        }
    }),
];

exports.patchSetCards = [
    param('sid').trim().custom(validateObjectID).escape(),
    body('cidArr.*').trim().custom(validateObjectID).escape(),
    // cidArr is the desired cards in the set

    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);

        if (res.locals.isAuth === false) {
            const err = createError(401, 'Unauthorized, please login');
            return next(err);
        } else if (!errors.isEmpty()) {
            const err = createError(400, 'Invalid data');
            return next(err);
        }

        const set = await Set.findOne({ _id: req.params.sid }).exec();

        if (set === null) {
            const err = createError(404, 'Set does not exist');
            return next(err);
        } else if (set.isPublished === true) {
            const err = createError(403, 'Access forbidden, this set is published');
            return next(err);
        } else {
            if (res.locals.udata._id == set.author_id) {
                if (req.body.cidArr.length > 50) {
                    // this will not trigger from regular user interaction on client side
                    const err = createError(400, 'Invalid data, too many cards in the set');
                    return next(err);
                } else {
                    // verify the cards in cidArr are able to be added
                    const newCards = await Promise.all(req.body.cidArr.map(async (_id) => {
                        const ncard = await Card.findOne({ _id });
                        if (ncard === null) {
                            const err = createError(404, 'Card does not exist');
                            throw err;
                        } else {
                            if (ncard.isPublished == true) {
                                return ncard;
                            } else {
                                if (res.locals.udata._id == ncard.author_id) {
                                    return ncard;
                                } else {
                                    const err = createError(403, 'Access forbidden, you cannot add private cards that you do not own');
                                    throw err;
                                }
                            }
                        }
                    }));

                    const newInstances = utils.countInstances(newCards.map((card) => card._id));

                    await Promise.all(newCards.map(async (crd) => {
                        crd.references += newInstances[crd._id];
                        await crd.save();
                    }));

                    const oldCards = await Promise.all(set.cards.map(async (_id) => {
                        const card = await Card.findOne({ _id });
                        return card;
                    }));

                    const oldInstances = utils.countInstances(oldCards.map((card) => card._id));

                    await Promise.all(oldCards.map(async (crd) => {
                        crd.references -= oldInstances[crd._id];
                        await crd.save();
                    }));

                    set.cards = req.body.cidArr;
                    await set.save();
                    return res.json();
                }
            } else {
                const err = createError(403, 'Access forbidden, this set is not yours');
                return next(err);
            }
        }
    }),
];
