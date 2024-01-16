const express = require('express');
const createError = require('http-errors');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const cookie = require('cookie');
const boxesController = require('../controllers/boxes-controller');
const cardsController = require('../controllers/cards-controller');
const setsController = require('../controllers/sets-controller');
const authController = require('../controllers/auth-controller');

const router = express.Router();

function checkAuth2(req, res, next) {
    if (req.headers.cookie) {
        const cookies = cookie.parse(req.headers.cookie);
        jwt.verify(cookies.bxcrd, process.env.JWTSECRET, async (err, payload) => {
            if (err) {
                // token is invalid or expired
                res.locals.isAuth = false;
                res.locals.udata = { _id: '.NEVER*ID;LOL' };
                next();
            } else {
                // valid token for existing user
                res.locals.isAuth = true;
                res.locals.udata = payload.user;
                next();
            }
        });
    } else {
        // no cookies
        res.locals.isAuth = false;
        res.locals.udata = { _id: '.NEVER*ID;LOL' };
        return next();
    }
}

router.use(checkAuth2);

router.get('/', (req, res, next) => {
    if (res.locals.isAuth) {
        return res.json(`/boxes/${res.locals.udata.username}`);
    } else {
        return res.json('');
    }
});

// Auth Routes

router.post('/login', authController.login);

router.post('/logout', authController.logout);

router.get('/authCheck', authController.authCheck);

router.get('/authUserInfo', authController.authUserInfo);

router.get('/authUserSets', authController.authUserSets);

router.get('/authUserFavs', authController.authUserFavs);

// BOXES Routes

router.post('/boxes', boxesController.postUser);

router.get('/boxes/:username', boxesController.getUserInfo);

router.patch('/boxes/:username', boxesController.patchUserInfo);

router.get('/boxes/:username/cards', boxesController.getUserCards);

router.get('/boxes/:username/sets', boxesController.getUserSets);

router.patch('/boxes/:username/favorites', boxesController.patchUserFavs);

// SETS Routes

router.get('/sets', setsController.getSets);

router.post('/sets', setsController.postSet);

router.get('/sets/:sid', setsController.getSetInfo);

router.patch('/sets/:sid', setsController.patchSet);

router.delete('/sets/:sid', setsController.deleteSet);

router.get('/sets/:sid/cards', setsController.getSetCards);

router.patch('/sets/:sid/cards', setsController.patchSetCards);

// CARDS Routes

router.get('/cards', cardsController.getCards);

router.post('/cards', cardsController.postCard);

router.get('/cards/:cid', cardsController.getCardInfo);

router.patch('/cards/:cid', cardsController.patchCard);

router.delete('/cards/:cid', cardsController.deleteCard);

module.exports = router;
