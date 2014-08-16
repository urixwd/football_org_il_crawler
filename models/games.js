/**
 * Created by Ronin on 16/08/2014.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Type = Schema.Types;

var schema = new Schema({
    game_id: { type: Number, unique: true },
    html: String,
    url: String
});

module.exports = schema;