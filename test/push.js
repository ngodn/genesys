var t = require('../test-lib/test.js');
var assert = require('assert');

var genex;

describe('Templates', function() {

  this.timeout(t.timeout);

  after(function(done) {
    return t.destroy(genex, done);
  });

  it('should have a push property', function(done) {
    genex = require('../index.js')({
      root: module,
      shortName: 'test',
      modules: {
        'genesys-express': {
          secret: 'xxx',
          port: 7900
        }
      },
      afterInit: function(callback) {
        assert(genex.push);
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

  it('should be able to push a browser call and get back an HTML-safe JSON string', function() {
    var req = genex.tasks.getAnonReq();
    req.browserCall('test(?)', { data: '<script>alert(\'ruh roh\');</script>' });
    var calls = req.getBrowserCalls();
    assert(calls.indexOf('<\\/script>') !== -1);
    assert(calls.indexOf('</script>') === -1);
  });
});
