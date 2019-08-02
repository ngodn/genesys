var t = require('../test-lib/test.js');
var assert = require('assert');
var genex;

describe('Admin bar', function() {

  this.timeout(t.timeout);

  /// ///
  // EXISTENCE
  /// ///

  it('should allow a group reversing the current order', function(done) {
    genex = require('../index.js')({
      root: module,
      shortName: 'test',

      modules: {
        'genesys-express': {
          secret: 'xxx',
          port: 7900,
          csrf: false
        },
        'genesys-admin-bar': {
          addGroups: [
            {
              label: 'Media',
              items: [
                'genesys-images',
                'genesys-files'
              ]
            },
            {
              label: 'Content',
              items: [
                'genesys-login-logout',
                'genesys-files',
                'genesys-images'
              ]
            }
          ]
        }
      },
      afterInit: function(callback) {
        assert(genex.modules['genesys-admin-bar']);
        assert(genex.adminBar);
        assert(genex.adminBar.items.length === 8);
        assert(genex.adminBar.items[5].name === 'genesys-login-logout');
        assert(genex.adminBar.items[6].name === 'genesys-files');
        assert(genex.adminBar.items[7].name === 'genesys-images');
        // In tests this will be the name of the test file,
        // so override that in order to get genesys to
        // listen normally and not try to run a task. -Tom
        genex.argv._ = [];
        return callback(null);
      },
      afterListen: function(err) {
        assert(!err);
        return t.destroy(genex, done);
      }
    });
  });

  it('should allow a group obeying the current order', function(done) {
    genex = require('../index.js')({
      root: module,
      shortName: 'test',

      modules: {
        'genesys-express': {
          secret: 'xxx',
          port: 7900,
          csrf: false
        },
        'genesys-admin-bar': {
          addGroups: [
            {
              label: 'Media',
              items: [
                'genesys-images',
                'genesys-files'
              ]
            },
            {
              label: 'Content',
              items: [
                'genesys-files',
                'genesys-images',
                'genesys-login-logout'
              ]
            }
          ]
        }
      },
      afterInit: function(callback) {
        assert(genex.modules['genesys-admin-bar']);
        assert(genex.adminBar);
        assert(genex.adminBar.items.length === 8);
        assert(genex.adminBar.items[5].name === 'genesys-files');
        assert(genex.adminBar.items[6].name === 'genesys-images');
        assert(genex.adminBar.items[7].name === 'genesys-login-logout');
        // In tests this will be the name of the test file,
        // so override that in order to get genesys to
        // listen normally and not try to run a task. -Tom
        genex.argv._ = [];
        return callback(null);
      },
      afterListen: function(err) {
        assert(!err);
        return t.destroy(genex, done);
      }
    });
  });

});
