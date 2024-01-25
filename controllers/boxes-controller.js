const asyncHandler = require('express-async-handler');
const { body, param, validationResult } = require('express-validator');
const createError = require('http-errors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cookie = require('cookie');
const bcrypt = require('bcryptjs');
const secrets = require('../utils/secrets');
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

exports.postUser = [
    (req, res, next) => {
        if (res.locals.isAuth) {
            const err = createError(403, 'Already logged in');
            return next(err);
        } else {
            return next();
        }
    },

    body('username').trim().isLength({ min: 1, max: 20 }).matches(/^[a-zA-Z0-9-_]+$/)
        .escape(),
    body('password').isLength({ min: 5, max: 40 }),
    body('icon').isNumeric().escape(),

    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const err = createError(400, 'Invalid user data');
            return next(err);
        } else {
            const usernameCheckUser = await User.findOne({ username: req.body.username }, '-favorites -password').exec();
            if (usernameCheckUser !== null) {
                const err = createError(409, 'Username is already being used');
                return next(err);
            }

            bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
                if (err) {
                    return next(err);
                }
                const user = new User({
                    username: req.body.username,
                    password: hashedPassword,
                    icon: req.body.icon,
                    favorites: [],
                });

                await user.save();

                const jicUser = await User.findOne({ _id: user._id }, '_id username').exec();

                jwt.sign({ user: jicUser }, secrets.JWTSECRET, { expiresIn: '12h' }, (error, token) => {
                    if (error) {
                        return next(error);
                    }
                    res.setHeader('Set-Cookie', cookie.serialize('bxcrdTokenCooki', token, {
                        httpOnly: true,
                        secure: true,
                        sameSite: 'none',
                        maxAge: 60 * 60 * 12,
                    }));
                    return res.json({ });
                });
            });
        }
    }),
];

exports.getUserInfo = [
    param('username').trim().escape(),

    asyncHandler(async (req, res, next) => {
        const user = await User.findOne({ username: req.params.username }, '-_id username icon').exec();

        if (user === null) {
            const err = createError(404, 'User does not exist');
            return next(err);
        } else {
            return res.json({ username: user.username, icon: user.icon });
        }
    }),
];

exports.patchUserInfo = [
    param('username').trim().escape(),
    body('icon').isNumeric().trim().escape(),

    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);

        if (res.locals.isAuth === false) {
            const err = createError(401, 'Unauthorized, please login');
            return next(err);
        } else if (!errors.isEmpty()) {
            const err = createError(400, 'Invalid user data');
            return next(err);
        }

        const user = await User.findOne({ username: req.params.username }, '-password').exec();

        if (user === null) {
            const err = createError(404, 'User does not exist');
            return next(err);
        } else if (res.locals.udata._id == user._id) {
            user.icon = req.body.icon;
            await user.save();
            return res.json({ temp: `updated icon to ${user.icon}` });
        } else {
            const err = createError(403, 'Access forbidden, invalid user');
            return next(err);
        }
    }),
];

exports.getUserCards = [
    param('username').trim().escape(),

    asyncHandler(async (req, res, next) => {
        const user = await User.findOne({ username: req.params.username }, '-password').exec();

        if (user === null) {
            const err = createError(404, 'User does not exist');
            return next(err);
        } else if (res.locals.udata._id == user._id) {
            const cards = await Card.find({ author: user.username }, '-author_id').exec();
            return res.json(cards);
        } else {
            const cards = await Card.find({ author: user.username, isPublished: true }, '-author_id').exec();
            return res.json(cards);
        }
    }),
];

exports.getUserSets = [
    param('username').trim().escape(),

    asyncHandler(async (req, res, next) => {
        const user = await User.findOne({ username: req.params.username }, '-password').exec();

        if (user === null) {
            const err = createError(404, 'User does not exist');
            return next(err);
        } else if (res.locals.udata._id == user._id) {
            const sets = await Set.find({ author: user.username }).exec();
            return res.json(sets);
        } else {
            const sets = await Set.find({ author: user.username, isPublished: true }).exec();
            return res.json(sets);
        }
    }),
];

exports.patchUserFavs = [
    body('cid').trim().custom(validateObjectID).escape(),
    param('username').trim().escape(),

    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);

        if (res.locals.isAuth === false) {
            const err = createError(401, 'Unauthorized, please login');
            return next(err);
        } else if (!errors.isEmpty()) {
            const err = createError(400, 'Card does not exist');
            return next(err);
        }

        const user = await User.findOne({ username: req.params.username }, '-password').exec();
        const card = await Card.findOne({ _id: req.body.cid });

        if (user === null) {
            const err = createError(404, 'User does not exist');
            return next(err);
        } else if (card === null) {
            const err = createError(404, 'Card does not exist');
            return next(err);
        } else if (res.locals.udata._id == user._id) {
            const index = user.favorites.indexOf(card._id);
            if (index >= 0) {
                // already favorite, toggle off
                user.favorites.splice(index, 1);
                await user.save();
                return res.json(user.favorites);
            } else {
                if (user.favorites.length >= 50) {
                    const err = createError(409, 'You have max favorites');
                    return next(err);
                } else {
                    if (card.isPublished === true) {
                        user.favorites.push(req.body.cid);
                        await user.save();
                        return res.json(user.favorites);
                    } else {
                        if (res.locals.udata._id == card.author_id) {
                            user.favorites.push(req.body.cid);
                            await user.save();
                            return res.json(user.favorites);
                        } else {
                            const err = createError(403, 'Access forbidden, private card is not yours');
                            return next(err);
                        }
                    }
                }
            }
        } else {
            const err = createError(403, 'Access forbidden, invalid user');
            return next(err);
        }
    }),
];
