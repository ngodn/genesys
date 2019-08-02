var t = require('../test-lib/test.js');
var assert = require('assert');

describe('Launder', function() {

  this.timeout(t.timeout);

  after(function(done) {
    return t.destroy(genex, done);
  });

  var genex;

  it('should exist on the genex object', function(done) {
    genex = require('../index.js')({
      root: module,
      shortName: 'test',
      afterInit: function(callback) {
        assert(genex.launder);
        return done();
      }
    });
  });

  // Launder has plenty of unit tests of its own. All we're
  // doing here is a sanity test that we're really
  // hooked up to launder.

  it('should launder a number to a string', function() {
    assert(genex.launder.string(5) === '5');
  });
});
