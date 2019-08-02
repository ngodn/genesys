var t = require('../test-lib/test.js');
var assert = require('assert');
var _ = require('@sailshq/lodash');

describe('Apostrophe', function() {

  this.timeout(t.timeout);

  it('should exist', function(done) {
    var genex = require('../index.js');
    assert(genex);
    return t.destroy(genex, done);
  });

  // BOOTSTRAP FUNCTIONS ------------------------------------------- //

  it('should merge the options and local.js correctly', function(done) {
    var genex = require('../index.js')({
      root: module,
      shortName: 'test',
      overrideTest: 'test', // overriden by data/local.js

      __testDefaults: {
        modules: {}
      },
      afterInit: function(callback) {
        assert(genex.options.overrideTest === 'foo');
        return t.destroy(genex, done);
      }
    });
  });

  it('should accept a `__localPath` option and invoke local.js as a function if it is provided as one', function(done) {
    var genex = require('../index.js')({
      root: module,
      shortName: 'test',
      overrideTest: 'test', // overriden by data/local_fn.js

      __localPath: '/data/local_fn.js',
      __testDefaults: {
        modules: {}
      },
      afterInit: function(callback) {
        assert(genex.options.overrideTest === 'foo');
        return t.destroy(genex, done);
      }
    });
  });

  it('should invoke local.js as a function with the genex and config object', function(done) {
    var genex = require('../index.js')({
      root: module,
      shortName: 'test',
      overrideTest: 'test', // concated in local_fn_b.js

      __localPath: '/data/local_fn_b.js',
      __testDefaults: {
        modules: {}
      },
      afterInit: function(callback) {
        assert(genex.options.overrideTest === 'test-foo');
        return t.destroy(genex, done);
      }
    });
  });

  it('should accept a `__testDeafults` option and load the test modules correctly', function(done) {
    var genex = require('../index.js')({
      root: module,
      shortName: 'test',

      __testDefaults: {
        modules: {
          'genesys-test-module': {}
        }
      },
      afterInit: function(callback) {
        assert(genex.modules['genesys-test-module']);
        return t.destroy(genex, done);
      }
    });
  });

  it('should create the modules and invoke the construct function correctly', function(done) {
    var genex = require('../index.js')({
      root: module,
      shortName: 'test',
      __testDefaults: {
        modules: {
          'genesys-test-module': {}
        }
      },
      afterInit: function(callback) {
        assert(genex.test && genex.test.color === 'red');
        return t.destroy(genex, done);
      }
    });
  });

  it('should load the default modules and implicitly subclass the base module correctly', function(done) {
    var defaultModules = require('../defaults.js').modules;

    var genex = require('../index.js')({
      root: module,
      shortName: 'test',

      afterInit: function(callback) {
        // color = blue is inherited from our implicit subclass of the base module
        assert(genex.assets && genex.assets.color === 'blue');
        // make sure that our modules match what is specifed in defaults.js
        assert(_.difference(_.keys(defaultModules), _.keys(genex.modules)).length === 0);
        return t.destroy(genex, done);
      }
    });
  });
});
