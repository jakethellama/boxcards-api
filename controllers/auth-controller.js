if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const asyncHandler = require('express-async-handler');
const { body, param, validationResult } = require('express-validator');
const createError = require('http-errors');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const bcrypt = require('bcryptjs');
const secrets = require('../utils/secrets');
const User = require('../models/user');
const Card = require('../models/card');
const Set = require('../models/set');
const Utils = require('../utils/utils');

exports.login = [
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

    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const err = createError(400, 'Invalid username or password');
            return next(err);
        } else {
            const user = await User.findOne({ username: req.body.username }, '_id username password').exec();

            if (user === null) {
                const error = createError(401, 'Username and password do not match');
                return next(error);
            }

            bcrypt.compare(req.body.password, user.password, (err, result) => {
                if (err) {
                    return next(err);
                }

                if (result === true) {
                    jwt.sign({ user: { username: user.username, _id: user._id } }, secrets.JWTSECRET, { expiresIn: '12h' }, (error, token) => {
                        if (error) {
                            return next(error);
                        }
                        res.setHeader('Set-Cookie', cookie.serialize('bxcrd', token, {
                            httpOnly: true,
                            secure: true,
                            sameSite: 'strict',
                            maxAge: 60 * 60 * 12,
                        }));
                        return res.json({});
                    });
                } else {
                    const error = createError(401, 'Username and password do not match');
                    return next(error);
                }
            });
        }
    }),
];

exports.logout = asyncHandler(async (req, res, next) => {
    res.setHeader('Set-Cookie', cookie.serialize('bxcrd', null, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 0,
    }));
    return res.json();
});

exports.authCheck = asyncHandler(async (req, res, next) => {
    if (res.locals.isAuth) {
        return res.json({
            isAuth: true,
            username: res.locals.udata.username,
        });
    } else {
        return res.json({ isAuth: false, username: null });
    }
});

exports.authUserInfo = asyncHandler(async (req, res, next) => {
    if (res.locals.isAuth) {
        const user = await User.findOne({ username: res.locals.udata.username }, '-password').exec();

        return res.json({
            icon: user.icon,
            favsIds: user.favorites,
            isAuth: true,
            username: res.locals.udata.username,
        });
    } else {
        return res.json({ icon: null, favsIds: null, isAuth: false, username: null });
    }
});

exports.authUserSets = asyncHandler(async (req, res, next) => {
    if (res.locals.isAuth) {
        const sets = await Set.find({ author: res.locals.udata.username }).exec();
        return res.json(sets);
    } else {
        return res.json([]);
    }
});

exports.authUserFavs = asyncHandler(async (req, res, next) => {
    if (res.locals.isAuth) {
        const users = await User.findOne({ username: res.locals.udata.username }, '-_id favorites')
            .populate('favorites').exec();
        return res.json(users.favorites);
    } else {
        return res.json([]);
    }
});
