var cheerio = require('cheerio');
var request = require('superagent');
var url = require('url');
var models = require('./models');
var mongoose = require('mongoose');
var _ = require('lodash');
var Q = require('q');

mongoose.connect('mongodb://localhost/football');

var games = function(teamId, seasonId, leagueId){
    var self = this;
    var d = Q.defer();

    var uri = 'http://football.org.il/Clubs/Pages/TeamGames.aspx?TEAM_ID='+ teamId +'&SEASON_ID=' + seasonId;

    request
        .get(uri)
        .end(function(res){
            var $ = cheerio.load(res.text);
            var team_games = $('#print_1').find('tr');
            team_games = team_games.slice(1, team_games.length);
            var counter = 0;
            var games = [];

            team_games.each(function(i, elem) {
                //var url = 'http://football.org.il:80/Clubs/_layouts/ProfileRedirect.aspx?Application=ClubsInstance&Entity=TEAM_LEAGUE_GAMES&ItemId=__bd81003300430043008300630033001';
                var url = $(this).find('td').last().find('a').first().attr('href');
                request
                    .get(url)
                    .end(function(res_){
                        var $$ = cheerio.load(res_.text);
                        /*
                         game_id: { type: Number, unique: true },
                         season_id: Number,
                         league_id: Number,
                         url: String,
                         */

                        var game_id = $$('form').first().attr('action').split('GAME_ID=')[1];
                        models.games.findOneAndUpdate(
                            {game_id: game_id, season_id: seasonId, league_id: leagueId },
                            {$set: {
                                game_id: game_id,
                                season_id: seasonId,
                                league_id: leagueId,
                                url: 'http://www.football.org.il/Leagues/Pages/LeagueGameDetails.aspx?GAME_ID=' + game_id
                            }}
                            , { upsert: true, new: true }).exec().then(
                                function (game) {
                                    counter++;
                                    console.log('upserted ' + game_id + ' ' + counter + ' out of ' + team_games.length);
                                    if(counter == team_games.length){
                                        console.log('DONE ' + teamId + ' ' + seasonId + ' ' + leagueId);
                                        models.teams.findOneAndUpdate(
                                            {team_id: teamId, season_id: seasonId, league_id: leagueId },
                                            {$set: {
                                                game_list_crawled: true
                                            }}
                                        ).exec().then(
                                            function(val){
                                                console.log('game_list_crawled updated')
                                                d.resolve({team_id: teamId, season_id: seasonId, league_id: leagueId });
                                            }
                                        );
                                    }
                                })

                    });
            });
        });
    return d.promise;
};

var Crawler_Manager = function(data){
    this.data = data;
    this.counter = 0;
    this.iterations = data.length;
}
Crawler_Manager.prototype.crawl = function(){
    var self = this;
    if(this.counter==this.iterations)   return null;
    var team = this.data[this.counter];
    console.log(team);
    games(team.team_id, team.season_id, team.league_id).then(
        (function (s){
            this.counter++;
            console.log('counter: ' + self.counter);
            this.crawl();
        }).bind(this)
    );

}

models.teams.find({game_list_crawled: {$ne: true}}, 'league_id season_id team_id', {limit: 1000000}, function(err, teams) {
    teams = _.shuffle(teams);
    console.log('num of undealt teams: ' + teams.length);
    console.log('starting...');
    var cm = new Crawler_Manager(teams);
    cm.crawl();
});
