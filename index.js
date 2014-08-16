var cheerio = require('cheerio');
var request = require('superagent');
var url = require('url');
var models = require('./models');
var mongoose = require('mongoose');
var _ = require('lodash');

mongoose.connect('mongodb://localhost/football');

var teams = function(leagueId, seasonId){
    var uri = 'http://football.org.il/Leagues/Pages/LeagueDetails.aspx?LEAGUE_ID='+ leagueId +'&SEASON_ID=' + seasonId;

    request
        .get(uri)
        .end(function(res){
            var $ = cheerio.load(res.text);

            var league = $('#LeaguesTable .BDCTable table td a');

            var teams = [];

            league.each(function(){
                teams.push({
                    league_id: leagueId,
                    season_id: seasonId,
                    team_id: Number(url.parse($(this).attr('href'), true).query.TEAM_ID),
                    name: $(this).text(),
                    url: $(this).attr('href')
                })
            });

            models.teams.create(teams).then(function(err){
                console.log(arguments);
            })
        });
};

var games = function(teamId, seasonId){
    var uri = 'http://football.org.il/Clubs/Pages/TeamGames.aspx?TEAM_ID='+ teamId +'&SEASON_ID=' + seasonId;

    request
        .get(uri)
        .end(function(res){
            var $ = cheerio.load(res.text);

            var team_games = $('table.BDCContainerBorder tr');

            var games = [];

            team_games.each(function(){
                var href = $(this).find('td').eq(10).find('a').attr('href');
                games.push(href);
            });

            games = _.compact(games);

            _.forEach(games, function(game){
                extract_game(game, function(err){
                    console.log(arguments);
                })
            });
        });
};

var extract_game = function(uri, cb){
    cb || (cb = function(){});

    request
        .get(uri)
        .end(function(res){
            var game_id = url.parse(res.redirects[0], true).query.GAME_ID;

            var $ = cheerio.load(res.text);

            var game = {
                game_id: Number(game_id),
                html: $.html(),
                url: res.redirects[0]
            };

            models.games.create(game, cb);
        })
};

//extract_game('http://football.org.il:80/Clubs/_layouts/ProfileRedirect.aspx?Application=ClubsInstance&Entity=TEAM_LEAGUE_GAMES&ItemId=__bd8100130043000300630003005300');
//games(5135, 9);