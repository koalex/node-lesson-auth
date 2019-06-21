const jwt = require('jsonwebtoken');

module.exports = function (user) {
    if (!user) throw new Error('User required.');

    const expiresIn = 5 * 60; // 5мин

    const access_token = jwt.sign({ user_id: user._id }, process.env.SECRET, {
        // jwtid: ctx.req.headers['x-finger-print'], // какой-то уникальный ID для токена (необязательно)
        // issuer: 'http://jwtgenerate.com', // автор токена (необязательно)
        // audience: 'https://drom.ru', // для кого создаётся токен (необязательно)
        // algorithm: 'HS512',
        expiresIn
    });

    const refresh_token = jwt.sign({ user_id: user._id }, process.env.SECRET, {
        // issuer: 'http://localhost',
        // algorithm: 'HS512',
        expiresIn: 86400 * 60 // 60 дней
    });

    return {
        access_token,
        refresh_token,
        expires_in: new Date(Date.now() + expiresIn * 1000)
    }
};
