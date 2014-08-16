var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Type = Schema.Types;

var schema = new Schema({
    team_id: Number,
    league_id: Number,
    season_id: Number,
    name: String,
    url: String
});

module.exports = schema;