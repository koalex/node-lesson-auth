const router = require('./router');
const Socket = require('server/lib/socket');
const socketAuth = require('./middlewares/socketAuth');

module.exports = function (app) {
    socketAuth(Socket.io);

    router.forEach(router => {
        app.use(router.routes());
    });
};