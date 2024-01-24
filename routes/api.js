const express = require('express');
const createError = require('http-errors');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const cookie = require('cookie');
const cors = require('cors');
const secrets = require('../utils/secrets');
const boxesController = require('../controllers/boxes-controller');
const cardsController = require('../controllers/cards-controller');
const setsController = require('../controllers/sets-controller');
const authController = require('../controllers/auth-controller');

const router = express.Router();

const corsOptions = {
    origin: ['https://www.boxcards.app/', 'https://boxcards.vercel.app/'],
    credentials: true,
    optionsSuccessStatus: 200,
};

function checkAuth2(req, res, next) {
    if (req.headers.cookie) {
        const cookies = cookie.parse(req.headers.cookie);
        jwt.verify(cookies.bxcrd, secrets.JWTSECRET, async (err, payload) => {
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
    return res.json('Welcome to BoxCards API');
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

router.options('/boxes/:username', cors(corsOptions));
router.patch('/boxes/:username', boxesController.patchUserInfo);

router.get('/boxes/:username/cards', boxesController.getUserCards);

router.get('/boxes/:username/sets', boxesController.getUserSets);

router.options('/boxes/:username/favorites', cors(corsOptions));
router.patch('/boxes/:username/favorites', boxesController.patchUserFavs);

// SETS Routes

router.get('/sets', setsController.getSets);

router.post('/sets', setsController.postSet);

router.get('/sets/:sid', setsController.getSetInfo);

router.options('/sets/:sid', cors(corsOptions));
router.patch('/sets/:sid', setsController.patchSet);

router.options('/sets/:sid', cors(corsOptions));
router.delete('/sets/:sid', setsController.deleteSet);

router.get('/sets/:sid/cards', setsController.getSetCards);

router.options('/sets/:sid/cards', cors(corsOptions));
router.patch('/sets/:sid/cards', setsController.patchSetCards);

// CARDS Routes

router.get('/cards', cardsController.getCards);

router.post('/cards', cardsController.postCard);

router.get('/cards/:cid', cardsController.getCardInfo);

router.options('/cards/:cid', cors(corsOptions));
router.patch('/cards/:cid', cardsController.patchCard);

router.options('/cards/:cid', cors(corsOptions));
router.delete('/cards/:cid', cardsController.deleteCard);

module.exports = router;
