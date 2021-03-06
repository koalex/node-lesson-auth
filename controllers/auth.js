const fs         = require('fs');
const passport   = require('../middlewares/passport');
const User       = require('../../users/models/user');
const BlackToken = require('../models/blacktoken');
const genTokens  = require('./generateTokens');
const uuidv1     = require('uuid/v1');
const nodemailer = require('../../../lib/nodemailer');
const Socket     = require('../../../lib/socket');

exports.renderSigninPage = async ctx => {
    ctx.type = 'html';
    ctx.body = fs.createReadStream(require.resolve('../../../static/signin.html'));
};

exports.renderSignupPage = async ctx => {
    ctx.type = 'html';
    ctx.body = fs.createReadStream(require.resolve('../../../static/signup.html'));
};

exports.signin = async ctx => {
    await passport.authenticate('local', async (err, user, info, status) => {
        if (err) {
            return ctx.throw(err);
        }

        if (!user) {
            return ctx.throw(500, info);
        }

        const tokens = genTokens(user);

        ctx.cookies.set('x-access-token', tokens.access_token, {
            // expires: new Date(Date.now() + 5 * 60 * 1000), // время жизни токена (для access_token-а не выставляем)
            secure: ctx.secure,
            httpOnly: true,
            signed: true,
            origin: (new URL(ctx.href)).origin,
            sameSite: 'strict'
        });

        ctx.cookies.set('x-refresh-token', tokens.refresh_token, {
            expires: new Date(Date.now() + 86400 * 60 * 1000), // время жизни refresh токена
            secure: ctx.secure,
            httpOnly: true,
            signed: true,
            origin: (new URL(ctx.href)).origin,
            sameSite: 'strict'
        });

        // ctx.type = 'json';
        // ctx.body = tokens;
    })(ctx);

    ctx.redirect('/');
};

exports.signup = async ctx => {
    const user = new User(ctx.request.body);

    user.activation_token = uuidv1();

    await new Promise((resove, reject) => {
        nodemailer.sendMail({
            from: 'nodemailerservice2019@gmail.com',
            to: ctx.request.body.email,
            subject: 'Проверка',
            // text: 'Привет мир',
            html: `<a href="http://188.225.26.54:3000/api/v1/user-activation?activationToken=${user.activation_token}">ПОДТВЕРДИТЕ РЕГИСТРАЦИЮ</a>`
        }, (err, info) => {
            if (err) return reject(err);
            resove(info);
        });
    });

    await user.save();

    ctx.redirect('/signin');
};

exports.signout = async ctx => {
    const access_token  = ctx.headers['x-access-token']  || ctx.query.access_token  || ctx.cookies.get('x-access-token');
    const refresh_token = ctx.headers['x-refresh-token'] || ctx.query.refresh_token || ctx.cookies.get('x-refresh-token');

    const blackAccessToken  = new BlackToken({token: access_token});
    const blackRefreshToken = new BlackToken({token: refresh_token});

    await Promise.all([blackAccessToken.save(), blackRefreshToken.save()]);

    ctx.cookies.set('x-access-token', null);
    ctx.cookies.set('x-refresh-token', null);

    Socket.io.to(ctx.state.user._id).emit('SIGNOUT');
    Socket.io.emit('CLIENT_DISCONNECTED', ctx.state.user);

    ctx.redirect('/signin');
};

exports.userActivationGet = async ctx => {
    if (ctx.query && ctx.query.activationToken) {
        const user = await User.findOne({activation_token: String(ctx.query.activationToken)});

        if (!user) {
            return ctx.throw(500, 'Пользователь не найден');
        }

        if (user.active) {
            return ctx.throw(500, 'Пользователь уже активирован');
        }

        user.active = true;

        await user.save();

        ctx.redirect('/signin');
    } else {
        ctx.throw(400, 'токен не найден');
    }
};
