var t = require('../test-lib/test.js');
var assert = require('assert');
var async = require('async');
var genex;

describe('Areas', function() {

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
        },
        'monkeys': {
          extend: 'genesys-pieces',
          name: 'monkey'
        },
        'monkeys-widgets': {
          extend: 'genesys-pieces-widgets'
        }
      },
      afterInit: function(callback) {
        assert(genex.modules['genesys-areas']);
        assert(genex.areas);
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

  it('returns the rich text of an area via the richText method', function() {
    assert(genex.areas.richText({
      type: 'area',
      items: [
        {
          type: 'genesys-rich-text',
          content: '<h2>So cool</h2>'
        },
        {
          type: 'something-else',
          content: '<h3>Do not return me</h3>'
        },
        {
          type: 'genesys-rich-text',
          content: '<h2>Something else cool</h2>'
        }
      ]
    }) === '<h2>So cool</h2>\n<h2>Something else cool</h2>');
    assert(genex.areas.richText({
      type: 'area',
      items: [
        {
          type: 'genesys-rich-text',
          content: '<h2>So cool</h2>'
        },
        {
          type: 'something-else',
          content: '<h3>Do not return me</h3>'
        },
        {
          type: 'genesys-rich-text',
          content: '<h2>Something else cool</h2>'
        }
      ]
    }, { delimiter: '' }) === '<h2>So cool</h2><h2>Something else cool</h2>');
    assert(genex.areas.richText({
      type: 'area',
      items: [
        {
          type: 'genesys-rich-text',
          content: '<h2>So cool</h2>'
        },
        {
          type: 'something-else',
          content: '<h3>Do not return me</h3>'
        },
        {
          type: 'genesys-rich-text',
          content: '<h2>Something else cool</h2>'
        }
      ]
    }, { wrapper: 'div' }) === '<div><h2>So cool</h2></div><div><h2>Something else cool</h2></div>');
  });

  it('returns the plaintext of an area via the plaintext method', function() {
    assert.strictEqual(genex.areas.plaintext({
      type: 'area',
      items: [
        {
          type: 'genesys-rich-text',
          content: '<h2>So cool</h2>'
        },
        {
          type: 'something-else',
          content: '<h3>Do not return me</h3>'
        },
        {
          type: 'genesys-rich-text',
          content: '<h2>Something else cool</h2>'
        }
      ]
    }), 'So cool\nSomething else cool');
    assert.strictEqual(genex.areas.plaintext({
      type: 'area',
      items: [
        {
          type: 'genesys-rich-text',
          content: '<h2>So cool</h2>'
        },
        {
          type: 'something-else',
          content: '<h3>Do not return me</h3>'
        },
        {
          type: 'genesys-rich-text',
          content: '<h2>Something else cool</h2>'
        }
      ]
    }, { limit: 15 }), 'So cool...');
  });

  it('area considered empty when it should be', function() {
    var doc = {
      type: 'test',
      _id: 'test',
      body: {
        type: 'area',
        items: []
      },
      emptyText: {
        type: 'area',
        items: [
          {
            _id: 'test2',
            type: 'genesys-rich-text',
            content: ''
          }
        ]
      },
      insignificantText: {
        type: 'area',
        items: [
          {
            _id: 'test2',
            type: 'genesys-rich-text',
            content: '<h4> </h4>'
          }
        ]
      },
      insignificantPieces: {
        type: 'area',
        items: [
          {
            _id: 'test3',
            type: 'monkeys',
            _pieces: []
          }
        ]
      }
    };
    assert(genex.areas.isEmpty({ area: doc.body }));
    assert(genex.areas.isEmpty(doc, 'body'));
    assert(genex.areas.isEmpty(doc, 'nonexistent'));
    assert(genex.areas.isEmpty(doc, 'emptyText'));
    assert(genex.areas.isEmpty(doc, 'insignificantText'));
    assert(genex.areas.isEmpty(doc, 'insignificantPieces'));
  });

  it('area not considered empty when it should not be', function() {
    var doc = {
      type: 'test',
      _id: 'test',
      body: {
        type: 'area',
        items: [
          {
            _id: 'test2',
            type: 'genesys-video',
            url: 'http://somewhere.com'
          }
        ]
      },
      emptyText: {
        type: 'area',
        items: [
          {
            _id: 'test2',
            type: 'genesys-rich-text',
            content: ''
          }
        ]
      },
      fullText: {
        type: 'area',
        items: [
          {
            _id: 'test2',
            type: 'genesys-rich-text',
            content: '<h4>Some text</h4>'
          }
        ]
      },
      significantPieces: {
        type: 'area',
        items: [
          {
            _id: 'test3',
            type: 'monkeys',
            _pieces: [
              {
                type: 'monkey'
              }
            ]
          }
        ]
      }
    };
    assert(!genex.areas.isEmpty({ area: doc.body }));
    assert(!genex.areas.isEmpty(doc, 'body'));
    assert(!genex.areas.isEmpty(doc, 'fullText'));
    assert(!genex.areas.isEmpty({ area: doc.fullText }));
    assert(!genex.areas.isEmpty(doc, 'significantPieces'));
  });

  it('both isEmpty and legacy empty methods work on schema fields', function() {
    assert(
      !genex.schemas.fieldTypes.boolean.isEmpty({
        type: 'boolean',
        name: 'test'
      }, true)
    );
    assert(
      genex.schemas.fieldTypes.boolean.isEmpty({
        type: 'boolean',
        name: 'test'
      }, false)
    );
    assert(
      !genex.schemas.fieldTypes.boolean.empty({
        type: 'boolean',
        name: 'test'
      }, true)
    );
    assert(
      genex.schemas.fieldTypes.boolean.empty({
        type: 'boolean',
        name: 'test'
      }, false)
    );
  });

  it('when simultaneous updates are attempted to different areas, nothing gets lost', function(done) {
    var home;
    var req = genex.tasks.getReq();
    async.series([
      getHome,
      simultaneousUpdates,
      verifyUpdates
    ], function(err) {
      assert(!err);
      done();
    });
    function getHome(callback) {
      return genex.pages.find(req, { slug: '/' }).toObject(function(err, _home) {
        assert(!err);
        assert(_home);
        home = _home;
        return callback(null);
      });
    }
    function simultaneousUpdates(callback) {
      var areas = [ 'one', 'two', 'three', 'four' ];
      return async.each(areas, function(area, callback) {
        return genex.areas.lockSanitizeAndSaveArea(req, {
          docId: home._id,
          dotPath: area,
          items: [
            {
              type: 'genesys-rich-text',
              content: area
            }
          ]
        }, callback);
      }, callback);
    }
    function verifyUpdates(callback) {
      return genex.pages.find(req, { slug: '/' }).toObject(function(err, _home) {
        assert(!err);
        assert(home);
        home = _home;
        var areas = [ 'one', 'two', 'three', 'four' ];
        areas.forEach(function(area) {
          assert(home[area]);
          assert(home[area].items[0].content === area);
        });
        return callback(null);
      });
    }
  });
});
