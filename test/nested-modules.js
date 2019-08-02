var t = require('../test-lib/test.js');
var assert = require('assert');
var genex;

describe('Nested Modules', function() {

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
      nestedModuleSubdirs: true,
      modules: {
        'apostrophe-test-module': {}
      },
      afterInit: function(callback) {
        // In tests this will be the name of the test file,
        // so override that in order to get apostrophe to
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

  it('should have both apostrophe-test-module and nested-module-1', function() {
    assert(genex.modules['apostrophe-test-module']);
    assert(genex.modules['apostrophe-test-module'].color === 'red');
    // Option from modules.js
    assert(genex.modules['nested-module-1'].options.color === 'blue');
    // Option from index.js
    assert(genex.modules['nested-module-1'].options.size === 'large');
  });

});
