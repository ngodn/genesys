var t = require('../test-lib/test.js');
var assert = require('assert');

var genex;

describe('Db', function() {

  this.timeout(t.timeout);

  it('should exist on the genex object', function(done) {
    genex = require('../index.js')({
      root: module,
      shortName: 'test',

      afterInit: function(callback) {
        assert(genex.db);
        // Verify a normal, boring connection to localhost without the db option worked
        return genex.docs.db.findOne().then(function(doc) {
          assert(doc);
          return done();
        }).catch(function(err) {
          console.error(err);
          assert(false);
        });
      }
    });
  });

  it('should be able to launch a second instance reusing the connection', function(done) {
    var apos2 = require('../index.js')({
      root: module,
      shortName: 'test2',
      modules: {
        'genesys-express': {
          port: 7777
        },
        'genesys-db': {
          db: genex.db,
          uri: 'mongodb://this-will-not-work-unless-db-successfully-overrides-it/fail'
        }
      },
      afterInit: function(callback) {
        return genex.docs.db.findOne().then(function(doc) {
          assert(doc);
          return t.destroy(apos2, function() {
            return t.destroy(genex, done);
          });
        }).catch(function(err) {
          console.error(err);
          assert(false);
        });
      }
    });
  });
});
