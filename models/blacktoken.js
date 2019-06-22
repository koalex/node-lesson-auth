const mongoose = require('server/lib/mongoose');

const blackTokenSchema = new mongoose.Schema({
    token: { type: String, minlength: 1 },
}, {
    versionKey: false,
    id: false
});


const BlackToken = mongoose.model('BlackToken', blackTokenSchema);

module.exports = BlackToken;