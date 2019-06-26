const Cookies    = require('cookies');
const jwt        = require('jsonwebtoken');
const User       = require('../../users/models/user');
const BlackToken = require('../models/blacktoken');

module.exports = function (io) {
    io.use(async (socket, next) => {
        const tokens = getTokensFromSocket(socket);
        const denied = await BlackToken.findOne({$or: [{token: String(tokens.access_token)}, {token: String(tokens.refresh_token)}]}).lean().exec();

        if (denied) {
            return next(new Error('Authentication error'));
        }

        try {
            const userId = jwt.verify(tokens.access_token, process.env.SECRET).user_id;

            const user = await User.findById(userId);

            if (!user || !user.active) {
                return next(new Error('Authentication error'));
            }

            socket.user = user;

        } catch (e) {
            return next(new Error('Authentication error'));
        }

        next()
    });
};

function getTokensFromSocket (socket) {
    const handshakeData = socket.request; // http(s) request
    const cookies       = new Cookies(handshakeData, {}, {keys: process.env.KEYS});
    const tokens        = {};

    tokens.access_token  = cookies.get('x-access-token');
    tokens.refresh_token = cookies.get('x-refresh-token');

    return tokens;
}
