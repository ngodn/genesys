
var t = require('../test-lib/test.js');
var assert = require('assert');
var genex;

describe('Oembed', function() {

  this.timeout(t.timeout);

  after(function(done) {
    return t.destroy(genex, done);
  });

  /// ///
  // EXISTENCE
  /// ///

  it('should initialize', function(done) {
    genex = require('../index.js')({
      root: module,
      shortName: 'test',

      modules: {
        'genesys-express': {
          secret: 'xxx',
          port: 7900,
          csrf: false
        }
      },
      afterInit: function(callback) {
        assert(genex.modules['genesys-oembed']);
        assert(genex.oembed);
        // In tests this will be the name of the test file,
        // so override that in order to get genesys to
        // listen normally and not try to run a task. -Tom
        genex.argv._ = [];
        return callback(null);
      },
      afterListen: function(err) {
        assert(!err);
        done();
      }
    });
  });

  // TODO: test this with mocks. Travis CI erratically times out
  // when we test against real YouTube, which produces false
  // failures that lead us to ignore CI results.
  //
  // var youtube = 'https://www.youtube.com/watch?v=us00G8oILCM&feature=related';

  // it('YouTube still has the video we like to use for testing', function(done) {
  //   return request(youtube, function(err, response, body) {
  //     assert(!err);
  //     assert(response.statusCode === 200);
  //     return done();
  //   });
  // });

  // it('Should deliver an oembed response for YouTube', function(done) {
  //   return request('http://localhost:7900/modules/genesys-oembed/query?' + qs.stringify(
  //   {
  //     url: youtube
  //   }), function(err, response, body) {
  //     assert(!err);
  //     assert(response.statusCode === 200);
  //     var data = JSON.parse(body);
  //     assert(data.type === 'video');
  //     return done();
  //   });
  // });

});
