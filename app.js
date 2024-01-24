if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const createError = require('http-errors');
const express = require('express');
const helmet = require('helmet');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors');
const secrets = require('./utils/secrets');

const apiRouter = require('./routes/api');

const app = express();

app.use(helmet());
app.disable('x-powered-by');

mongoose.set('strictQuery', false);
mongoose.connect(secrets.MONGODBURL).catch((err) => {
    throw err;
});

const corsOptions = {
    origin: ['https://www.boxcards.app/', 'https://boxcards.vercel.app/'],
    credentials: true,
    optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiRouter);

app.use((req, res, next) => {
    next(createError(404));
});

app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    res.status(err.status || 500).send({ error: err });
});

module.exports = app;
